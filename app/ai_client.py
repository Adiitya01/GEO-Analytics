# app/ai_client.py

import json
from google import genai
from google.genai import types
from cerebras.cloud.sdk import Cerebras
from openai import OpenAI
import time
from datetime import datetime, timedelta
from app.config import GEMINI_API_KEY, GEMINI_MODEL_NAME, CEREBRAS_API_KEY, CEREBRAS_MODEL_NAME, OPENROUTER_API_KEY, OPENROUTER_MODEL_NAME

# Global state to track Cerebras health
CEREBRAS_DISABLED_UNTIL = None

def is_cerebras_disabled():
    global CEREBRAS_DISABLED_UNTIL
    if CEREBRAS_DISABLED_UNTIL and datetime.now() < CEREBRAS_DISABLED_UNTIL:
        return True
    return False

def disable_cerebras():
    global CEREBRAS_DISABLED_UNTIL
    CEREBRAS_DISABLED_UNTIL = datetime.now() + timedelta(days=1)
    print("[CRITICAL] Cerebras 429 hit. Disabling for 24 hours.")

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

def generate_ai_response(prompt: str, provider: str = "gemini", response_mime_type: str = "text/plain", use_search: bool = False, return_full_response: bool = False) -> any:
    """
    Tiered Orchestration Strategy:
    1. Try Cerebras (Fast/No search) -> Disable on 429
    2. OpenRouter (Claude) Fallback
    3. Gemini Tier (Structured ONLY if no search)
    4. Optional -> Post-process Gemini free text to JSON if search was used
    """
    
    # 1. Try Cerebras First (Strictly for non-search tasks)
    if provider == "cerebras" and cerebras_client and not is_cerebras_disabled() and not use_search:
        try:
            response = cerebras_client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model=CEREBRAS_MODEL_NAME,
                response_format={"type": "json_object"} if response_mime_type == "application/json" else None,
            )
            return response.choices[0].message.content
        except Exception as e:
            if "429" in str(e):
                disable_cerebras()
            print(f"[WARNING] Cerebras fallback: {e}")
            provider = "gemini" 

    # 2. OpenRouter (Claude) Fallback
    if provider == "openrouter" and openrouter_client:
        try:
            response = openrouter_client.chat.completions.create(
                model=OPENROUTER_MODEL_NAME,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"} if response_mime_type == "application/json" else None
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"[WARNING] OpenRouter fallback: {e}")
            provider = "gemini"

    # 3. Gemini Tier (General purpose + Search)
    if gemini_client:
        try:
            config_params = {}
            # Rule: Gemini WITH search -> Free text ONLY (NO schema)
            if use_search and grounding_tool:
                config_params["tools"] = [grounding_tool]
            
            # Rule: Gemini WITHOUT search -> Structured output allowed
            elif response_mime_type == "application/json":
                config_params["response_mime_type"] = "application/json"
            
            config = types.GenerateContentConfig(**config_params) if config_params else None
            
            response = gemini_client.models.generate_content(
                model=GEMINI_MODEL_NAME,
                contents=prompt,
                config=config
            )

            # Step 4: Optional post-processing
            # If search was used but JSON was requested, we do an extra small step to structure it
            if use_search and response_mime_type == "application/json":
                conversion_prompt = f"Convert the following search results into a clean JSON object based on the context:\n\n{response.text}"
                structured_res = gemini_client.models.generate_content(
                    model=GEMINI_MODEL_NAME,
                    contents=conversion_prompt,
                    config=types.GenerateContentConfig(response_mime_type="application/json")
                )
                return structured_res.text

            if return_full_response:
                return response
            return response.text

        except Exception as e:
            print(f"[ERROR] Gemini generation failed: {e}")
            raise e
    
    raise ValueError("No AI providers available. Check API keys.")
