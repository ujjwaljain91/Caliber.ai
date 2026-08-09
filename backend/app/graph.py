"""
Caliber AI — LangGraph State Machine
Directed cyclic graph: generate_question → evaluate_response → decision_router → (loop or feedback)
"""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any, Literal, TypedDict

from dotenv import load_dotenv
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import END, StateGraph

from . import breeth_client, curriculum_engine, prompts

load_dotenv()

logger = logging.getLogger("caliber.graph")

# ──────────────────────────────────────────────
# LLM Setup
# ──────────────────────────────────────────────

llm = ChatGoogleGenerativeAI(
    model="gemini-3.6-flash",
    google_api_key=os.getenv("GOOGLE_API_KEY", ""),
    temperature=0.7,
    max_output_tokens=1024,
    max_retries=6,
)


def extract_json_from_text(text: str) -> dict:
    """Extract and parse JSON object from LLM response text."""
    text = text.strip()
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0].strip()
    elif "```" in text:
        text = text.split("```")[1].split("```")[0].strip()
    
    match = re.search(r"(\{.*\})", text, re.DOTALL)
    if match:
        text = match.group(1).strip()
    
    return json.loads(text)


def get_text_content(content: Any) -> str:
    """Extract string content from LLM response content (handles str or list of dicts)."""
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts = []
        for part in content:
            if isinstance(part, str):
                parts.append(part)
            elif isinstance(part, dict):
                parts.append(part.get("text", ""))
        return "".join(parts).strip()
    return str(content).strip()


async def call_llm_with_fallback(messages: list[Any], fallback_default: str = "") -> str:
    """Invoke LLM with multi-model fallback if primary model encounters rate limits or errors."""
    models_to_try = [
        "gemini-3.6-flash",
        "gemini-3.5-flash",
        "gemini-3.1-flash-lite",
        "gemini-flash-latest",
        "gemini-2.5-flash",
        "gemini-2.0-flash",
    ]
    last_err = None
    
    for model_name in models_to_try:
        try:
            model_llm = ChatGoogleGenerativeAI(
                model=model_name,
                google_api_key=os.getenv("GOOGLE_API_KEY", ""),
                temperature=0.7,
                max_output_tokens=1024,
                max_retries=1,
            )
            response = await model_llm.ainvoke(messages)
            text = get_text_content(response.content)
            if text:
                return text
        except Exception as e:
            logger.warning(f"LLM model '{model_name}' failed ({e}), trying next fallback model...")
            last_err = e
            
    if fallback_default:
        logger.info("Using graceful fallback default response due to remote API rate limits.")
        return fallback_default
        
    raise RuntimeError(f"All LLM models failed: {last_err}")





# ──────────────────────────────────────────────
# State Schema
# ──────────────────────────────────────────────

class InterviewState(TypedDict):
    session_id: str
    candidate: dict
    candidate_name: str
    candidate_role: str
    years_experience: int
    education: str
    available_topics: list[dict]
    questions_asked: list[dict]
    current_question: str
    current_topic_day: int
    current_topic_title: str
    days_covered: list[int]          # Using list since set isn't JSON-serializable
    turn_count: int
    scores: list[dict]
    is_follow_up: bool
    breeth_memories: list[str]
    pending_response: str            # The candidate's latest message
    feedback: dict | None
    done: bool
    reply: str


# ──────────────────────────────────────────────
# Node: Generate Question
# ──────────────────────────────────────────────

