"""
Caliber AI — FastAPI Backend Entry Point
Single POST /api/interview endpoint with session state management.
"""

from __future__ import annotations

import json
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .models import InterviewRequest, InterviewResponse, InterviewFeedback, CandidateDashboardResponse
from . import graph as interview_graph
from .curriculum_engine import load_candidates, load_curriculum, get_candidate_dashboard_data

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("caliber.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Caliber AI Interview Engine starting...")
    logger.info("📚 Curriculum loaded, Breeth memory client ready")
    yield
    logger.info("Caliber AI shutting down")


app = FastAPI(
    title="Caliber AI — Technical Interview Engine",
    description="Enterprise-grade AI-powered technical interview platform",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────
# Health Check
# ──────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "caliber-ai-interview-engine"}


# ──────────────────────────────────────────────
# Data Endpoints (for Frontend)
# ──────────────────────────────────────────────

@app.get("/api/candidates")
async def get_candidates():
    """Serve the candidates list to the frontend."""
    data = load_candidates()
    return data


@app.get("/api/candidates/{candidate_id}/dashboard", response_model=CandidateDashboardResponse)
async def get_candidate_dashboard(candidate_id: str):
    """Serve personalized candidate dashboard metrics, competency matrix, and Breeth cognitive profile."""
    data = get_candidate_dashboard_data(candidate_id)
    return data


@app.get("/api/curriculum")
async def get_curriculum():
    """Serve the curriculum data to the frontend."""
    data = load_curriculum()
    return data



# ──────────────────────────────────────────────
# Core Interview Endpoint (per technical-spec.md)
# ──────────────────────────────────────────────

@app.post("/api/interview", response_model=InterviewResponse)
async def interview(request: InterviewRequest):
    """
    Single interview endpoint handling all interview phases:
    
    1. Start: sessionId + candidate → Welcome + first question
    2. Turn:  sessionId + message  → Next question or follow-up
    3. End:   (automatic)         → Final feedback report
    """
    session_id = request.sessionId
    
    # ── Phase 1: Start Interview ──
    if request.candidate is not None:
        logger.info(f"Starting new interview session: {session_id}")
        candidate_dict = request.candidate.model_dump(by_alias=True)
        
        try:
            welcome_reply = await interview_graph.start_interview(
                session_id=session_id,
                candidate=candidate_dict,
            )
        except Exception as e:
            logger.error(f"Failed to start interview: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Interview initialization failed: {str(e)}")
        
        return InterviewResponse(reply=welcome_reply, done=False)
    
    # ── Phase 2 & 3: Conversation Turn ──
    if request.message is not None:
        logger.info(f"Processing turn for session: {session_id}")
        
        try:
            result = await interview_graph.continue_interview(
                session_id=session_id,
                message=request.message,
            )
        except Exception as e:
            logger.error(f"Interview turn failed: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Interview turn failed: {str(e)}")
        
        response = InterviewResponse(
            reply=result["reply"],
            done=result["done"],
        )
        
        if result.get("feedback"):
            response.feedback = InterviewFeedback(**result["feedback"])
        
        return response
    
    # ── Invalid Request ──
    raise HTTPException(
        status_code=400,
        detail="Request must include either 'candidate' (to start) or 'message' (to continue).",
    )


# ──────────────────────────────────────────────
# Session State Endpoint (for frontend progress bar)
# ──────────────────────────────────────────────

@app.get("/api/interview/{session_id}/state")
async def get_state(session_id: str):
    """Get current interview state for frontend display."""
    state = interview_graph.get_session_state(session_id)
    if state is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return state


# ──────────────────────────────────────────────
# Full Report Endpoint (for Evaluation Dashboard)
# ──────────────────────────────────────────────

@app.get("/api/interview/{session_id}/report")
async def get_report(session_id: str):
    """Get the full assessment report for the evaluation dashboard."""
    report = interview_graph.get_full_report(session_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found — interview may not be complete")
    return report


# ──────────────────────────────────────────────
# SSE Streaming Endpoint (for token-by-token display)
# ──────────────────────────────────────────────

@app.post("/api/interview/stream")
async def interview_stream(request: InterviewRequest):
    """
    Streaming variant of the interview endpoint.
    Returns Server-Sent Events for real-time token display.
    """
    session_id = request.sessionId
    
    async def event_generator():
        try:
            if request.candidate is not None:
                welcome = await interview_graph.start_interview(
                    session_id=session_id,
                    candidate=request.candidate.model_dump(by_alias=True),
                )
                # Stream the welcome message token by token
                words = welcome.split(" ")
                for i, word in enumerate(words):
                    token = word + (" " if i < len(words) - 1 else "")
                    yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
                
                yield f"data: {json.dumps({'type': 'done', 'done': False})}\n\n"
            
            elif request.message is not None:
                result = await interview_graph.continue_interview(
                    session_id=session_id,
                    message=request.message,
                )
                
                # Stream the reply token by token
                words = result["reply"].split(" ")
                for i, word in enumerate(words):
                    token = word + (" " if i < len(words) - 1 else "")
                    yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
                
                end_data = {"type": "done", "done": result["done"]}
                if result.get("feedback"):
                    end_data["feedback"] = result["feedback"]
                
                yield f"data: {json.dumps(end_data)}\n\n"
            
        except Exception as e:
            logger.error(f"Streaming error: {e}", exc_info=True)
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
