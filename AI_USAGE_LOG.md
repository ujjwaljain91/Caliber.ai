# AI Usage Log — Caliber AI

> Hackathon compliance artifact documenting all prompts, architectural decisions, agent execution logs, and code diffs.

---

## Stage 1: Architecture & Design Decisions

### Decision 1: LangGraph Directed Cyclic State Machine
- **Rationale**: LangGraph provides a first-class API for building stateful, directed cyclic graphs with conditional edges. This maps directly to the interview loop requirement: generate_question → evaluate_response → decision_router → (loop back or generate_feedback).
- **Alternative Considered**: LangChain's AgentExecutor. Rejected because it's designed for tool-use agents, not structured interview workflows with strict invariant enforcement.

### Decision 2: Google Gemini 2.0 Flash as LLM Provider
- **Rationale**: Fast inference, good instruction-following for structured JSON outputs, and native async support via `langchain-google-genai`.
- **API Used**: `gemini-2.0-flash` via `ChatGoogleGenerativeAI`

### Decision 3: Breeth AI as Intent-Aware Memory Layer
- **Rationale**: Breeth provides cognitive pattern extraction (`extract_intent: true`) which goes beyond simple retrieval — it models the *reasoning* behind candidate responses, enabling the question generator to target identified knowledge gaps.
- **Integration Points**:
  1. `evaluate_response` node → Sends each Q&A pair to `POST /v1/episodes` with `extract_intent: true`
  2. `generate_question` node → Queries `POST /v1/search` before each question to avoid redundancy

