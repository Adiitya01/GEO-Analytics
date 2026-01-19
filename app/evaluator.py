# app/evaluator.py

import json
import traceback
from google import genai
from google.genai import types
from typing import List
from app.schemas import CompanyUnderstanding, GeneratedPrompt, ModelResponse, EvaluationMetric, VisibilityReport, SearchSource
from app.config import GEMINI_API_KEY, GEMINI_MODEL_NAME

client = None
if GEMINI_API_KEY:
    client = genai.Client(api_key=GEMINI_API_KEY)

def evaluate_visibility(company: CompanyUnderstanding, prompts: List[GeneratedPrompt], use_google_search: bool = False) -> VisibilityReport:
    """
    Executes prompts and evaluates how the company appears in AI responses.
    """
    model_results = []
    
    # Configure config for google search if requested
    generation_config = {}
    if use_google_search:
        try:
            # Use the correct google_search tool format
            generation_config['tools'] = [{"google_search": {}}]
            print("[INFO] Using Google Search grounding (google_search)")
        except Exception as e:
            print(f"[WARNING] Google Search grounding setup failed: {e}")
            print("[INFO] Falling back to standard model without grounding")
            use_google_search = False

    for gen_prompt in prompts:
        print(f"[INFO] Testing prompt: {gen_prompt.prompt_text} (Google Search Grounding: {use_google_search})")
        
        response_text = ""
        sources = [] # Initialize here to ensure it always exists
        # 1. Get raw AI response
        try:
            if not client:
                 raise ValueError("GEMINI_API_KEY not configured")

            ai_response = client.models.generate_content(
                model=GEMINI_MODEL_NAME,
                contents=gen_prompt.prompt_text,
                config=generation_config if use_google_search else None
            )
            response_text = ai_response.text
            
            # Robust Source Extraction
            if use_google_search:
                # Add a "Primary Search Link" as a baseline reference
                sources.append(SearchSource(
                    title="Live Google Search Result",
                    url="https://www.google.com/search?q=" + gen_prompt.prompt_text.replace(" ", "+")
                ))

                if hasattr(ai_response, 'grounding_metadata'):
                    metadata = ai_response.grounding_metadata
                    # Web chunks (Specific Cited links)
                    if hasattr(metadata, 'grounding_chunks'):
                        for chunk in metadata.grounding_chunks:
                            if hasattr(chunk, 'web') and chunk.web:
                                # Avoid duplicating the baseline search link
                                sources.append(SearchSource(
                                    title=chunk.web.title or "Deep Research Link",
                                    url=chunk.web.uri
                                ))

            print(f"[SUCCESS] Generated response ({len(response_text)} chars, {len(sources)} sources found)")
        except Exception as e:
            error_msg = str(e)
            print(f"[ERROR] Content generation failed: {error_msg}")
            traceback.print_exc()
            
            # Provide helpful error message
            if "google_search" in error_msg.lower() or "grounding" in error_msg.lower():
                response_text = "Google Search grounding is not available with your API key. Please use Gemini Standard mode or upgrade your API access."
            elif "quota" in error_msg.lower():
                response_text = "API quota exceeded. Please try again later or check your API limits."
            elif "api key" in error_msg.lower():
                response_text = "API key error. Please verify your GEMINI_API_KEY in the .env file."
            else:
                response_text = f"Analysis error: {error_msg}"

        # 2. Use AI to EVALUATE the response
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
            # We use the base model for evaluation to keep it fast and separate from search results
            eval_ai = client.models.generate_content(
                model=GEMINI_MODEL_NAME,
                contents=eval_prompt,
                config={"response_mime_type": "application/json"}
            )
            eval_data = json.loads(eval_ai.text)
            
            # Handle list response if model returns it wrapped
            if isinstance(eval_data, list) and len(eval_data) > 0:
                eval_data = eval_data[0]
                
            if isinstance(eval_data, dict):
                # Ensure competitors_mentioned is present for backward compatibility or direct access
                if "competitor_ranks" in eval_data:
                    eval_data["competitors_mentioned"] = [c["name"] for c in eval_data["competitor_ranks"] if isinstance(c, dict) and "name" in c]
                else:
                    eval_data["competitors_mentioned"] = []
                
                metric = EvaluationMetric(**eval_data)
            else:
                raise ValueError(f"Expected dict but got {type(eval_data)}")
                
        except Exception as e:
            print(f"[ERROR] Evaluation parsing failed: {e}")
            if 'eval_ai' in locals():
                print(f"[DEBUG] Raw eval response: {eval_ai.text}")
            
            # Safe logic for brand_present check
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

        model_results.append(ModelResponse(
            model_name="Google AI Search" if use_google_search else GEMINI_MODEL_NAME,
            response_text=response_text, # Return FULL text now
            evaluation=metric,
            sources=sources if use_google_search else []
        ))

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
    optimizer_tips = [
        "Optimize technical blog posts for long-tail search queries.",
        "Ensure company name and product names are consistent across external profiles.",
        "Increase presence on industry directory sites to improve LLM training data visibility."
    ]

    try:
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
        report_ai = client.models.generate_content(
            model=GEMINI_MODEL_NAME,
            contents=report_prompt,
            config={"response_mime_type": "application/json"}
        )
        report_data = json.loads(report_ai.text)
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
