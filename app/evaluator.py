# app/evaluator.py

import json
import asyncio
import traceback
from functools import partial
from typing import List, Optional
from app.schemas import CompanyUnderstanding, GeneratedPrompt, ModelResponse, EvaluationMetric, VisibilityReport, SearchSource
from app.config import GEMINI_API_KEY, GEMINI_MODEL_NAME, CEREBRAS_API_KEY, CEREBRAS_MODEL_NAME, OPENROUTER_MODEL_NAME
from app.ai_client import generate_ai_response, gemini_client, grounding_tool, cerebras_client

async def evaluate_single_prompt(
    company: CompanyUnderstanding, 
    gen_prompt: GeneratedPrompt, 
    use_google_search: bool = False, 
    provider: str = "gemini"
) -> ModelResponse:
    """
    Evaluates a single prompt asynchronously.
    """
    print(f"[INFO] Testing prompt: {gen_prompt.prompt_text} (Google Search Grounding: {use_google_search})")
    
    response_text = ""
    sources = []
    loop = asyncio.get_running_loop()

    # 1. Get raw AI response
    try:
        # We now use the unified ai_client for EVERY provider
        # Gemini will automatically include search grounding if tools are configured in ai_client
        raw_ai_result = await loop.run_in_executor(
            None, 
            partial(generate_ai_response, gen_prompt.prompt_text, provider=provider, return_full_response=True)
        )

        # Handle different return types (Gemini returns a response object, others return string)
        if hasattr(raw_ai_result, 'candidates') and raw_ai_result.candidates:
            # --- GEMINI Grounding Logic ---
            response_text = raw_ai_result.text
            
            # 1. Add the "Search Result Reference" link (Original Google AI Search logic)
            sources.append(SearchSource(
                title="Live Google Search Grounding",
                url="https://www.google.com/search?q=" + gen_prompt.prompt_text.replace(" ", "+")
            ))

            # 2. Extract official grounding sources from Gemini metadata
            if raw_ai_result.candidates[0].grounding_metadata:
                metadata = raw_ai_result.candidates[0].grounding_metadata
                if metadata.grounding_chunks:
                    for chunk in metadata.grounding_chunks:
                        if chunk.web:
                            sources.append(SearchSource(
                                title=chunk.web.title or "Verified Web Source",
                                url=chunk.web.uri
                            ))
        else:
            # --- CLAUDE / Other Models Logic ---
            response_text = str(raw_ai_result)

        # 3. GLOBAL Extraction: Regex scan for any URLs in the text (works for Claude/Cerebras too)
        import re
        url_pattern = r'https?://(?:[-\w.]|(?:%[\da-fA-F]{2}))+'
        found_urls = re.findall(url_pattern, response_text)
        unique_urls = list(set(found_urls))
        
        # Add regex found URLs if they aren't already in sources
        existing_urls = [s.url for s in sources]
        for url in unique_urls:
            clean_url = url.rstrip(').,;!?')
            if clean_url and clean_url not in existing_urls:
                # Catch specific reference labels if possible, otherwise generic
                title = f"Reference found in response"
                if "anthropic" in provider.lower() or "claude" in provider.lower():
                    title = f"Claude Reference"
                elif "cerebras" in provider.lower():
                    title = f"Cerebras Source"
                
                sources.append(SearchSource(title=title, url=clean_url))

        print(f"[SUCCESS] Generated response for '{gen_prompt.prompt_text[:20]}...' with {len(sources)} reference(s)")
    except Exception as e:
        error_msg = str(e)
        print(f"[ERROR] Content generation failed: {error_msg}")
        
        if "google_search" in error_msg.lower() or "grounding" in error_msg.lower():
            response_text = "Google Search grounding is not available with your API key. Please use Gemini Standard mode or upgrade your API access."
        elif "quota" in error_msg.lower():
            response_text = "API quota exceeded. Please try again later or check your API limits."
        elif "api key" in error_msg.lower():
            response_text = "API key error. Please verify your GEMINI_API_KEY in the .env file."
        else:
            response_text = f"Analysis error: {error_msg}"
        
        # IMPORTANT: Even on error, try to extract any URLs from the error message or partial response
        # This ensures we store ALL sources regardless of success/failure
        import re
        url_pattern = r'https?://(?:[-\w.]|(?:%[\da-fA-F]{2}))+'
        found_urls = re.findall(url_pattern, response_text + " " + error_msg)
        unique_urls = list(set(found_urls))
        
        for url in unique_urls:
            clean_url = url.rstrip(').,;!?')
            if clean_url and clean_url not in [s.url for s in sources]:  # Avoid duplicates
                sources.append(SearchSource(
                    title=f"Reference from Error ({provider.capitalize()})",
                    url=clean_url
                ))

    # 2. Use AI to EVALUATE the response
    eval_provider = "cerebras" if cerebras_client else "gemini"
    
    eval_prompt = f"""
You are an AI Search Visibility Auditor focusing on the {company.region} market. Analyze the "Model Response" provided below to see how "{company.company_name}" is positioned within this specific regional context.

Model Response:
\"\"\"
{response_text}
\"\"\"

Audit requirements for "{company.company_name}":
1. brand_present: Is the company mentioned? (true/false)
2. url_cited: Is the company's website URL mentioned or linked? (true/false).
3. recommendation_rank: If mentioned, what is its position in the list (1, 2, 3...)? If not mentioned, null.
4. accuracy_score: How accurately did the model describe the company's offerings? (0.0 to 1.0)
5. sentiment: What is the tone regarding this company? (Positive, Neutral, Negative)
6. competitor_ranks: List of OTHER companies mentioned. For each, provide:
   - name: String
   - rank: Integer (position in list) or null
   - url_cited: bool (if their URL/link is present)

Return valid JSON:
{{
  "brand_present": bool,
  "url_cited": bool,
  "recommendation_rank": int or null,
  "accuracy_score": float,
  "sentiment": "Positive|Neutral|Negative",
  "competitor_ranks": [
    {{"name": "string", "rank": int, "url_cited": bool}}
  ]
}}
"""
    try:
        # Run blocking evaluation in thread
        eval_text = await loop.run_in_executor(
            None,
            partial(generate_ai_response, eval_prompt, provider=eval_provider, response_mime_type="application/json")
        )
        eval_data = json.loads(eval_text)
        
        if isinstance(eval_data, list) and len(eval_data) > 0:
            eval_data = eval_data[0]
            
        if isinstance(eval_data, dict):
            if "competitor_ranks" in eval_data:
                eval_data["competitors_mentioned"] = [c["name"] for c in eval_data["competitor_ranks"] if isinstance(c, dict) and "name" in c]
            else:
                eval_data["competitors_mentioned"] = []
            
            metric = EvaluationMetric(**eval_data)
        else:
            raise ValueError(f"Expected dict but got {type(eval_data)}")
            
    except Exception as e:
        print(f"[ERROR] Evaluation parsing failed: {e}")
        
        # Safe logic fallback
        brand_name = (company.company_name or "").lower()
        resp_lower = (response_text or "").lower()
        brand_present = brand_name in resp_lower if brand_name else False
        
        metric = EvaluationMetric(
            brand_present=brand_present,
            url_cited=False,
            recommendation_rank=None,
            accuracy_score=0.0,
            sentiment="Neutral",
            competitors_mentioned=[],
            competitor_ranks=[]
        )

    display_model_name = "Google AI Search" if use_google_search else provider
    if provider == "gemini": display_model_name = GEMINI_MODEL_NAME
    elif provider == "cerebras": display_model_name = f"Cerebras ({CEREBRAS_MODEL_NAME})"
    elif provider == "openrouter": display_model_name = f"GPT-OSS ({OPENROUTER_MODEL_NAME})"

    # Log sources captured (for debugging and confirmation)
    print(f"[INFO] Captured {len(sources)} source(s) for {display_model_name} - Storing ALL regardless of success/failure")

    return ModelResponse(
        model_name=display_model_name,
        response_text=response_text,
        evaluation=metric,
        sources=sources  # ALWAYS return sources - both successful and failed responses
    )