### Decision 4: Next.js 16 App Router + Tailwind CSS v4 + Apple Liquid Glass System
- **Rationale**: Next.js App Router provides server components, streaming, and file-based routing. Tailwind v4 uses CSS-first `@theme` configuration for design tokens in OKLCH/Hex space.
- **Design System**: Inspired by Apple Liquid Glass, Linear, Vercel, and Supabase — dark mode (#08090A) with vibrant YC Vermilion accents (#FF4000), glassmorphism (`backdrop-filter: blur(40px)`), and ambient refracted light orbs.

### Decision 5: Dedicated Backend Candidate Dashboard API
- **Rationale**: Decouple curriculum evaluation state from frontend layout. Pydantic models compute readiness scores, module mastery metrics, Breeth cognitive trajectories, and assessment session history.
- **Endpoint**: `GET /api/candidates/{candidate_id}/dashboard`

---

## Stage 2: System Prompts

### Question Generator Prompt
Framed as a "Senior Staff AI Engineer" persona. Key instructions:
- Ask ONE clear question at a time
- Frame around real engineering scenarios, not textbook definitions
- Adapt difficulty based on candidate's role and experience
- Follow-up mode for shallow responses: probe trade-offs and failure modes

### Response Evaluator Prompt
Structured rubric scoring:
- Depth (1-10): Implementation details, edge cases, nuances
- Accuracy (1-10): Technical correctness
- Trade-off Awareness (1-10): Alternatives, when approach would NOT work
- Shallow detection: < 20 words OR no trade-off discussion

### Feedback Synthesizer Prompt
Generates JSON assessment report with:
- Overall score (0-100) with category breakdowns
- Per-topic mastery status (Passed/Needs Review/Failed)
- Strengths, gaps, and next steps arrays
- Breeth cognitive profile summary

---

## Agent Execution Log

| Timestamp | Action | Details |
|-----------|--------|---------|
| 2026-08-07 21:50 | Plan Created | Full implementation plan for Caliber AI |
| 2026-08-07 21:55 | Plan Approved | User approved with Gemini API key |
| 2026-08-07 21:56 | Project Setup | .env, .gitignore, data/ directory |
| 2026-08-07 21:57 | Backend Models | Pydantic v2 models (models.py) |
| 2026-08-07 21:58 | System Prompts | prompts.py with 3 prompt templates |
| 2026-08-07 21:58 | Curriculum Engine | curriculum_engine.py with topic selection |
| 2026-08-07 21:59 | Breeth Client | breeth_client.py with async REST API calls |
| 2026-08-07 21:59 | LangGraph Engine | graph.py with 4-node state machine |
| 2026-08-07 22:00 | FastAPI Server | main.py with interview endpoint |
| 2026-08-07 22:00 | Dependencies | requirements.txt + pip install |
| 2026-08-07 22:01 | Frontend Scaffold | Next.js 14 + Tailwind v4 |
| 2026-08-08 10:25 | Async Testing | Added pytest-asyncio and verified backend flow tests |
| 2026-08-08 12:48 | Gemini Workspace | Redesigned interview workspace to Gemini-inspired centered flow |
| 2026-08-08 13:15 | Liquid Assessment | Overhauled Assessment Report with Apple Liquid Glass design |
| 2026-08-08 13:20 | Site-Wide Glass UI | Extended Apple Liquid Glass system across Landing & Candidate Directory |
| 2026-08-08 13:23 | Floating Headers | Upgraded all page headers to floating Liquid Glass capsules |
| 2026-08-08 13:38 | Enterprise Copy | Replaced internal framework names with executive product copy |
| 2026-08-08 13:42 | UI Refinements | Anchored input bar flush to bottom & made Actionable Next Steps active |
| 2026-08-09 09:40 | Dropdown Fix | Added color-scheme: dark and option rules to globals.css and AuthModal.tsx to fix select text visibility |
| 2026-08-09 09:42 | OTP Button Styling | Updated verification button to stay vibrant and validate input inline instead of muddy brown |
| 2026-08-09 09:45 | Backend Launch | Started Uvicorn server on port 8000 to enable communication |
| 2026-08-09 09:48 | Logout Navigation | Configured automatic redirect to landing page and view reset upon logging out |
| 2026-08-09 09:54 | Header Cleanup | Removed duplicate Back to Overview link from page.tsx header |
| 2026-08-09 10:04 | Gemini History Sidebar | Added left candidate-scoped history drawer and right blueprint panels with sticky bottom input |
| 2026-08-09 10:20 | Navigation Locking | Removed Home breadcrumb link to enforce logout before returning to landing page |
| 2026-08-09 10:24 | Brand Logo Update | Overwrote default Next.js favicon.ico and public logos with custom uploaded brand logo |
| 2026-08-09 11:30 | Dashboard Backend API | Built `GET /api/candidates/{id}/dashboard` returning readiness index, 5 competency modules, and Breeth cognitive profile |
| 2026-08-09 11:55 | Liquid Dashboard UI | Implemented YC-level Candidate Dashboard with Executive Left Sidebar, SVG gauge dial, and session history |
| 2026-08-09 12:15 | Landing Page Auth Flow | Implemented conditional viewState (`LANDING` vs `WORKSPACE`) with restored Capabilities grid, Workflow, and Liquid Footer |
| 2026-08-09 12:40 | State Auth Redirect | Integrated `justLoggedIn` flag in `AuthContext` for seamless transition to workspace upon OTP verification |
| 2026-08-09 13:10 | Netlify Routing Fix | Removed raw SPA rewrite rule in `netlify.toml` allowing `@netlify/plugin-nextjs` to serve JS chunks and SSR pages cleanly |
| 2026-08-09 13:45 | Dashboard UI Polishing | Enlarged Readiness Gauge ring (80px x 80px) for inner breathing room, removed container clipping, and fixed dropdown text contrast |

---

## Git Commit Plan

```
feat: scaffold project structure and configuration
feat: implement pydantic v2 models for api contract
feat: add system prompts for langgraph nodes
feat: build curriculum engine with topic selection
feat: integrate breeth ai memory client
feat: implement langgraph state machine
feat: create fastapi backend with interview endpoint
feat: scaffold nextjs 14 frontend
feat: build yc design system with tailwind v4
feat: implement candidate onboarding view
feat: build live interview workspace with streaming
feat: create evaluation dashboard with score dial
feat: redesign interview workspace to gemini-style centered UI
feat: implement apple liquid glass design system across report & platform
feat: upgrade top navigation bars to floating liquid glass capsules
style: integrate official caliber ai brand logo emblem
copy: refine platform text to enterprise-grade executive copy
fix: anchor floating input container and activate actionable next steps
fix: resolve select option white-on-white text visibility issue with color-scheme dark
style: improve OTP verification button disabled states and inline validation
fix: set up automatically redirecting home view on logout
refactor: remove redundant header navigation and home breadcrumbs
feat: build desktop sidebar history drawer and assessment blueprint context panel
feat: build candidate dashboard backend api and model schemas
feat: implement apple liquid glass candidate dashboard with executive left sidebar
feat: restore public marketing landing page features grid, workflow, and liquid footer
fix: integrate justLoggedIn state trigger in auth context for clean workspace redirect
fix: update netlify.toml configuration for nextjs asset loading
style: enlarge readiness circle gauge and resolve candidate switcher dropdown text contrast
docs: update ai usage log for hackathon compliance
```
