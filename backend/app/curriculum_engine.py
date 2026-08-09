"""
Caliber AI — Curriculum Engine
Loads curriculum.json and candidates.json, filters skipped topics,
and selects interview topics ensuring ≥4 unique curriculum days.
"""

from __future__ import annotations

import json
import random
from pathlib import Path
from typing import Optional


# Resolve data directory relative to this file
_DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"


def _load_json(filename: str) -> dict:
    filepath = _DATA_DIR / filename
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def load_curriculum() -> dict:
    """Load the full curriculum data."""
    return _load_json("curriculum.json")


def load_candidates() -> dict:
    """Load the full candidates data."""
    return _load_json("candidates.json")


def get_curriculum_day(day: int) -> Optional[dict]:
    """Get the curriculum entry for a specific day number."""
    curriculum = load_curriculum()
    for entry in curriculum.get("days", []):
        if entry["day"] == day:
            return entry
    return None


def get_module_for_day(day: int) -> Optional[dict]:
    """Get the module that contains a specific day."""
    curriculum = load_curriculum()
    for module in curriculum.get("modules", []):
        start, end = module["days"]
        if start <= day <= end:
            return module
    return None


def filter_candidate_agenda(candidate: dict) -> dict:
    """
    Analyze candidate missions and build an interview agenda.
    
    Returns:
        {
            "completed_days": [list of day ints where passed=True],
            "skipped_days": [list of day ints where skipped=True],
            "failed_days": [list of day ints where passed=False],
            "high_attempt_days": [days with attempts >= 3, suggesting struggle],
            "eligible_days": [completed days available for interview questions],
        }
    """
    missions = candidate.get("missions", [])
    
    completed_days = []
    skipped_days = []
    failed_days = []
    high_attempt_days = []
    
    for mission in missions:
        day = mission["day"]
        
        if mission.get("skipped"):
            skipped_days.append(day)
        elif mission.get("passed") is False:
            failed_days.append(day)
        elif mission.get("passed") is True:
            completed_days.append(day)
            if mission.get("attempts", 1) >= 3:
                high_attempt_days.append(day)
    
    # Eligible days = completed days only (skipped and failed are excluded from questions)
    eligible_days = completed_days.copy()
    
    return {
        "completed_days": completed_days,
        "skipped_days": skipped_days,
        "failed_days": failed_days,
        "high_attempt_days": high_attempt_days,
        "eligible_days": eligible_days,
    }


def select_interview_topics(
    candidate: dict,
    min_days: int = 4,
    target_questions: int = 8,
) -> list[dict]:
    """
    Select curriculum topics for the interview from the candidate's eligible days.
    
    Strategy:
    1. Filter out skipped topics.
    2. Ensure at least `min_days` unique completed curriculum days are selected.
    3. Prioritize high-attempt days (areas of struggle) for deeper probing.
    4. Include a mix across different modules for breadth.
    
    Returns a list of topic dicts with full curriculum context.
    """
    agenda = filter_candidate_agenda(candidate)
    eligible = agenda["eligible_days"]
    high_attempt = set(agenda["high_attempt_days"])
    
    if len(eligible) < min_days:
        # If not enough completed days, include failed days too
        eligible = eligible + agenda["failed_days"]
    
    # Group eligible days by module for diversity
    module_buckets: dict[int, list[int]] = {}
    for day in eligible:
        module = get_module_for_day(day)
        if module:
            module_n = module["n"]
            if module_n not in module_buckets:
                module_buckets[module_n] = []
            module_buckets[module_n].append(day)
    
    selected_days = []
    
    # Step 1: Pick one day from each module for breadth (up to min_days)
    module_keys = sorted(module_buckets.keys())
    for module_n in module_keys:
        days_in_module = module_buckets[module_n]
        # Prefer high-attempt days within each module
        struggle_days = [d for d in days_in_module if d in high_attempt]
        pick = random.choice(struggle_days) if struggle_days else random.choice(days_in_module)
        selected_days.append(pick)
    
    # Step 2: If we still need more, fill from remaining eligible days
    remaining = [d for d in eligible if d not in selected_days]
    random.shuffle(remaining)
    
    while len(selected_days) < max(min_days, target_questions) and remaining:
        selected_days.append(remaining.pop())
    
    # Ensure minimum 4 unique days
    assert len(selected_days) >= min(min_days, len(eligible)), (
        f"Could not select {min_days} days; only {len(eligible)} eligible"
    )
    
    # Build full topic context for each selected day
    topics = []
    for day in selected_days:
        curriculum_entry = get_curriculum_day(day)
        module = get_module_for_day(day)
        if curriculum_entry and module:
            topics.append({
                "day": day,
                "title": curriculum_entry["title"],
                "type": curriculum_entry.get("type", ""),
                "tools": curriculum_entry.get("tools", []),
                "objectives": curriculum_entry.get("objectives", []),
                "module_n": module["n"],
                "module_title": module["title"],
            })
    
    return topics


def select_next_topic(
    covered_days: set[int],
    available_topics: list[dict],
) -> Optional[dict]:
    """
    Select the next uncovered topic from the available topics list.
    Prioritizes topics that haven't been covered yet.
    """
    uncovered = [t for t in available_topics if t["day"] not in covered_days]
    if uncovered:
        return uncovered[0]
    
    # If all topics covered, cycle back (for follow-ups beyond the plan)
    if available_topics:
        return random.choice(available_topics)
    
    return None


def get_candidate_by_id(candidate_id: str) -> Optional[dict]:
    """Look up a candidate by their member.id."""
    data = load_candidates()
    for cand in data.get("candidates", []):
        if cand["member"]["id"] == candidate_id:
            return cand
    return None
