# app/summarizer.py

import json
from app.schemas import CompanyUnderstanding
from app.config import GEMINI_API_KEY, GEMINI_MODEL_NAME, CEREBRAS_API_KEY
from app.ai_client import generate_ai_response, cerebras_client

def summarize_company(chunks: list[str], manual_points: str = "", region: str = "Global", url: str = "") -> CompanyUnderstanding:
    """
    Summarizes company information by combining website content and manual user points.
    """
    combined_site_text = "\n".join(chunks[:8]) if chunks else "No website content available."
    
    prompt = f"""
You are a professional business analyst focusing on the {region} market. Your task is to extract key information about a company.
You have two sources of information:
1. Website Content (Crawl)
2. Manual User Points (Specific Details)

---
WEBSITE CONTENT:
\"\"\"
{combined_site_text}
\"\"\"

---
MANUAL USER POINTS:
\"\"\"
{manual_points}
\"\"\"

Instructions:
1. Extraction: Merge information from both sources. Prioritize Manual User Points.
2. If a field is unknown, return an empty list [] or "N/A".
3. Return valid JSON only.

JSON Schema:
{{
  "company_name": "Official name.",
  "company_summary": "2-3 sentence overview.",
  "industry": "Primary industry.",
  "offerings": ["List of products/services"],
  "target_users": ["List of customers"],
  "core_problems_solved": ["List of problems"]
}}
"""
    try:
        # Use Cerebras for summarization if available (it's faster for text processing)
        provider = "cerebras" if cerebras_client else "gemini"
        res_text = generate_ai_response(prompt, provider=provider, response_mime_type="application/json")
        if res_text.startswith("```"):
            # Find the first and last backticks to extract content
            import re
            json_match = re.search(r"({.*})", res_text, re.DOTALL)
            if json_match:
                res_text = json_match.group(1)
            else:
                res_text = res_text.replace("```json", "", 1).replace("```", "", 1).strip()
            
        data = json.loads(res_text)
        
        # Handle list response if AI wraps it
        if isinstance(data, list) and len(data) > 0:
            data = data[0]
        
        # Ensure lists are actually lists to avoid Pydantic errors
        for field in ["offerings", "target_users", "core_problems_solved"]:
            val = data.get(field)
            if isinstance(val, str):
                data[field] = [val] if val.strip() and val not in ["Information not available", "N/A", "None", ""] else []
            elif val is None or not isinstance(val, list):
                data[field] = []
        
        # Ensure company_name and industry are strings
        if not isinstance(data.get("company_name"), str) or not data.get("company_name"):
            data["company_name"] = "Analysis Pending"
        if not isinstance(data.get("industry"), str) or not data.get("industry"):
            data["industry"] = "Industry: Undefined"
        
        # Build the schema-compliant object
        return CompanyUnderstanding(
            company_name=data.get("company_name", "Analysis Pending"),
            company_summary=data.get("company_summary", "Summary unavailable."),
            industry=data.get("industry", "Industry: Undefined"),
            offerings=data.get("offerings", []),
            target_users=data.get("target_users", []),
            core_problems_solved=data.get("core_problems_solved", []),
            manual_points=manual_points,
            url=url,
            region=region
        )
    
    except Exception as e:
        print(f"[ERROR] Summarization failed: {e}")
        import traceback
        traceback.print_exc()
        return CompanyUnderstanding(
            company_name="Analysis Pending" if manual_points else "Unknown",
            company_summary="Could not automatically summarize company data.",
            manual_points=manual_points,
            url=url,
            region=region
        )
