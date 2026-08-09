"""
Caliber AI — Breeth AI Async Client
Intent-aware memory integration using the Breeth REST API.
Sends candidate responses for cognitive pattern extraction and
queries prior memory before generating new questions.
"""

from __future__ import annotations

import os
import logging
from typing import Optional

import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("caliber.breeth")

BREETH_API_URL = os.getenv("BREETH_API_URL", "https://api.thebreeth.com/v1")
BREETH_TOKEN = os.getenv("BREETH_PROJECT_TOKEN", "")


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {BREETH_TOKEN}",
        "Content-Type": "application/json",
    }


async def add_episode(
    content: str,
    group_id: str = "caliber-interviews",
    extract_intent: bool = True,
) -> Optional[dict]:
    """
    Send a candidate response to Breeth AI for cognitive pattern extraction.
    
    Args:
        content: The candidate's response text along with question context.
        group_id: Logical grouping for the episode (defaults to caliber-interviews).
        extract_intent: If True, Breeth extracts reasoning patterns and decisions.
    
    Returns:
        The Breeth API response dict, or None if the request fails.
    """
    if not BREETH_TOKEN:
        logger.warning("BREETH_PROJECT_TOKEN not set — skipping episode ingestion")
        return None

    payload = {
        "content": content,
        "group_id": group_id,
        "extract_intent": extract_intent,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{BREETH_API_URL}/episodes",
                json=payload,
                headers=_headers(),
            )
            resp.raise_for_status()
            data = resp.json()
            logger.info(f"Breeth episode stored successfully for group '{group_id}'")
            return data
    except httpx.HTTPStatusError as e:
        logger.warning(f"Breeth API HTTP error: {e.response.status_code} — {e.response.text}")
        return None
    except httpx.RequestError as e:
        logger.warning(f"Breeth API request error: {e}")
        return None
    except Exception as e:
        logger.warning(f"Breeth API unexpected error: {e}")
        return None


async def search_memory(
    query: str,
    group_id: str = "caliber-interviews",
    limit: int = 5,
) -> list[dict]:
    """
    Query Breeth AI memory for prior cognitive patterns related to a topic.
    Uses hybrid retrieval (BM25 + vector + graph traversal).
    
    Args:
        query: The search query (e.g., topic-related question).
        group_id: Logical grouping to search within.
        limit: Maximum number of results to return.
    
    Returns:
        List of memory edges/facts, or empty list if unavailable.
    """
    if not BREETH_TOKEN:
        logger.warning("BREETH_PROJECT_TOKEN not set — skipping memory search")
        return []

    payload = {
        "query": query,
        "group_id": group_id,
        "limit": limit,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{BREETH_API_URL}/search",
                json=payload,
                headers=_headers(),
            )
            resp.raise_for_status()
            data = resp.json()
            # Extract edges/facts from response
            edges = data.get("edges", data.get("results", []))
            logger.info(f"Breeth memory search returned {len(edges)} results")
            return edges if isinstance(edges, list) else []
    except httpx.HTTPStatusError as e:
        logger.warning(f"Breeth search HTTP error: {e.response.status_code} — {e.response.text}")
        return []
    except httpx.RequestError as e:
        logger.warning(f"Breeth search request error: {e}")
        return []
    except Exception as e:
        logger.warning(f"Breeth search unexpected error: {e}")
        return []


async def get_cognitive_profile(
    candidate_name: str,
    group_id: str = "caliber-interviews",
) -> Optional[str]:
    """
    Retrieve a cognitive profile summary for the candidate from Breeth memory.
    
    Args:
        candidate_name: The candidate's name to search for.
        group_id: Logical grouping to search within.
    
    Returns:
        A text summary of cognitive patterns, or None if unavailable.
    """
    results = await search_memory(
        query=f"Cognitive patterns and reasoning style of {candidate_name}",
        group_id=group_id,
        limit=10,
    )
    
    if not results:
        return None
    
    # Aggregate facts into a summary
    facts = []
    for edge in results:
        fact = edge.get("fact", edge.get("content", ""))
        if fact:
            facts.append(f"• {fact}")
    
    if facts:
        return "Breeth Memory Insights:\n" + "\n".join(facts[:8])
    
    return None
