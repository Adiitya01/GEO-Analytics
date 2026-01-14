
import os
import json
import google.generativeai as genai # Keep for backward compat check if needed, but better to switch
from google import genai
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
model_name = os.getenv("GEMINI_MODEL_NAME", "gemini-2.0-flash")

print(f"Using Model: {model_name}")
print(f"API Key present: {'Yes' if api_key else 'No'}")

client = None
if api_key:
    client = genai.Client(api_key=api_key)

prompt = "Return a JSON object with a key 'test' and value 'success'."

try:
    if not client:
        raise ValueError("No API Key")
        
    response = client.models.generate_content(
        model=model_name,
        contents=prompt,
        config={
            "response_mime_type": "application/json"
        }
    )
    print("Response text:", response.text)
except Exception as e:
    print("Error during generation:", str(e))
