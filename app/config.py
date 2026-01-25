# app/config.py

import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL_NAME", "gemini-1.5-flash")

CEREBRAS_API_KEY = os.getenv("CEREBRAS_API_KEY")
CEREBRAS_MODEL_NAME = os.getenv("CEREBRAS_MODEL_NAME", "llama-3.3-70b")

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL_NAME = os.getenv("OPENROUTER_MODEL_NAME", "openai/gpt-oss-120b")

if not GEMINI_API_KEY:
    print("[WARNING] GEMINI_API_KEY not found in environment variables.")

if not CEREBRAS_API_KEY:
    print("[INFO] CEREBRAS_API_KEY not found. Cerebras acceleration will be disabled.")

if not OPENROUTER_API_KEY:
    print("[INFO] OPENROUTER_API_KEY not found. GPT-OSS access will be disabled.")

# Scraping settings
DEFAULT_TIMEOUT = 10
MAX_CONCURRENT_REQUESTS = 5
IMPORTANT_PATHS = ["", "about", "about-us", "solutions", "products", "services"]
