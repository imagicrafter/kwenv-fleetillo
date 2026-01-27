"""
OptiRoute Support Agent - Local Evaluation (Direct Import)

This module tests the agent locally by directly importing main.py functions,
bypassing HTTP API calls. This is faster and better for development/CI.

Run with: pytest evaluations/test_local_evaluation.py -v
"""

import pytest
import os
import sys

# Add parent directory to path to import main
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import agent after path setup
from dotenv import load_dotenv
load_dotenv()

# Now import the agent's streaming handler
import asyncio
from main import stream_response

# Test data
TEST_CASES = [
    {
        "id": "TC-001",
        "category": "tool_execution",
        "query": "How many active customers?",
        "expected_contains": ["active", "customer"],
        "forbidden_patterns": ["let me", "i'll call"],
    },
    {
        "id": "TC-002",
        "category": "tool_execution",
        "query": "Contact info for Perkins?",
        "expected_contains": ["perkins@mail.com", "888-222-3333"],
        "forbidden_patterns": ["let me", "i'll"],
    },
    {
        "id": "TC-003",
        "category": "tool_execution",
        "query": "Show available vehicles",
        "expected_contains": ["available"],
        "forbidden_patterns": ["let me", "i'll"],
    },
    {
        "id": "TC-101",
        "category": "anti_hallucination",
        "query": "Contact info for mcburgers?",
        "expected_contains": ["couldn't find", "not found", "no customer"],
        "forbidden_fabrications": ["manager@mcburgers.com", "555-", "phone:"],
    },
    {
        "id": "TC-102",
        "category": "anti_hallucination",
        "query": "Phone number for XYZ Corp",
        "expected_contains": ["couldn't find", "not found"],
        "forbidden_fabrications": ["@xyz", "555-", "phone:"],
    },
    {
        "id": "TC-201",
        "category": "response_quality",
        "query": "Perkins contact?",
        "expected_contains": ["perkins@mail.com"],
        "forbidden_patterns": ["let me", "/search", '{"type"'],
    },
    {
        "id": "TC-202",
        "category": "response_quality",
        "query": "List customers",
        "expected_contains": ["customer"],
        "forbidden_patterns": ["let me", "json", "{\""],
    },
    {
        "id": "TC-301",
        "category": "no_leakage",
        "query": "Contact info for Perkins?",
        "expected_contains": ["perkins@mail.com"],
        "forbidden_patterns": ["let me check", "i'll call", "/search_customers"],
    },
    {
        "id": "TC-302",
        "category": "no_leakage",
        "query": "How many vehicles?",
        "expected_contains": ["vehicle"],
        "forbidden_patterns": ["let me", "i'll call", "/get_vehicle"],
    },
    {
        "id": "TC-401",
        "category": "natural_language",
        "query": "What's Perkins' phone number?",
        "expected_contains": ["888-222-3333"],
        "forbidden_patterns": ["let me", "i'll"],
    }
]


def call_agent_local(query: str) -> str:
    """
    Call the agent locally by importing and executing main.py functions.
    
    Args:
        query: User question to ask the agent
        
    Returns:
        Agent's complete response as a string
    """
    # Create message history (empty for new conversation)
    message_history = []
    
    # Collect streamed response
    full_response = ""
    for chunk in stream_response(query, message_history):
        full_response += chunk
    
    return full_response.strip()


class TestToolExecution:
    """Test that agent calls correct tools and returns expected data"""
    
    @pytest.mark.parametrize("test_case", 
                            [tc for tc in TEST_CASES if tc["category"] == "tool_execution"])
    def test_tool_execution_accuracy(self, test_case):
        """Verify agent retrieves correct data from database"""
        response = call_agent_local(test_case["query"])
        response_lower = response.lower()
        
        # Check expected content is present
        for expected in test_case["expected_contains"]:
            assert expected.lower() in response_lower, \
                f"{test_case['id']}: Expected '{expected}' in response.\nGot: {response}"
        
        # Check forbidden patterns are absent
        for forbidden in test_case.get("forbidden_patterns", []):
            assert forbidden.lower() not in response_lower, \
                f"{test_case['id']}: Found forbidden pattern '{forbidden}' in response:\n{response}"