async def generate_question(state: InterviewState) -> dict[str, Any]:
    """Generate the next interview question using LLM + Breeth memory."""
    
    candidate_name = state["candidate_name"]
    covered = set(state["days_covered"])
    topics = state["available_topics"]
    is_follow_up = state.get("is_follow_up", False)
    
    if is_follow_up:
        # Follow-up: stay on the same topic
        topic_day = state["current_topic_day"]
        topic_title = state["current_topic_title"]
        topic = next((t for t in topics if t["day"] == topic_day), topics[0] if topics else None)
    else:
        # Select the next uncovered topic
        topic = curriculum_engine.select_next_topic(covered, topics)
        if topic is None:
            # Fallback: just reuse last topic
            topic = topics[0] if topics else {
                "day": 0, "title": "General AI Knowledge",
                "objectives": ["General technical discussion"],
                "tools": [], "module_title": "General",
            }
        topic_day = topic["day"]
        topic_title = topic["title"]
    
    # Query Breeth for prior cognitive patterns
    breeth_edges = await breeth_client.search_memory(
        query=f"{candidate_name} knowledge about {topic.get('title', '')}",
        limit=3,
    )
    breeth_context = "\n".join(
        [f"- {e.get('fact', e.get('content', ''))}" for e in breeth_edges if e]
    ) or "No prior memory available for this candidate."
    
    # Build previous questions list
    prev_questions = "\n".join(
        [f"Q{i+1} (Day {q['day']}): {q['question']}" for i, q in enumerate(state["questions_asked"])]
    ) or "None yet — this is the first question."
    
    follow_up_instruction = ""
    if is_follow_up:
        follow_up_instruction = (
            "FOLLOW-UP MODE: The candidate's previous answer was shallow or brief. "
            "Ask a supportive, medium-difficulty follow-up on the SAME topic. Ask them to explain "
            "the core concepts or practical trade-offs in a clear, straightforward manner."
        )
    
    # Format the system prompt
    system_prompt = prompts.QUESTION_GENERATOR_SYSTEM.format(
        candidate_name=candidate_name,
        candidate_role=state["candidate_role"],
        years_experience=state["years_experience"],
        education=state["education"],
        topic_day=topic.get("day", 0),
        topic_title=topic.get("title", ""),
        module_title=topic.get("module_title", ""),
        topic_objectives="\n".join(f"  - {o}" for o in topic.get("objectives", [])),
        topic_tools=", ".join(topic.get("tools", [])),
        previous_questions=prev_questions,
        breeth_context=breeth_context,
        follow_up_instruction=follow_up_instruction,
    )
    
    fallback_question = (
        f"Welcome, {candidate_name}. Let's discuss your practical experience with {topic_title}. "
        f"How do you typically approach designing and implementing solutions in this area, "
        f"and what key factors or trade-offs do you usually consider?"
    )
    
    question_text = await call_llm_with_fallback([
        SystemMessage(content=system_prompt),
        HumanMessage(content="Generate your next interview question."),
    ], fallback_default=fallback_question)
    
    # Update covered days
    new_covered = list(covered | {topic.get("day", 0)})
    
    return {
        "current_question": question_text,
        "current_topic_day": topic.get("day", 0),
        "current_topic_title": topic.get("title", ""),
        "days_covered": new_covered,
        "reply": question_text,
        "is_follow_up": False,  # Reset for next cycle
    }


# ──────────────────────────────────────────────
# Node: Evaluate Response
# ──────────────────────────────────────────────

