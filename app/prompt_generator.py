# app/prompt_generator.py

import json
from typing import List
from app.schemas import CompanyUnderstanding, GeneratedPrompt
from app.config import GEMINI_API_KEY, GEMINI_MODEL_NAME, CEREBRAS_API_KEY
from app.ai_client import generate_ai_response, cerebras_client

def generate_user_prompts(company: CompanyUnderstanding) -> List[GeneratedPrompt]:
    """
    Generates 20 realistic user queries to test AI search visibility.
    """
    prompt = f"""
You are an expert in Generative Engine Optimization (GEO). Your task is to generate 20 realistic and highly diverse user queries that someone might ask an AI (like ChatGPT or Gemini) to find services or companies in the industry: {company.industry}.
The user is located in or interested in the region: {company.region}. Ensure queries reflect local terminology and search intent for this specific market.

Company Context:
- Name: {company.company_name}
- Offerings: {", ".join(company.offerings)}
- Problems Solved: {", ".join(company.core_problems_solved)}
- Focus Region: {company.region}

Generate a total of 20 queries distributed across these categories:
1. Unbiased Discovery: (Broad searches for top companies/tools in the sector)
2. Specific Solution-Seeking: (Focus on solving specific technical or business pain points)
3. Competitive Comparison: (Comparing top players or asking for alternatives)
4. Intent-Based / Transactional: (Ready to hire or looking for a specific project partner)
5. Brand Awareness & Verification: (Direct questions about {company.company_name})

Requirements:
- Ensure the queries sound like real humans asking an AI.
- Mix high-level and granular queries.
- Return exactly 20 queries.
- Return a JSON list of objects with "prompt_text" and "intent_category". 
"""

    try:
        # Use Cerebras for prompt generation if available
        provider = "cerebras" if cerebras_client else "gemini"
        res_text = generate_ai_response(prompt, provider=provider, response_mime_type="application/json")
        if res_text.startswith("```"):
            import re
            # Try to extract content between first [ and last ] or first { and last }
            json_match = re.search(r"(\[.*\]|{.*})", res_text, re.DOTALL)
            if json_match:
                res_text = json_match.group(1)
            else:
                res_text = res_text.replace("```json", "", 1).replace("```", "", 1).strip()
        
        data = json.loads(res_text)
        
        # Robust handling for list formats
        if isinstance(data, dict):
            for key in ["queries", "prompts", "results", "data", "test_prompts"]:
                if key in data and isinstance(data[key], list):
                    data = data[key]
                    break
        
        if not isinstance(data, list):
            # If still a dict but didn't find a list key, try to use values if they are lists
            if isinstance(data, dict):
                # Another check: maybe it's a dict where keys are the categories?
                # Or maybe it's just a dict that WE can convert to Model objects
                if "prompt_text" in data:
                    data = [data]
                else:
                    for val in data.values():
                        if isinstance(val, list) and len(val) > 0 and isinstance(val[0], dict) and "prompt_text" in val[0]:
                            data = val
                            break
            
            if not isinstance(data, list):
                print(f"[DEBUG] Raw AI response for prompts: {res_text[:500]}...")
                raise ValueError(f"AI did not return a list of prompts. Got type: {type(data)}")

        return [GeneratedPrompt(**item) for item in data[:20] if isinstance(item, dict) and "prompt_text" in item]
    
    except Exception as e:
        print(f"[ERROR] Prompt generation failed: {e}")
        import traceback
        traceback.print_exc()
        # Return a smaller fallback list if fails
        fallback_queries = [
            f"Top companies in {company.industry}",
            f"Who is the leader in {company.offerings[0] if company.offerings else company.industry}?",
            f"Best {company.industry} solutions for businesses",
            f"Compare {company.company_name} with competitors",
            f"Is {company.company_name} good for {company.core_problems_solved[0] if company.core_problems_solved else 'customers'}?",
            f"Affordable {company.industry} services in {company.region}",
            f"Innovative startups in {company.industry}",
            f"How to choose a {company.industry} partner?",
            f"Reviews of {company.company_name}",
            f"What does {company.company_name} offer?"
        ]
        return [GeneratedPrompt(prompt_text=q, intent_category="Fallback") for q in fallback_queries[:20]]
