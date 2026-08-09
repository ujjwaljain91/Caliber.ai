# 🎯 Caliber AI : Enterprise-Grade AI Technical Interviewer

> **Caliber AI is an enterprise-grade AI technical interviewer that conducts adaptive, multi-turn technical interviews based on a candidate's learning history.**
> **Powered by LangGraph and Breeth AI, it tracks candidate cognitive patterns to generate dynamic follow-up questions and structured evaluation reports.**


---

## 🌟 Key Features

* **📊 Personalized Candidate Dashboard:** Real-time readiness scores, topic mastery matrices, and cognitive pattern tracking before launching assessments.
* **🔄 Adaptive Multi-Turn Interview Loop:** Stateful LangGraph directed cyclic graph that dynamically evaluates answer depth and branches into insightful follow-ups for shallow answers.
* **🧠 Breeth AI Intent-Aware Memory:** Tracks candidate reasoning graphs and cognitive patterns across turns to avoid redundant questions and probe technical trade-offs.
* **📐 Strict Invariant Enforcement:** Automatically ensures every interview covers $\ge 8$ questions across $\ge 4$ unique curriculum days before synthesizing final evaluations.
* **📋 Structured Evaluation Reports:** Generates Pydantic-validated JSON scorecards highlighting aggregate scores, category breakdowns, strengths, and actionable growth areas.
* **🎨 YC-Level Visual Design System:** Dark-mode interface inspired by Linear and Vercel built with Next.js 14, Tailwind CSS v4, and streaming token responses.

---

## 🏛️ System Architecture

```text
                                  ┌────────────────────────┐
                                  │   Next.js 14 Frontend  │
                                  │   (Hosted on Netlify)  │
                                  └───────────┬────────────┘
                                              │ REST API / CORS
                                              ▼
                                  ┌────────────────────────┐
                                  │    FastAPI Backend     │
                                  │   (Hosted on Render)   │
                                  └───────────┬────────────┘
                                              │
                    ┌─────────────────────────┴─────────────────────────┐
                    ▼                                                   ▼
      ┌──────────────────────────┐                        ┌──────────────────────────┐
      │  LangGraph State Machine │                        │  Breeth AI Memory Bridge │
      │  • Response Evaluator    │                        │  • Cognitive Patterns    │
      │  • Decision Router       │                        │  • Reasoning Graphs      │
      │  • Question Generator    │                        │  • Intent Extraction     │
      └────────────┬─────────────┘                        └──────────────────────────┘
                   │
                   ▼
      ┌──────────────────────────┐
      │    Google Gemini API     │
      │  (Gemini Developer API)  │
      └──────────────────────────┘    