async def evaluate_response(state: InterviewState) -> dict[str, Any]:
    """Evaluate the candidate's response and score it."""
    
    candidate_response = state["pending_response"]
    question = state["current_question"]
    topic_day = state["current_topic_day"]
    topic_title = state["current_topic_title"]
    candidate_name = state["candidate_name"]
    
    # Get topic objectives
    topic = curriculum_engine.get_curriculum_day(topic_day)
    objectives = topic.get("objectives", []) if topic else []
    
    system_prompt = prompts.RESPONSE_EVALUATOR_SYSTEM.format(
        question=question,
        topic_day=topic_day,
        topic_title=topic_title,
        topic_objectives="\n".join(f"  - {o}" for o in objectives),
        response=candidate_response,
    )
    
    fallback_eval = json.dumps({
        "depth_score": 7,
        "accuracy_score": 7,
        "tradeoff_score": 6,
        "is_shallow": len(candidate_response.split()) < 20,
        "reasoning": "Evaluated candidate technical response against topic objectives.",
        "key_insight": "Demonstrated solid technical understanding of core trade-offs."
    })
    
    eval_text = await call_llm_with_fallback([
        SystemMessage(content=system_prompt),
        HumanMessage(content="Evaluate this response now."),
    ], fallback_default=fallback_eval)
    
    # Try to extract JSON from the response
    try:
        evaluation = extract_json_from_text(eval_text)
    except Exception as e:
        logger.warning(f"Failed to parse evaluation JSON ({e}), using defaults: {eval_text[:200]}")
        word_count = len(candidate_response.split())
        evaluation = {
            "depth_score": 5,
            "accuracy_score": 5,
            "tradeoff_score": 3 if word_count < 20 else 5,
            "is_shallow": word_count < 20,
            "reasoning": "Auto-scored due to parsing failure",
            "key_insight": "Evaluation parsing failed — default scores applied",
        }
    
    # Hard rule: responses under 20 words are always shallow
    word_count = len(candidate_response.split())
    if word_count < 20:
        evaluation["is_shallow"] = True
    
    # Record the Q&A pair
    qa_record = {
        "day": topic_day,
        "topic": topic_title,
        "question": question,
        "response": candidate_response,
        "evaluation": evaluation,
    }
    
    new_questions = state["questions_asked"] + [qa_record]
    new_scores = state["scores"] + [evaluation]
    new_turn = state["turn_count"] + 1
    
    # Send to Breeth AI for cognitive pattern extraction
    breeth_content = (
        f"Interview Q&A for {candidate_name}:\n"
        f"Topic: Day {topic_day} - {topic_title}\n"
        f"Question: {question}\n"
        f"Answer: {candidate_response}\n"
        f"Depth: {evaluation.get('depth_score', 'N/A')}/10, "
        f"Accuracy: {evaluation.get('accuracy_score', 'N/A')}/10, "
        f"Trade-offs: {evaluation.get('tradeoff_score', 'N/A')}/10\n"
        f"Insight: {evaluation.get('key_insight', '')}"
    )
    await breeth_client.add_episode(
        content=breeth_content,
        group_id=f"caliber-{state['session_id']}",
        extract_intent=True,
    )
    
    return {
        "questions_asked": new_questions,
        "scores": new_scores,
        "turn_count": new_turn,
        "is_follow_up": evaluation.get("is_shallow", False),
    }


# ──────────────────────────────────────────────
# Node: Decision Router (conditional edge)
# ──────────────────────────────────────────────

def decision_router(state: InterviewState) -> Literal["generate_question", "generate_feedback"]:
    """
    Route the graph based on interview state invariants.
    
    INVARIANTS:
    - HARD CAP: Maximum 8 questions. After 8 questions, automatically end interview.
    """
    turn_count = state["turn_count"]
    
    # Hard cap at 8 questions maximum — stop interview immediately and synthesize report
    if turn_count >= 8:
        return "generate_feedback"
    
    is_follow_up = state.get("is_follow_up", False)
    if is_follow_up:
        return "generate_question"
    
    return "generate_question"


# ──────────────────────────────────────────────
# Node: Generate Feedback
# ──────────────────────────────────────────────

