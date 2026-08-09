"""
Caliber AI — Pydantic v2 Models
Strict type enforcement matching the technical-spec.md API contract.
"""

from __future__ import annotations

from pydantic import BaseModel, Field
from enum import Enum
from typing import Optional


# ──────────────────────────────────────────────
# Candidate Data Models
# ──────────────────────────────────────────────

class MemberInfo(BaseModel):
    id: str
    name: str
    jobRole: str = Field(..., alias="jobRole")
    yearsExperience: int = Field(..., alias="yearsExperience")
    education: str
    status: str

    model_config = {"populate_by_name": True}


class Mission(BaseModel):
    day: int
    title: str
    passed: Optional[bool] = None
    skipped: Optional[bool] = None
    attempts: Optional[int] = None


class Signals(BaseModel):
    commitDays: int = Field(..., alias="commitDays")
    missionsCompleted: int = Field(..., alias="missionsCompleted")
    missionsFirstTry: int = Field(..., alias="missionsFirstTry")

    model_config = {"populate_by_name": True}


class CandidateData(BaseModel):
    member: MemberInfo
    missions: list[Mission]
    signals: Signals


# ──────────────────────────────────────────────
# API Request / Response Models (per technical-spec.md)
# ──────────────────────────────────────────────

class InterviewRequest(BaseModel):
    """
    Unified request body for POST /api/interview.
    - First request: sessionId + candidate (starts interview)
    - Subsequent requests: sessionId + message (conversation turn)
    """
    sessionId: str = Field(..., alias="sessionId")
    candidate: Optional[CandidateData] = None
    message: Optional[str] = None

    model_config = {"populate_by_name": True}


class InterviewFeedback(BaseModel):
    """Final feedback returned when done=true (per spec)."""
    summary: str
    strengths: list[str]
    gaps: list[str]
    next: list[str]


class InterviewResponse(BaseModel):
    """
    Response body for POST /api/interview.
    - During interview: reply + done=false
    - Final turn: reply + done=true + feedback
    """
    reply: str
    done: bool = False
    feedback: Optional[InterviewFeedback] = None


# ──────────────────────────────────────────────
# Extended Assessment Models (for Evaluation Dashboard)
# ──────────────────────────────────────────────

class MasteryStatus(str, Enum):
    PASSED = "Passed"
    NEEDS_REVIEW = "Needs Review"
    FAILED = "Failed"


class TopicMastery(BaseModel):
    day: int
    title: str
    status: MasteryStatus
    score: float = Field(..., ge=0, le=10)
    question_count: int
    key_insight: str


class CategoryScore(BaseModel):
    category: str
    score: float = Field(..., ge=0, le=100)
    weight: float


class AssessmentReport(BaseModel):
    """Extended assessment for the Evaluation Dashboard."""
    session_id: str
    candidate_name: str
    candidate_role: str
    overall_score: float = Field(..., ge=0, le=100)
    category_scores: list[CategoryScore]
    topic_mastery: list[TopicMastery]
    strengths: list[str]
    growth_areas: list[str]
    next_steps: list[str]
    breeth_cognitive_summary: Optional[str] = None
    total_questions: int
    total_days_covered: int
    interview_duration_turns: int
