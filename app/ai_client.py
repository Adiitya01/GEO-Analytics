# app/ai_client.py

import json
from google import genai
from google.genai import types
from cerebras.cloud.sdk import Cerebras
from openai import OpenAI
from app.config import GEMINI_API_KEY, GEMINI_MODEL_NAME, CEREBRAS_API_KEY, CEREBRAS_MODEL_NAME, OPENROUTER_API_KEY, OPENROUTER_MODEL_NAME

# Initialize Gemini Client (Official Modern SDK)
gemini_client = None
grounding_tool = None  # Google Search tool configuration

if GEMINI_API_KEY:
    gemini_client = genai.Client(api_key=GEMINI_API_KEY)
    # Configure Google Search grounding tool (official way)
    grounding_tool = types.Tool(google_search=types.GoogleSearch())
    print(f"[INFO] Gemini client initialized with Google Search grounding support")

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

def generate_ai_response(prompt: str, provider: str = "gemini", response_mime_type: str = "text/plain", use_search: bool = False) -> str:
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
            # Configure request
            config_params = {}
            if response_mime_type == "application/json":
                config_params["response_mime_type"] = "application/json"
            
            # Use search by default for Gemini if tool is available
            if grounding_tool:
                config_params["tools"] = [grounding_tool]
            
            config = types.GenerateContentConfig(**config_params) if config_params else None
            
            response = gemini_client.models.generate_content(
                model=GEMINI_MODEL_NAME,
                contents=prompt,
                config=config
            )
            return response
        except Exception as e:
            print(f"[ERROR] Gemini generation failed: {e}")
            raise e
    
    raise ValueError("No AI provider available. Please check GEMINI_API_KEY or CEREBRAS_API_KEY in .env")