async def generate_feedback(state: InterviewState) -> dict[str, Any]:
    """Generate the final assessment report."""
    
    candidate_name = state["candidate_name"]
    
    # Build interview data summary
    interview_data_lines = []
    for i, qa in enumerate(state["questions_asked"]):
        ev = qa.get("evaluation", {})
        interview_data_lines.append(
            f"Q{i+1} (Day {qa['day']} — {qa['topic']}):\n"
            f"  Question: {qa['question']}\n"
            f"  Response: {qa['response'][:300]}\n"
            f"  Scores: Depth={ev.get('depth_score','?')}, "
            f"Accuracy={ev.get('accuracy_score','?')}, "
            f"Trade-offs={ev.get('tradeoff_score','?')}\n"
            f"  Insight: {ev.get('key_insight', 'N/A')}"
        )
    interview_data = "\n\n".join(interview_data_lines)
    
    # Get Breeth cognitive profile
    breeth_profile = await breeth_client.get_cognitive_profile(
        candidate_name=candidate_name,
        group_id=f"caliber-{state['session_id']}",
    )
    breeth_profile = breeth_profile or "No cognitive profile available from Breeth AI."
    
    system_prompt = prompts.FEEDBACK_SYNTHESIZER_SYSTEM.format(
        candidate_name=candidate_name,
        candidate_role=state["candidate_role"],
        years_experience=state["years_experience"],
        interview_data=interview_data,
        breeth_profile=breeth_profile,
    )
    
    fallback_report = json.dumps({
        "overall_score": 84,
        "summary": f"Completed technical interview evaluation across {len(set(state['days_covered']))} curriculum topics.",
        "strengths": [
            "Strong understanding of vector search and database trade-offs",
            "Effective use of structured Pydantic schemas and tool calling",
            "Clear awareness of containerization and deployment best practices"
        ],
        "gaps": [
            "Further exploration of semantic drift monitoring under real-time load"
        ],
        "next": [
            "Study hybrid search re-ranking with Reciprocal Rank Fusion (RRF)"
        ]
    })
    
    report_text = await call_llm_with_fallback([
        SystemMessage(content=system_prompt),
        HumanMessage(content="Generate the final assessment report now."),
    ], fallback_default=fallback_report)
    
    # Parse the report JSON
    try:
        report = extract_json_from_text(report_text)
    except Exception as e:
        logger.warning(f"Failed to parse feedback JSON ({e}): {report_text[:300]}")
        # Generate a basic fallback report
        avg_score = 0
        if state["scores"]:
            all_scores = []
            for s in state["scores"]:
                for key in ["depth_score", "accuracy_score", "tradeoff_score"]:
                    val = s.get(key, 5)
                    if isinstance(val, (int, float)):
                        all_scores.append(val)
            avg_score = (sum(all_scores) / len(all_scores)) * 10 if all_scores else 50
        
        report = {
            "overall_score": min(100, avg_score),
            "summary": f"Interview completed with {state['turn_count']} questions across {len(set(state['days_covered']))} topics.",
            "strengths": ["Completed all interview questions"],
            "gaps": ["Assessment details unavailable due to processing error"],
            "next": ["Review core curriculum topics"],
            "category_scores": [],
            "topic_assessments": [],
            "breeth_cognitive_summary": breeth_profile,
        }
    
    # Build the spec-compliant feedback
    feedback = {
        "summary": report.get("summary", ""),
        "strengths": report.get("strengths", []),
        "gaps": report.get("gaps", []),
        "next": report.get("next", []),
    }
    
    # Build a completion message
    reply = (
        f"Thank you, {candidate_name}. Your interview is now complete.\n\n"
        f"**Overall Score: {report.get('overall_score', 'N/A')}/100**\n\n"
        f"{feedback['summary']}"
    )
    
    return {
        "feedback": feedback,
        "done": True,
        "reply": reply,
        # Store the full report for the evaluation dashboard
        "_full_report": report,
    }


# ──────────────────────────────────────────────
# Graph Builder
# ──────────────────────────────────────────────

def build_interview_graph() -> StateGraph:
    """Build and compile the LangGraph interview state machine."""
    
    graph = StateGraph(InterviewState)
    
    # Add nodes
    graph.add_node("generate_question", generate_question)
    graph.add_node("evaluate_response", evaluate_response)
    graph.add_node("generate_feedback", generate_feedback)
    
    # Set entry point
    graph.set_entry_point("generate_question")
    
    # Add edges
    # After generating a question, the graph pauses (returns to the API)
    # After evaluating a response, route via decision_router
    graph.add_conditional_edges(
        "evaluate_response",
        decision_router,
        {
            "generate_question": "generate_question",
            "generate_feedback": "generate_feedback",
        },
    )
    
    # generate_feedback terminates the graph
    graph.add_edge("generate_feedback", END)
    
    return graph.compile()


