# app/prompt_generator.py

import json
from google import genai
from typing import List
from app.schemas import CompanyUnderstanding, GeneratedPrompt
from app.config import GEMINI_API_KEY, GEMINI_MODEL_NAME

client = None
if GEMINI_API_KEY:
    client = genai.Client(api_key=GEMINI_API_KEY)

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
6. Long-Tail / Niche: (Very specific or technical queries related to {company.offerings[0] if company.offerings else 'the industry'})

Requirements:
- Ensure the queries sound like real humans asking an AI.
- Mix high-level and granular queries.
- Return exactly 20 queries.
- Return a JSON list of objects with "prompt_text" and "intent_category". 
"""

    try:
        if not client:
            raise ValueError("GEMINI_API_KEY not configured")

        response = client.models.generate_content(
            model=GEMINI_MODEL_NAME,
            contents=prompt,
            config={
                "response_mime_type": "application/json"
            }
        )

        # Clean up response text in case of markdown blocks
        res_text = response.text.strip()
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
                for val in data.values():
                    if isinstance(val, list):
                        data = val
                        break
            
            if not isinstance(data, list):
                raise ValueError("AI did not return a list of prompts")

        return [GeneratedPrompt(**item) for item in data[:20]]
    
    except Exception as e:
        print(f"[ERROR] Prompt generation failed: {e}")
        # Return a smaller fallback list if fails
        return [
            GeneratedPrompt(prompt_text=f"Top companies in {company.industry}", intent_category="Discovery"),
            GeneratedPrompt(prompt_text=f"Who is the leader in {company.offerings[0] if company.offerings else company.industry}?", intent_category="Discovery")
        ]
