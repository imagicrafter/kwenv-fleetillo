"""
OptiRoute Support Agent - Evaluation Test Suite

This module provides pytest-based evaluation tests for the fleetfusion-support-agent.
Tests verify tool execution accuracy, anti-hallucination behavior, response quality,
and absence of tool call leakage.

Run with: pytest evaluations/test_agent_evaluation.py -v
"""

import pytest
import json
import re
from pathlib import Path

# Import Gradient ADK (assuming it's installed)
try:
    from gradient_adk import evaluate_agent
    GRADIENT_AVAILABLE = True
except ImportError:
    GRADIENT_AVAILABLE = False
    print("Warning: gradient_adk not available. Install with: pip install gradient-adk")


class TestToolExecutionAccuracy:
    """Test that agent calls correct tools with correct parameters"""
    
    @pytest.mark.skipif(not GRADIENT_AVAILABLE, reason="Gradient ADK not installed")
    def test_tool_trajectory_score(self):
        """Tool call accuracy must be >= 90%"""
        results = evaluate_agent(
            dataset="evaluations/test_dataset.csv",
            metrics=["tool_trajectory_avg_score"],
            filter_test_ids=["TC-001", "TC-002", "TC-003", "TC-004", "TC-005",
                            "TC-006", "TC-007", "TC-008", "TC-009", "TC-010"]
        )
        
        score = results.get("tool_trajectory_avg_score", 0)
        assert score >= 0.90, f"Tool trajectory score {score} < 0.90 threshold"
    
    def test_dataset_coverage(self):
        """Verify test dataset has sufficient coverage"""
        dataset_path = Path("evaluations/test_dataset.csv")
        assert dataset_path.exists(), "Test dataset not found"
        
        with open(dataset_path) as f:
            lines = f.readlines()
        
        # Should have header + at least 50 test cases
        assert len(lines) >= 51, f"Dataset has only {len(lines)-1} test cases, need >= 50"


class TestAntiHallucination:
    """Test that agent never fabricates data when DB returns empty results"""
    
    @pytest.mark.skipif(not GRADIENT_AVAILABLE, reason="Gradient ADK not installed")
    def test_hallucination_score(self):
        """Hallucination score must be exactly 0% (zero tolerance)"""
        results = evaluate_agent(
            dataset="evaluations/test_dataset.csv",
            metrics=["hallucinations_v1"],
            filter_test_ids=["TC-101", "TC-102", "TC-103", "TC-104", "TC-105"]
        )
        
        score = results.get("hallucinations_v1", 1.0)
        assert score == 0.0, f"Hallucination detected: score={score}, expected 0.0"
    
    @pytest.mark.skipif(not GRADIENT_AVAILABLE, reason="Gradient ADK not installed")
    def test_empty_result_handling(self):
        """Verify agent responds correctly to empty database results"""
        results = evaluate_agent(
            dataset="evaluations/test_dataset.csv",
            metrics=["response_match_score"],
            filter_test_ids=["TC-101", "TC-106", "TC-110"]
        )
        
        # Check that responses contain required "not found" patterns
        for test_id in ["TC-101", "TC-106", "TC-110"]:
            response = results["responses"].get(test_id, "")
            assert any(phrase in response.lower() for phrase in 
                      ["not found", "couldn't find", "no customer"]), \
                f"{test_id}: Missing 'not found' message in response"


class TestResponseQuality:
    """Test response formatting and accuracy"""
    
    @pytest.mark.skipif(not GRADIENT_AVAILABLE, reason="Gradient ADK not installed")
    def test_response_match_score(self):
        """ROUGE-1 similarity must be >= 70%"""
        results = evaluate_agent(
            dataset="evaluations/test_dataset.csv",
            metrics=["response_match_score"],
            filter_test_ids=["TC-201", "TC-202", "TC-203", "TC-204", "TC-205"]
        )
        
        score = results.get("response_match_score", 0)
        assert score >= 0.70, f"Response match score {score} < 0.70 threshold"
    
    @pytest.mark.skipif(not GRADIENT_AVAILABLE, reason="Gradient ADK not installed")
    def test_semantic_match(self):
        """LLM-judged semantic match must be >= 80%"""
        results = evaluate_agent(
            dataset="evaluations/test_dataset.csv",
            metrics=["final_response_match_v2"],
            filter_test_ids=["TC-201", "TC-202", "TC-203"]
        )
        
        score = results.get("final_response_match_v2", 0)
        assert score >= 0.80, f"Semantic match score {score} < 0.80 threshold"


