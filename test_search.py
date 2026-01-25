#!/usr/bin/env python
"""
Quick test for Gemini Web Search (Modern SDK)
"""
import os
import asyncio
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL_NAME", "gemini-2.0-flash")

def test_basic():
    """Test basic Gemini"""
    print("\n=== Test 1: Basic Gemini ===")
    client = genai.Client(api_key=GEMINI_API_KEY)
    response = client.models.generate_content(
        model=GEMINI_MODEL_NAME,
        contents="What is 2+2?"
    )
    print(f"Response: {response.text}")
    print("✅ Basic works!")

def test_search():
    """Test with google_search tool"""
    print("\n=== Test 2: Gemini + Google Search (Modern SDK) ===")
    client = genai.Client(api_key=GEMINI_API_KEY)
    
    try:
        # Create config with google_search tool
        grounding_tool = types.Tool(google_search=types.GoogleSearch())
        config = types.GenerateContentConfig(tools=[grounding_tool])
        
        query = "Latest RBI circulars on digital lending India 2025"
        print(f"Query: {query}")
        
        response = client.models.generate_content(
            model=GEMINI_MODEL_NAME,
            contents=query,
            config=config
        )
        
        print(f"\nResponse ({len(response.text)} chars): {response.text[:300]}...")
        
        # Check for grounding metadata
        if response.candidates and response.candidates[0].grounding_metadata:
            print("\n📊 Grounding metadata found!")
            metadata = response.candidates[0].grounding_metadata
            if metadata.grounding_chunks:
                print(f"Found {len(metadata.grounding_chunks)} grounding chunks:")
                for i, chunk in enumerate(metadata.grounding_chunks[:5], 1):
                    if chunk.web:
                        print(f"  {i}. {chunk.web.title} - {chunk.web.uri}")
        else:
            print("\n⚠️ No grounding metadata found.")
            
        print("\n✅ Google Search integration works!")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_basic()
    test_search()
