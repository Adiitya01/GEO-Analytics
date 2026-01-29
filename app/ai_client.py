# app/ai_client.py

import json
import time
import random
from datetime import datetime, timedelta
from google import genai
from google.genai import types
from cerebras.cloud.sdk import Cerebras
from openai import OpenAI
from app.config import GEMINI_API_KEY, GEMINI_MODEL_NAME, CEREBRAS_API_KEY, CEREBRAS_MODEL_NAME, OPENROUTER_API_KEY, OPENROUTER_MODEL_NAME

# Provider State Management
class ProviderState:
    def __init__(self):
        self.disabled_until = {} # provider_name -> datetime
        self.temp_disabled = {
            "openrouter": True # TEMP DISABLED until auth verified
        }

    def is_enabled(self, name):
        if self.temp_disabled.get(name):
            return False
        until = self.disabled_until.get(name)
        if until and datetime.now() < until:
            return False
        return True

    def disable(self, name, hours=24):
        print(f"[CRITICAL] Disabling provider '{name}' for {hours} hours due to quota limits.")
        self.disabled_until[name] = datetime.now() + timedelta(hours=hours)

provider_state = ProviderState()

# Initialize Gemini Client (Official Modern SDK)
gemini_client = None
grounding_tool = None  # Google Search tool configuration

if GEMINI_API_KEY:
    gemini_client = genai.Client(api_key=GEMINI_API_KEY)
    # Use Google Search tool for grounding (Modern SDK way for Gemini 2.0+)
    grounding_tool = types.Tool(
        google_search=types.GoogleSearch()
    )
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
        default_headers={
            "HTTP-Referer": "http://localhost:8000",
            "X-Title": "GEO Engine"
        }
    )

def generate_ai_response(prompt: str, provider: str = "gemini", response_mime_type: str = "text/plain", use_search: bool = False, return_full_response: bool = False) -> any:
    """
    Unified interface to generate content from different providers (Gemini, Cerebras, or OpenRouter).
    Includes retry logic for rate limits and hard-disabling on quota hits.
    """
    
    max_retries = 3
    base_delay = 2
    
    last_exception = None
    
    for attempt in range(max_retries):
        try:
            # 1. OpenRouter (Claude via GPT-OSS)
            if provider == "openrouter" and openrouter_client and provider_state.is_enabled("openrouter"):
                try:
                    response = openrouter_client.chat.completions.create(
                        model=OPENROUTER_MODEL_NAME,
                        messages=[{"role": "user", "content": prompt}],
                        response_format={"type": "json_object"} if response_mime_type == "application/json" else None
                    )
                    return response.choices[0].message.content
                except Exception as e:
                    err_str = str(e).lower()
                    if "401" in err_str or "auth" in err_str:
                        print(f"[ERROR] OpenRouter Authentication Failed. Disabling until manual fix.")
                        provider_state.temp_disabled["openrouter"] = True
                        provider = "gemini" # Fallback
                    elif "429" in err_str or "quota" in err_str:
                        print(f"[WARNING] OpenRouter Rate Limit. Retrying...")
                        delay = base_delay * (2 ** attempt) + random.uniform(0, 1)
                        time.sleep(delay)
                        continue
                    else:
                        print(f"[WARNING] OpenRouter error: {e}. Falling back to Gemini.")
                        provider = "gemini"

            # 2. Cerebras
            if provider == "cerebras" and cerebras_client and provider_state.is_enabled("cerebras"):
                try:
                    response = cerebras_client.chat.completions.create(
                        messages=[{"role": "user", "content": prompt}],
                        model=CEREBRAS_MODEL_NAME,
                        response_format={"type": "json_object"} if response_mime_type == "application/json" else None
                    )
                    return response.choices[0].message.content
                except Exception as e:
                    err_data = str(e).lower()
                    if "token_quota_exceeded" in err_data or "quota" in err_data:
                        print(f"[STOP] Cerebras daily/token quota hit.")
                        provider_state.disable("cerebras", hours=24)
                        provider = "gemini" # Immediate switch
                        return generate_ai_response(prompt, provider="gemini", response_mime_type=response_mime_type, use_search=use_search)
                    
                    if "429" in err_data:
                        delay = base_delay * (2 ** attempt) + random.uniform(0, 1)
                        time.sleep(delay)
                        continue
                    
                    provider = "gemini" # Fallback

            # Default: Gemini
            if gemini_client:
                try:
                    config_params = {}
                    
                    # Rule: Gemini WITH search -> Free text ONLY (NO JSON mode at the same time)
                    if use_search and grounding_tool and response_mime_type != "application/json":
                        config_params["tools"] = [grounding_tool]
                    elif response_mime_type == "application/json":
                        config_params["response_mime_type"] = "application/json"
                    
                    config = types.GenerateContentConfig(**config_params) if config_params else None
                    
                    response = gemini_client.models.generate_content(
                        model=GEMINI_MODEL_NAME,
                        contents=prompt,
                        config=config
                    )
                    
                    # Handle return types
                    if return_full_response:
                        return response
                    if response_mime_type == "application/json":
                        return response.text
                    return response.text
                except Exception as e:
                    if "429" in str(e) or "quota" in str(e).lower():
                        delay = base_delay * (2 ** attempt) + random.uniform(0, 1)
                        time.sleep(delay)
                        continue
                    raise e
            
            raise ValueError("No AI provider available.")
            
        except Exception as e:
            last_exception = e
            if not ("429" in str(e) or "quota" in str(e).lower()):
                raise e
    
    if last_exception: raise last_exception
    raise ValueError("Failed to generate response.")