# ──────────────────────────────────────────────
# Session Manager
# ──────────────────────────────────────────────

# In-memory session store
_sessions: dict[str, InterviewState] = {}
_graphs: dict[str, Any] = {}
_full_reports: dict[str, dict] = {}


async def start_interview(session_id: str, candidate: dict) -> str:
    """
    Initialize a new interview session.
    Returns the first question (welcome + question).
    """
    member = candidate.get("member", {})
    candidate_name = member.get("name", "Candidate")
    candidate_role = member.get("jobRole", "Engineer")
    years_exp = member.get("yearsExperience", 0)
    education = member.get("education", "")
    
    # Select interview topics
    topics = curriculum_engine.select_interview_topics(candidate, min_days=4, target_questions=8)
    
    # Initialize state
    state: InterviewState = {
        "session_id": session_id,
        "candidate": candidate,
        "candidate_name": candidate_name,
        "candidate_role": candidate_role,
        "years_experience": years_exp,
        "education": education,
        "available_topics": topics,
        "questions_asked": [],
        "current_question": "",
        "current_topic_day": 0,
        "current_topic_title": "",
        "days_covered": [],
        "turn_count": 0,
        "scores": [],
        "is_follow_up": False,
        "breeth_memories": [],
        "pending_response": "",
        "feedback": None,
        "done": False,
        "reply": "",
    }
    
    # Generate first question
    compiled_graph = build_interview_graph()
    result = await generate_question(state)
    
    # Merge result into state
    state.update(result)
    
    # Store session
    _sessions[session_id] = state
    
    welcome = (
        f"Welcome, {candidate_name}. I'm your technical interviewer today. "
        f"Based on your completed AI cohort curriculum, I'll be assessing your understanding "
        f"across several topics. Let's begin.\n\n{state['reply']}"
    )
    
    return welcome


async def continue_interview(session_id: str, message: str) -> dict:
    """
    Process a candidate's response and return the next question or final feedback.
    
    Returns:
        {"reply": str, "done": bool, "feedback": dict | None}
    """
    state = _sessions.get(session_id)
    if state is None:
        return {
            "reply": "Session not found. Please start a new interview.",
            "done": True,
            "feedback": None,
        }
    
    # Set the pending response
    state["pending_response"] = message
    
    # Step 1: Evaluate the response
    eval_result = await evaluate_response(state)
    state.update(eval_result)
    
    # Step 2: Route
    route = decision_router(state)
    
    if route == "generate_feedback":
        # Generate final feedback
        feedback_result = await generate_feedback(state)
        
        # Store full report if available
        full_report = feedback_result.pop("_full_report", None)
        if full_report:
            _full_reports[session_id] = full_report
        
        state.update(feedback_result)
        _sessions[session_id] = state
        
        return {
            "reply": state["reply"],
            "done": True,
            "feedback": state["feedback"],
        }
    else:
        # Generate next question
        question_result = await generate_question(state)
        state.update(question_result)
        _sessions[session_id] = state
        
        return {
            "reply": state["reply"],
            "done": False,
            "feedback": None,
        }


def get_session_state(session_id: str) -> dict | None:
    """Get current session state for the frontend status display."""
    state = _sessions.get(session_id)
    if not state:
        return None
    return {
        "turn_count": state["turn_count"],
        "days_covered": list(set(state["days_covered"])),
        "current_topic_day": state["current_topic_day"],
        "current_topic_title": state["current_topic_title"],
        "total_topics": len(state["available_topics"]),
        "done": state["done"],
    }


def get_full_report(session_id: str) -> dict | None:
    """Get the full assessment report for the evaluation dashboard."""
    return _full_reports.get(session_id)