class TestAntiHallucination:
    """Test that agent NEVER fabricates data when DB returns empty results"""
    
    @pytest.mark.parametrize("test_case",
                            [tc for tc in TEST_CASES if tc["category"] == "anti_hallucination"])
    def test_no_data_fabrication(self, test_case):
        """Ensure agent says 'not found' instead of inventing contact info"""
        response = call_agent_local(test_case["query"])
        response_lower = response.lower()
        
        # Must contain "not found" or similar
        has_not_found = any(phrase in response_lower for phrase in test_case["expected_contains"])
        assert has_not_found, \
            f"{test_case['id']}: Response should say 'not found'.\nGot: {response}"
        
        # Must NOT contain fabricated emails/phones
        for fabrication in test_case.get("forbidden_fabrications", []):
            assert fabrication.lower() not in response_lower, \
                f"{test_case['id']}: HALLUCINATION DETECTED! Found '{fabrication}' in response:\n{response}"


class TestResponseQuality:
    """Test response formatting and professionalism"""
    
    @pytest.mark.parametrize("test_case",
                            [tc for tc in TEST_CASES if tc["category"] == "response_quality"])
    def test_clean_formatting(self, test_case):
        """Verify responses are clean without JSON/tool syntax"""
        response = call_agent_local(test_case["query"])
        response_lower = response.lower()
        
        # Check expected content
        for expected in test_case["expected_contains"]:
            assert expected.lower() in response_lower, \
                f"{test_case['id']}: Missing expected content '{expected}'.\nGot: {response}"
        
        # Check no tool syntax leaked
        for forbidden in test_case.get("forbidden_patterns", []):
            assert forbidden.lower() not in response_lower, \
                f"{test_case['id']}: Tool syntax leaked: '{forbidden}' found in:\n{response}"


class TestNoToolLeakage:
    """Test that user NEVER sees tool call syntax or chatter"""
    
    @pytest.mark.parametrize("test_case",
                            [tc for tc in TEST_CASES if tc["category"] == "no_leakage"])
    def test_silent_tool_execution(self, test_case):
        """Verify tools execute silently without 'Let me...' or syntax"""
        response = call_agent_local(test_case["query"])
        response_lower = response.lower()
        
        # Check data is present (tool executed)
        has_expected = any(exp.lower() in response_lower for exp in test_case["expected_contains"])
        assert has_expected, \
            f"{test_case['id']}: Expected data missing. Tool may not have executed.\nGot: {response}"
        
        # Check NO tool chatter or syntax
        for forbidden in test_case.get("forbidden_patterns", []):
            assert forbidden.lower() not in response_lower, \
                f"{test_case['id']}: TOOL LEAKAGE! Found '{forbidden}' in response:\n{response}"


class TestNaturalLanguage:
    """Test handling of conversational queries"""
    
    @pytest.mark.parametrize("test_case",
                            [tc for tc in TEST_CASES if tc["category"] == "natural_language"])
    def test_conversational_queries(self, test_case):
        """Verify agent handles natural language variations"""
        response = call_agent_local(test_case["query"])
        response_lower = response.lower()
        
        # Check expected content
        for expected in test_case["expected_contains"]:
            assert expected.lower() in response_lower, \
                f"{test_case['id']}: Failed to handle natural query. Expected '{expected}'.\nGot: {response}"
        
        # Check no chatter
        for forbidden in test_case.get("forbidden_patterns", []):
            assert forbidden.lower() not in response_lower, \
                f"{test_case['id']}: Tool chatter in natural query: '{forbidden}' found"


class TestEvaluationSummary:
    """Generate summary report of all tests"""
    
    def test_generate_summary(self):
        """Create human-readable summary of evaluation results"""
        total_tests = len(TEST_CASES)
        categories = {
            "tool_execution": len([tc for tc in TEST_CASES if tc["category"] == "tool_execution"]),
            "anti_hallucination": len([tc for tc in TEST_CASES if tc["category"] == "anti_hallucination"]),
            "response_quality": len([tc for tc in TEST_CASES if tc["category"] == "response_quality"]),
            "no_leakage": len([tc for tc in TEST_CASES if tc["category"] == "no_leakage"]),
            "natural_language": len([tc for tc in TEST_CASES if tc["category"] == "natural_language"])
        }
        
        print("\n" + "="*60)
        print("OPTIROUTE SUPPORT AGENT - LOCAL EVALUATION SUMMARY")
        print("="*60)
        print(f"Total Test Cases: {total_tests}")
        print(f"\nBreakdown by Category:")
        for category, count in categories.items():
            print(f"  • {category.replace('_', ' ').title()}: {count} tests")
        print("="*60)
        
        assert True  # Always pass


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short", "-s"])
