
import asyncio
import os
import traceback
from dotenv import load_dotenv
from app.schemas import CompanyUnderstanding, GeneratedPrompt
from app.evaluator import evaluate_visibility

load_dotenv()

async def reproduce():
    try:
        company = CompanyUnderstanding(
            company_name="Ethosh",
            company_summary="Ethosh is a digital experience company.",
            industry="Immersive Technology",
            url="https://www.ethosh.com",
            region="India"
        )
        
        prompts = [
            GeneratedPrompt(prompt_text="Top digital experience companies in India", intent_category="Discovery")
        ]
        
        print("Starting evaluation...")
        report = await evaluate_visibility(company, prompts, provider="gemini")
        print("SUCCESS! Score:", report.overall_score)
    except Exception:
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(reproduce())
