# app/text_cleaner.py

# Action: The text_cleaner takes the raw HTML/Text and strips away "noise" like navigation menus, 
# footer links, and excessive white space.

import re

def clean_text(text: str) -> str:
    """Cleans text by removing excessive whitespace and non-standard characters."""
    if not text:
        return ""
    # Remove control characters and excessive whitespace, but keep most printable characters
    text = re.sub(r"[\x00-\x1F\x7F]", "", text)
    # Filter to only printable characters if desired, or just replace multiple spaces
    text = re.sub(r"\s+", " ", text)
    return text.strip()

def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 100) -> list[str]:
    """
    Chunks text into segments of approximate word count with overlap.
    Overlap helps maintain context between chunks.
    """
    words = text.split()
    if not words:
        return []

    chunks = []
    i = 0
    while i < len(words):
        # Create a chunk of 'chunk_size' words
        chunk = " ".join(words[i : i + chunk_size])
        chunks.append(chunk)
        
        # Move forward by (chunk_size - overlap)
        i += (chunk_size - overlap)
        
        # Break if we've reached the end
        if i >= len(words):
            break
            
    return chunks

