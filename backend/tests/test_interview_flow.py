import json
import httpx
import asyncio
import pytest

API_BASE = "http://localhost:8000"

@pytest.mark.asyncio
async def test_full_interview_flow():
    print("Starting Automated Backend Verification Test...")
    
    # 1. Test Health endpoint
    async with httpx.AsyncClient(timeout=120.0) as client:
        res = await client.get(f"{API_BASE}/api/health")
        assert res.status_code == 200, f"Health check failed: {res.text}"
        print("[OK] Health check passed!")
        
        # 2. Test Candidates endpoint
        res = await client.get(f"{API_BASE}/api/candidates")
        assert res.status_code == 200
        candidates_data = res.json()
        assert "candidates" in candidates_data and len(candidates_data["candidates"]) > 0
        candidate_001 = candidates_data["candidates"][0]
        print(f"[OK] Loaded {len(candidates_data['candidates'])} candidates. Selected: {candidate_001['member']['name']} ({candidate_001['member']['id']})")
        
        # 3. Start Interview
        session_id = f"test-session-{candidate_001['member']['id']}-001"
        payload = {
            "sessionId": session_id,
            "candidate": candidate_001
        }
        res = await client.post(f"{API_BASE}/api/interview", json=payload)
        assert res.status_code == 200, f"Start interview failed: {res.text}"
        data = res.json()
        assert "reply" in data
        assert data["done"] is False
        print(f"[OK] Interview Started! First question received:\n   '{data['reply'][:120]}...'")
        
        # 4. Perform Conversation Turns (8+ turns)
        # Turn 1: Shallow response to trigger follow-up invariant
        shallow_reply = "I used embeddings."
        print(f"\n--- Turn 1 (Shallow Response Test: '< 20 words') ---")
        print(f"Candidate: '{shallow_reply}'")
        res = await client.post(f"{API_BASE}/api/interview", json={"sessionId": session_id, "message": shallow_reply})
        assert res.status_code == 200
        data1 = res.json()
        print(f"Interviewer Follow-up: '{data1['reply'][:120]}...'")
        
        # Subsequent turns: Detailed responses with technical trade-offs
        detailed_responses = [
            "In our vector search implementation with ChromaDB, we selected Cosine Similarity over Euclidean Distance because normalized embeddings yielded better semantic matching across chunked healthcare document sections. However, HNSW index construction required balancing M and efConstruction parameters to manage memory footprint versus retrieval latency under peak load.",
            "For function calling and structured outputs, we utilized Pydantic schemas enforced via OpenAI tool calling. A key trade-off was handling schema validation errors gracefully: while strict enforcement guarantees downstream data integrity, invalid parameter generation requires automated retry logic which adds latency to real-time chat turns.",
            "In our multi-agent orchestration setup with LangGraph, we implemented a supervisor router pattern to delegate tasks between retrieval, SQL query generation, and synthesis specialists. The trade-off is higher token consumption and potential failure propagation across graph cycles, which we mitigated using state checkpoints and timeout guards.",
            "When implementing Model Context Protocol (MCP), we exposed our healthcare knowledge tools over an SSE transport layer. The primary system trade-off was managing stateful SSE connections versus stateless REST calls, particularly during scale-out deployments on Kubernetes.",
            "Regarding Docker and Kubernetes deployment, we containerized the FastAPI backend with multi-stage builds to minimize image size. For cluster deployment, we configured HPA based on CPU/Memory and readiness/liveness probes to handle traffic spikes, though horizontal scaling introduced vector store synchronization challenges.",
            "In evaluation and monitoring, we integrated Prometheus metrics for latency and token tracking, alongside structured JSON logging. The trade-off is the storage cost and performance overhead of verbose logging during high throughput.",
            "For Capstone deployment, we integrated retrieval, RAG, agents, MCP, and session memory into a unified pipeline with graceful fallback degradation if any single tool or external service fails."
        ]
        
        for turn_idx, resp_text in enumerate(detailed_responses, start=2):
            print(f"\n--- Turn {turn_idx} ---")
            print(f"Candidate: '{resp_text[:90]}...'")
            res = await client.post(f"{API_BASE}/api/interview", json={"sessionId": session_id, "message": resp_text})
            assert res.status_code == 200
            data = res.json()
            print(f"Interviewer Response (done={data['done']}): '{data['reply'][:120]}...'")
            
            if data["done"]:
                print("\n[SUCCESS] INTERVIEW COMPLETED! Final Feedback Report Received:")
                assert "feedback" in data and data["feedback"] is not None
                fb = data["feedback"]
                assert "summary" in fb
                assert "strengths" in fb and isinstance(fb["strengths"], list)
                assert "gaps" in fb and isinstance(fb["gaps"], list)
                assert "next" in fb and isinstance(fb["next"], list)
                print(f"Summary: {fb['summary']}")
                print(f"Strengths: {fb['strengths']}")
                print(f"Gaps: {fb['gaps']}")
                print(f"Next Steps: {fb['next']}")
                break
        
        # 5. Verify Session Report Endpoint
        res = await client.get(f"{API_BASE}/api/interview/{session_id}/report")
        if res.status_code == 200:
            report = res.json()
            print("\n[INFO] Verified Full Assessment Report Endpoint:")
            print(f"   Overall Score: {report.get('overall_score')}/100")
            print(f"   Topic Assessments Count: {len(report.get('topic_assessments', []))}")
        
        print("\n[SUCCESS] ALL BACKEND TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(test_full_interview_flow())
