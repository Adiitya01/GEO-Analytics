# app/site_metadata.py
"""
Utility to extract rich metadata from URLs including favicon, description, domain, etc.
This provides real website information instead of generic Google search placeholders.
"""

import re
import asyncio
from functools import partial
from urllib.parse import urlparse, urljoin
from typing import Optional, Dict, Any
import aiohttp
from bs4 import BeautifulSoup

# Cache for fetched metadata to avoid redundant requests
_metadata_cache: Dict[str, Dict[str, Any]] = {}


def extract_domain(url: str) -> str:
    """Extract the domain from a URL."""
    try:
        parsed = urlparse(url)
        domain = parsed.netloc or parsed.path.split('/')[0]
        # Remove 'www.' prefix if present
        if domain.startswith('www.'):
            domain = domain[4:]
        return domain
    except:
        return url


def get_favicon_url(url: str, soup: Optional[BeautifulSoup] = None) -> str:
    """Extract or construct favicon URL from a page."""
    try:
        parsed = urlparse(url)
        base_url = f"{parsed.scheme}://{parsed.netloc}"
        
        # Try to find favicon from HTML if soup is provided
        if soup:
            # Look for link rel="icon" or rel="shortcut icon"
            icon_link = soup.find('link', rel=lambda x: x and ('icon' in x.lower() if isinstance(x, str) else 'icon' in ' '.join(x).lower()))
            if icon_link and icon_link.get('href'):
                href = icon_link['href']
                if href.startswith('//'):
                    return f"{parsed.scheme}:{href}"
                elif href.startswith('/'):
                    return urljoin(base_url, href)
                elif href.startswith('http'):
                    return href
                else:
                    return urljoin(base_url, href)
        
        # Fallback to standard favicon location
        return f"{base_url}/favicon.ico"
    except:
        return ""


def get_meta_description(soup: BeautifulSoup) -> Optional[str]:
    """Extract meta description from parsed HTML."""
    try:
        # Try meta description
        meta_desc = soup.find('meta', attrs={'name': 'description'})
        if meta_desc and meta_desc.get('content'):
            return meta_desc['content'][:200]  # Limit length
        
        # Try og:description
        og_desc = soup.find('meta', attrs={'property': 'og:description'})
        if og_desc and og_desc.get('content'):
            return og_desc['content'][:200]
        
        # Try first paragraph as fallback
        first_p = soup.find('p')
        if first_p and first_p.get_text(strip=True):
            text = first_p.get_text(strip=True)
            return text[:200] if len(text) > 200 else text
            
    except:
        pass
    return None


def get_page_title(soup: BeautifulSoup, fallback: str = "Website") -> str:
    """Extract page title from parsed HTML."""
    try:
        # Try title tag
        title_tag = soup.find('title')
        if title_tag and title_tag.string:
            return title_tag.string.strip()[:100]
        
        # Try og:title
        og_title = soup.find('meta', attrs={'property': 'og:title'})
        if og_title and og_title.get('content'):
            return og_title['content'][:100]
        
        # Try h1
        h1 = soup.find('h1')
        if h1 and h1.get_text(strip=True):
            return h1.get_text(strip=True)[:100]
            
    except:
        pass
    return fallback


async def fetch_site_metadata(url: str, timeout: int = 5) -> Dict[str, Any]:
    """
    Fetch metadata from a URL including title, description, favicon.
    Returns a dict with: title, description, favicon, domain, success
    """
    # Check cache first
    if url in _metadata_cache:
        return _metadata_cache[url]
    
    domain = extract_domain(url)
    
    result = {
        "title": domain,
        "description": None,
        "favicon": f"https://www.google.com/s2/favicons?domain={domain}&sz=64",  # Google's favicon service as fallback
        "domain": domain,
        "success": False
    }
    
    # Skip fetching for Google search URLs (they're not real pages)
    if "google.com/search" in url.lower():
        result["title"] = "Google Search"
        result["description"] = "Search results from Google"
        result["favicon"] = "https://www.google.com/favicon.ico"
        result["success"] = True
        _metadata_cache[url] = result
        return result
    
    try:
        timeout_config = aiohttp.ClientTimeout(total=timeout)
        async with aiohttp.ClientSession(timeout=timeout_config) as session:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
            async with session.get(url, headers=headers, ssl=False) as response:
                if response.status == 200:
                    html = await response.text()
                    soup = BeautifulSoup(html, 'html.parser')
                    
                    result["title"] = get_page_title(soup, domain)
                    result["description"] = get_meta_description(soup)
                    result["favicon"] = get_favicon_url(url, soup)
                    result["success"] = True
    except asyncio.TimeoutError:
        print(f"[DEBUG] Timeout fetching metadata for: {url}")
    except Exception as e:
        print(f"[DEBUG] Error fetching metadata for {url}: {str(e)[:50]}")
    
    # Cache the result
    _metadata_cache[url] = result
    return result


async def enrich_sources_with_metadata(sources: list, max_concurrent: int = 5) -> list:
    """
    Enrich a list of SearchSource objects with fetched metadata.
    Uses semaphore to limit concurrent requests.
    """
    from app.schemas import SearchSource
    
    sem = asyncio.Semaphore(max_concurrent)
    
    async def enrich_single(source: SearchSource) -> SearchSource:
        async with sem:
            # Skip if already has rich metadata
            if source.domain and source.description and source.is_grounded:
                return source
            
            metadata = await fetch_site_metadata(source.url)
            
            # Update source with fetched metadata
            return SearchSource(
                title=source.title if source.title and source.title != "Verified Web Source" else metadata["title"],
                url=source.url,
                favicon=source.favicon or metadata["favicon"],
                description=source.description or metadata["description"],
                domain=source.domain or metadata["domain"],
                is_grounded=source.is_grounded,
                source_type=source.source_type
            )
    
    enriched = await asyncio.gather(*[enrich_single(s) for s in sources])
    return list(enriched)


def extract_urls_from_text(text: str) -> list:
    """Extract all URLs from a text string."""
    url_pattern = r'https?://(?:[-\w.]|(?:%[\da-fA-F]{2})|[/?=&#+])+(?<![).,;!?\'\"])'
    found = re.findall(url_pattern, text)
    # Clean trailing punctuation
    cleaned = []
    for url in found:
        clean_url = url.rstrip(').,;!?"\']')
        if clean_url and clean_url not in cleaned:
            cleaned.append(clean_url)
    return cleaned