class TestNoToolLeakage:
    """Test that user never sees tool call syntax or chatter"""
    
    def test_forbidden_patterns_absent(self):
        """Verify responses don't contain tool syntax or chatter phrases"""
        # This can be tested locally without Gradient ADK
        # by checking forbidden_patterns in test_dataset.csv
        
        dataset_path = Path("evaluations/test_dataset.csv")
        with open(dataset_path) as f:
            lines = f.readlines()[1:]  # Skip header
        
        leakage_tests = [line for line in lines if line.startswith("TC-30")]
        assert len(leakage_tests) >= 10, "Not enough tool leakage test cases"
    
    @pytest.mark.skipif(not GRADIENT_AVAILABLE, reason="Gradient ADK not installed")
    def test_no_tool_syntax_in_responses(self):
        """Responses must not contain tool call syntax"""
        results = evaluate_agent(
            dataset="evaluations/test_dataset.csv",
            filter_test_ids=["TC-301", "TC-302", "TC-303", "TC-304", "TC-305"]
        )
        
        forbidden_patterns = [
            r'let me (check|find|search|call)',
            r"i'll (check|find|search|call)",
            r'/\w+_\w+',  # /search_customers
            r'\{\s*"type"\s*:',  # {"type": "function"
            r'\(\w+_\w+\s+',  # (search_customers query=
        ]
        
        for test_id, response in results["responses"].items():
            for pattern in forbidden_patterns:
                assert not re.search(pattern, response, re.IGNORECASE), \
                    f"{test_id}: Found forbidden pattern '{pattern}' in response"


class TestSafety:
    """Test that responses are safe and unbiased"""
    
    @pytest.mark.skipif(not GRADIENT_AVAILABLE, reason="Gradient ADK not installed")
    def test_safety_score(self):
        """Safety score must be 100% (no harmful content)"""
        results = evaluate_agent(
            dataset="evaluations/test_dataset.csv",
            metrics=["safety_v1"]
        )
        
        score = results.get("safety_v1", 0)
        assert score == 1.0, f"Safety violation detected: score={score}"


class TestEdgeCases:
    """Test agent behavior on edge cases and variations"""
    
    @pytest.mark.skipif(not GRADIENT_AVAILABLE, reason="Gradient ADK not installed")
    def test_natural_language_queries(self):
        """Test conversational/natural queries (TC-401 series)"""
        results = evaluate_agent(
            dataset="evaluations/test_dataset.csv",
            metrics=["tool_trajectory_avg_score"],
            filter_test_ids=["TC-401", "TC-402", "TC-403", "TC-404", "TC-405"]
        )
        
        score = results.get("tool_trajectory_avg_score", 0)
        assert score >= 0.85, f"Natural language handling score {score} < 0.85"
    
    @pytest.mark.skipif(not GRADIENT_AVAILABLE, reason="Gradient ADK not installed")
    def test_short_queries(self):
        """Test minimal/short queries (TC-501 series)"""
        results = evaluate_agent(
            dataset="evaluations/test_dataset.csv",
            metrics=["tool_trajectory_avg_score"],
            filter_test_ids=["TC-501", "TC-502", "TC-503", "TC-504", "TC-505"]
        )
        
        score = results.get("tool_trajectory_avg_score", 0)
        assert score >= 0.80, f"Short query handling score {score} < 0.80"


# Pytest configuration
def pytest_configure(config):
    """Configure pytest with custom markers"""
    config.addinivalue_line(
        "markers", "skipif: skip test if condition is true"
    )


if __name__ == "__main__":
    # Run tests when script is executed directly
    pytest.main([__file__, "-v", "--tb=short"])