async def evaluate_visibility(company: CompanyUnderstanding, prompts: List[GeneratedPrompt], use_google_search: bool = False, provider: str = "gemini") -> VisibilityReport:
    """
    Executes all prompts in PARALLEL and evaluates how the company appears in AI responses.
    """
    # Create tasks for all prompts
    # We use a Semaphore to limit concurrency to 5 to avoid Rate Limits (HTTP 429)
    # causing accuracy drops described in the conversation.
    sem = asyncio.Semaphore(5) 

    async def sem_task(p):
        async with sem:
            return await evaluate_single_prompt(company, p, use_google_search, provider)

    tasks = [sem_task(p) for p in prompts]
    
    # Run all tasks concurrently
    print(f"[INFO] Starting parallel evaluation for {len(tasks)} prompts with provider={provider} (limit=5 concurrent)...")
    model_results = await asyncio.gather(*tasks)
    print(f"[INFO] Completed parallel evaluation.")

    # 3. Calculate Overall Visibility Score and Competitor Insights
    mentions = sum(1 for r in model_results if r.evaluation.brand_present)
    avg_accuracy = sum(r.evaluation.accuracy_score for r in model_results) / len(model_results) if model_results else 0
    
    overall_score = (mentions / len(prompts) * 70) + (avg_accuracy * 30) if prompts else 0

    # Aggregate competitor info
    comp_ranks = {}
    for r in model_results:
        for c in r.evaluation.competitor_ranks:
            if c.name not in comp_ranks:
                comp_ranks[c.name] = []
            if c.rank is not None:
                comp_ranks[c.name].append(c.rank)
    
    competitor_summary = []
    for name, ranks in comp_ranks.items():
        avg_rank = sum(ranks) / len(ranks) if ranks else "N/A"
        competitor_summary.append(f"{name}: Appearances={len(ranks)}, Avg Rank={avg_rank}")

    # 4. Generate AI-driven Summary & Tips
    key_findings = [
        f"Brand mention rate: {mentions}/{len(prompts)}",
        f"Average information accuracy: {round(avg_accuracy * 100, 1)}%",
        f"Total competitors identified: {len(comp_ranks)}"
    ]
    optimizer_tips = []

    try:
        report_provider = "cerebras" if cerebras_client else "gemini"
        
        report_prompt = f"""
You are a Senior GEO (Generative Engine Optimization) Strategist focusing on the {company.region} market. Analyze these results for "{company.company_name}".

Company Context: {company.company_summary}
Performance: {mentions}/{len(prompts)} mentions, {round(avg_accuracy*100)}% accuracy.
Focus Region: {company.region}
Competitors: {", ".join(list(comp_ranks.keys())[:5])}

Instructions:
1. Provide 3-4 specific 'key_findings' about their current AI visibility.
2. Provide 3-4 'optimizer_tips' that are EXTREMELY SPECIFIC to this company's industry and offerings. 
3. Return valid JSON.

Schema:
{{
  "key_findings": ["insight 1", "insight 2"],
  "optimizer_tips": ["actionable tip 1", "actionable tip 2"]
}}
"""
        loop = asyncio.get_running_loop()
        report_text = await loop.run_in_executor(
            None, 
            partial(generate_ai_response, report_prompt, provider=report_provider, response_mime_type="application/json")
        )
        report_data = json.loads(report_text)
        if isinstance(report_data, dict):
            if report_data.get("key_findings"):
                key_findings = report_data["key_findings"]
            if report_data.get("optimizer_tips"):
                optimizer_tips = report_data["optimizer_tips"]
    except Exception as e:
        print(f"[WARNING] AI summary generation failed: {e}")

    return VisibilityReport(
        company_name=company.company_name,
        overall_score=round(overall_score, 2),
        queries_tested=[p.prompt_text for p in prompts],
        model_results=model_results,
        key_findings=key_findings,
        optimizer_tips=optimizer_tips,
        competitor_summary=competitor_summary
    )
