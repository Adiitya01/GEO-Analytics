# app/ai_client.py

import json
from google import genai
from cerebras.cloud.sdk import Cerebras
from openai import OpenAI
from app.config import GEMINI_API_KEY, GEMINI_MODEL_NAME, CEREBRAS_API_KEY, CEREBRAS_MODEL_NAME, OPENROUTER_API_KEY, OPENROUTER_MODEL_NAME

# Initialize Gemini Client
gemini_client = None
if GEMINI_API_KEY:
    gemini_client = genai.Client(api_key=GEMINI_API_KEY)

# Initialize Cerebras Client
cerebras_client = None
if CEREBRAS_API_KEY:
    cerebras_client = Cerebras(api_key=CEREBRAS_API_KEY)

# Initialize OpenRouter Client (GPT-OSS)
openrouter_client = None
if OPENROUTER_API_KEY:
    openrouter_client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=OPENROUTER_API_KEY,
    )

def generate_ai_response(prompt: str, provider: str = "gemini", response_mime_type: str = "text/plain") -> str:
    """
    Unified interface to generate content from different providers (Gemini, Cerebras, or OpenRouter).
    """
    # If OpenRouter is requested and available
    if provider == "openrouter" and openrouter_client:
        try:
            response = openrouter_client.chat.completions.create(
                model=OPENROUTER_MODEL_NAME,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"} if response_mime_type == "application/json" else None
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"[WARNING] OpenRouter generation failed: {e}")
            # Fallback will happen below if provider check continues or we can explicitly fallback
            provider = "gemini"

    # If Cerebras is requested and available
    if provider == "cerebras" and cerebras_client:
        try:
            response = cerebras_client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model=CEREBRAS_MODEL_NAME,
                response_format={"type": "json_object"} if response_mime_type == "application/json" else None
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"[WARNING] Cerebras generation failed, falling back to Gemini: {e}")
            provider = "gemini"

    # Default to Gemini
    if gemini_client:
        try:
            config = {}
            if response_mime_type == "application/json":
                config["response_mime_type"] = "application/json"
            
            response = gemini_client.models.generate_content(
                model=GEMINI_MODEL_NAME,
                contents=prompt,
                config=config or None
            )
            return response.text
        except Exception as e:
            print(f"[ERROR] Gemini generation failed: {e}")
            raise e
    
    raise ValueError("No AI provider available. Please check GEMINI_API_KEY or CEREBRAS_API_KEY in .env")
