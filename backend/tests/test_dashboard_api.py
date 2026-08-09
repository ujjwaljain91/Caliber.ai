import asyncio
import httpx
import pytest

API_BASE = "http://localhost:8000"

@pytest.mark.asyncio
async def test_candidate_dashboard_endpoint():
    print("Testing Candidate Dashboard API Endpoint...")
    async with httpx.AsyncClient(timeout=10.0) as client:
        # Test candidate CAND-001
        res = await client.get(f"{API_BASE}/api/candidates/CAND-001/dashboard")
        assert res.status_code == 200, f"Dashboard API failed: {res.text}"
        data = res.json()
        
        # Verify required keys
        assert "candidate" in data
        assert "readiness_score" in data
        assert "completed_curriculum_days" in data
        assert "competency_matrix" in data
        assert "cognitive_profile" in data
        assert "session_history" in data
        
        # Check competency matrix
        matrix = data["competency_matrix"]
        assert isinstance(matrix, list) and len(matrix) >= 5
        for mod in matrix:
            assert "module_id" in mod
            assert "title" in mod
            assert "status" in mod
            assert "score" in mod
            assert "key_skills" in mod
            
        # Check Breeth cognitive profile
        cog = data["cognitive_profile"]
        assert "summary" in cog
        assert "strengths" in cog and len(cog["strengths"]) > 0
        assert "knowledge_gaps" in cog
        assert "reasoning_patterns" in cog
        
        # Check session history
        history = data["session_history"]
        assert isinstance(history, list) and len(history) > 0
        assert "session_id" in history[0]
        assert "questions_asked" in history[0]
        assert "covered_days" in history[0]
        
        print("[SUCCESS] Candidate Dashboard API returns complete JSON schema!")

if __name__ == "__main__":
    asyncio.run(test_candidate_dashboard_endpoint())
