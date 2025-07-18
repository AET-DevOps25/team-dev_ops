import feedparser
from typing import List, Optional
from datetime import datetime, timezone # Keep 'timezone' import
import logging
import requests
import time # Needed for time.mktime
import re # For regex operations on text

from bs4 import BeautifulSoup # HTML parsing of Reddit entries

from niche_explorer_models.models.article import Article

logger = logging.getLogger(__name__)

class RedditFetcher:
    def __init__(self):
        # Bypass Reddit's bot detection by setting a User-Agent
        self.user_agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 NicheExplorer/1.0'

    async def fetch(self, subreddit: str, max_results: int = 50) -> List[Article]:
        
        logger.info(f"Fetching Reddit RSS for r/{subreddit} with max_results={max_results}")

        url = f"https://www.reddit.com/r/{subreddit}.rss"
        
        # Wrap Reddit request in a request with custom headers, including User-Agent and Accept headers to avoid being blocked by Reddit's anti-bot measures.
        headers = {
            "User-Agent": self.user_agent,
            "Accept": "application/rss+xml, application/xml"
        }
        response = requests.get(url, headers=headers)

        if response.status_code >= 400:
            logger.error(f"HTTP error {response.status_code} fetching Reddit RSS for r/{subreddit}")
            return []

        feed = feedparser.parse(response.content)
        articles = []
        
        # Check for general parsing errors (malformed XML, etc.)
        if feed.bozo:
            logger.error(f"Parsing error (bozo exception) for r/{subreddit}: {feed.bozo_exception}")
            return []

        # No entries found
        if not feed.entries:
            logger.info(f"No entries found in Reddit RSS for r/{subreddit}. It might be empty or malformed after parsing.")
            return []

        for entry in feed.entries[:max_results]:
            published: Optional[datetime] = None
            
            # Create a timezone-aware datetime object, as Reddit's timestamps often do not include timezone info.
            # Assuming UTC as default.
            if entry.get("published_parsed"):
                try:
                    published = datetime.fromtimestamp(time.mktime(entry.published_parsed), tz=timezone.utc)
                except Exception as e:
                    logger.warning(f"Error parsing 'published_parsed' date for entry '{entry.get('title', 'N/A')}': {e}")
            elif entry.get("updated_parsed"):
                try:
                    published = datetime.fromtimestamp(time.mktime(entry.updated_parsed), tz=timezone.utc)
                except Exception as e:
                    logger.warning(f"Error parsing 'updated_parsed' date for entry '{entry.get('title', 'N/A')}': {e}")

            # --- Reddit has a lot of HTML and other tags in the summary field, so we need to clean it up ---
            # Extract all text from the parsed HTML.
            full_raw_text = BeautifulSoup(entry.get("summary", ""), 'html.parser').get_text(separator='\n', strip=True)
            
            # Clean up Reddit-specific HTML comments (sometimes they appear as text)
            cleaned_body_text = full_raw_text.replace("<!-- SC_OFF -->", "").replace("<!-- SC_ON -->", "")
            
            match = re.match(r'^(https?:\/\/(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,6}(?:\/[^\s]*?\.?(?:jpg|jpeg|png|gif|webp|mp4|webm))?\s+)?(.*)', 
                             cleaned_body_text, re.DOTALL)
            if match and match.group(2):
                cleaned_body_text = match.group(2).strip()
                
            # Collapse multiple consecutive newlines into a maximum of two newlines (for proper paragraph breaks)
            cleaned_body_text = re.sub(r'\n\s*\n', '\n\n', cleaned_body_text)
            # Remove lines that contain only whitespace
            cleaned_body_text = re.sub(r'^\s*$\n', '', cleaned_body_text, flags=re.MULTILINE)
            
            # Remove '[link]' if it appears before '[comments]' or at the end
            cleaned_body_text = re.sub(r'\s*\[link\](?=\s*\[comments\]|$)', '', cleaned_body_text, flags=re.DOTALL)
            
            # Remove '[comments]' and any surrounding whitespace if it's at the very end
            cleaned_body_text = re.sub(r'\s*\[comments\]\s*$', '', cleaned_body_text, flags=re.DOTALL)
            # Strip leading/trailing whitespace from the entire string
            cleaned_body_text = cleaned_body_text.strip()
            
            articles.append(
                Article(
                    id=entry.id,
                    title=entry.title,
                    link=entry.link,
                    summary=cleaned_body_text,
                    authors=[],
                    published=published,
                    source="reddit",
                )
            )
        logger.info(f"Successfully fetched {len(articles)} articles from r/{subreddit}.")
        return articles

reddit_fetcher = RedditFetcher()