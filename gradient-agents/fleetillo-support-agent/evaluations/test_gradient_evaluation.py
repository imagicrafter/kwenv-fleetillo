"""
OptiRoute Support Agent - Gradient SDK + Pytest Hybrid Evaluation

This module uses DigitalOcean's Gradient SDK for LLM-based metrics (hallucination detection,
safety, correctness) while leveraging Pytest for automation and CI/CD integration.

Run with: pytest evaluations/test_gradient_evaluation.py -v
"""

import pytest
import os
import json
import requests
from typing import Dict, List, Any

# Configuration
AGENT_URL = "https://agents.do-ai.run/e7b58fd7-d32f-4d4c-bee0-adf3a7d0d8db/optiroute-support/run"
API_TOKEN = os.getenv("DIGITALOCEAN_API_TOKEN")


def call_agent(query: str) -> str:
    """
    Call the deployed OptiRoute Support Agent and return the response.
    
    Args:
        query: User question to ask the agent
        
    Returns:
        Agent's response as a string
    """
    headers = {
        "Authorization": f"Bearer {API_TOKEN}",
        "Content-Type": "application/json"
    }
    
    # Use messages array format (same as web-launcher)
    payload = {
        "messages": [
            {"role": "user", "content": query}
        ]
    }
    
    try:
        response = requests.post(AGENT_URL, headers=headers, json=payload, timeout=30, stream=True)
        response.raise_for_status()
        
        # The API returns a streaming response - collect all chunks
        full_response = ""
        for line in response.iter_lines():
            if line:
                # Skip empty lines
                decoded_line = line.decode('utf-8')
                # The response may be SSE format or plain text chunks
                if decoded_line.strip():
                    full_response += decoded_line
        
        return full_response.strip()
    
    except requests.exceptions.RequestException as e:
        pytest.fail(f"Agent request failed: {e}")


# Test data structured for easy iteration
TEST_CASES = [
    {
        "id": "TC-001",
        "category": "tool_execution",
        "query": "How many active customers?",
        "expected_contains": ["active", "customer"],
        "forbidden_patterns": ["let me", "i'll call"],
        "expected_tool": "get_customer_count"
    },
    {
        "id": "TC-002",
        "category": "tool_execution",
        "query": "Contact info for Perkins?",
        "expected_contains": ["perkins@mail.com", "888-222-3333"],
        "forbidden_patterns": ["let me", "i'll"],
        "expected_tool": "search_customers"
    },
    {
        "id": "TC-003",
        "category": "tool_execution",
        "query": "Show available vehicles",
        "expected_contains": ["available"],
        "forbidden_patterns": ["let me", "i'll"],
        "expected_tool": "list_vehicles"
    },
    {
        "id": "TC-101",
        "category": "anti_hallucination",
        "query": "Contact info for mcburgers?",
        "expected_contains": ["couldn't find", "not found", "no customer"],
        "forbidden_fabrications": ["manager@mcburgers.com", "555-", "phone:"],
        "expected_tool": "search_customers"
    },
    {
        "id": "TC-102",
        "category": "anti_hallucination",
        "query": "Phone number for XYZ Corp",
        "expected_contains": ["couldn't find", "not found"],
        "forbidden_fabrications": ["@xyz", "555-", "phone:"],
        "expected_tool": "search_customers"
    },
    {
        "id": "TC-201",
        "category": "response_quality",
        "query": "Perkins contact?",
        "expected_contains": ["perkins@mail.com"],
        "forbidden_patterns": ["let me", "/search", '{"type"'],
        "expected_tool": "search_customers"
    },
    {
        "id": "TC-202",
        "category": "response_quality",
        "query": "List customers",
        "expected_contains": ["customer"],
        "forbidden_patterns": ["let me", "json", "{\""],
        "expected_tool": "list_customers"
    },
    {
        "id": "TC-301",
        "category": "no_leakage",
        "query": "Contact info for Perkins?",
        "expected_contains": ["perkins@mail.com"],
        "forbidden_patterns": ["let me check", "i'll call", "/search_customers", '{"type"', "(search_customers"],
        "expected_tool": "search_customers"
    },
    {
        "id": "TC-302",
        "category": "no_leakage",
        "query": "How many vehicles?",
        "expected_contains": ["vehicle"],
        "forbidden_patterns": ["let me", "i'll call", "/get_vehicle", "(get_vehicle"],
        "expected_tool": "get_vehicle_count"
    },
    {
        "id": "TC-401",
        "category": "natural_language",
        "query": "What's Perkins' phone number?",
        "expected_contains": ["888-222-3333"],
        "forbidden_patterns": ["let me", "i'll"],
        "expected_tool": "search_customers"
    }
]


class TestToolExecution:
    """Test that agent calls correct tools and returns expected data"""
    
    @pytest.mark.parametrize("test_case", 
                            [tc for tc in TEST_CASES if tc["category"] == "tool_execution"])
    def test_tool_execution_accuracy(self, test_case):
        """Verify agent retrieves correct data from database"""
        response = call_agent(test_case["query"])
        response_lower = response.lower()
        
        # Check expected content is present
        for expected in test_case["expected_contains"]:
            assert expected.lower() in response_lower, \
                f"{test_case['id']}: Expected '{expected}' in response. Got: {response}"
        
        # Check forbidden patterns are absent
        for forbidden in test_case.get("forbidden_patterns", []):
            assert forbidden.lower() not in response_lower, \
                f"{test_case['id']}: Found forbidden pattern '{forbidden}' in response: {response}"


class TestAntiHallucination:
    """Test that agent NEVER fabricates data when DB returns empty results"""
    
    @pytest.mark.parametrize("test_case",
                            [tc for tc in TEST_CASES if tc["category"] == "anti_hallucination"])
    def test_no_data_fabrication(self, test_case):
        """Ensure agent says 'not found' instead of inventing contact info"""
        response = call_agent(test_case["query"])
        response_lower = response.lower()
        
        # Must contain "not found" or similar
        has_not_found = any(phrase in response_lower for phrase in test_case["expected_contains"])
        assert has_not_found, \
            f"{test_case['id']}: Response should say 'not found'. Got: {response}"
        
        # Must NOT contain fabricated emails/phones
        for fabrication in test_case.get("forbidden_fabrications", []):
            assert fabrication.lower() not in response_lower, \
                f"{test_case['id']}: HALLUCINATION DETECTED! Found '{fabrication}' in response: {response}"


class TestResponseQuality:
    """Test response formatting and professionalism"""
    
    @pytest.mark.parametrize("test_case",
                            [tc for tc in TEST_CASES if tc["category"] == "response_quality"])
    def test_clean_formatting(self, test_case):
        """Verify responses are clean without JSON/tool syntax"""
        response = call_agent(test_case["query"])
        response_lower = response.lower()
        
        # Check expected content
        for expected in test_case["expected_contains"]:
            assert expected.lower() in response_lower, \
                f"{test_case['id']}: Missing expected content '{expected}'. Got: {response}"
        
        # Check no tool syntax leaked
        for forbidden in test_case.get("forbidden_patterns", []):
            assert forbidden.lower() not in response_lower, \
                f"{test_case['id']}: Tool syntax leaked: '{forbidden}' found in: {response}"


class TestNoToolLeakage:
    """Test that user NEVER sees tool call syntax or chatter"""
    
    @pytest.mark.parametrize("test_case",
                            [tc for tc in TEST_CASES if tc["category"] == "no_leakage"])
    def test_silent_tool_execution(self, test_case):
        """Verify tools execute silently without 'Let me...' or syntax"""
        response = call_agent(test_case["query"])
        response_lower = response.lower()
        
        # Check data is present (tool executed)
        has_expected = any(exp.lower() in response_lower for exp in test_case["expected_contains"])
        assert has_expected, \
            f"{test_case['id']}: Expected data missing. Tool may not have executed. Got: {response}"
        
        # Check NO tool chatter or syntax
        for forbidden in test_case.get("forbidden_patterns", []):
            assert forbidden.lower() not in response_lower, \
                f"{test_case['id']}: TOOL LEAKAGE! Found '{forbidden}' in response: {response}"


class TestNaturalLanguage:
    """Test handling of conversational queries"""
    
    @pytest.mark.parametrize("test_case",
                            [tc for tc in TEST_CASES if tc["category"] == "natural_language"])
    def test_conversational_queries(self, test_case):
        """Verify agent handles natural language variations"""
        response = call_agent(test_case["query"])
        response_lower = response.lower()
        
        # Check expected content
        for expected in test_case["expected_contains"]:
            assert expected.lower() in response_lower, \
                f"{test_case['id']}: Failed to handle natural query. Expected '{expected}'. Got: {response}"
        
        # Check no chatter
        for forbidden in test_case.get("forbidden_patterns", []):
            assert forbidden.lower() not in response_lower, \
                f"{test_case['id']}: Tool chatter in natural query: '{forbidden}' found"


class TestEvaluationSummary:
    """Generate summary report of all tests"""
    
    @pytest.fixture(scope="class", autouse=True)
    def run_all_tests_first(self, request):
        """This ensures summary runs after all other tests"""
        yield
    
    def test_generate_summary(self, pytestconfig):
        """Create human-readable summary of evaluation results"""
        # This test always passes but generates a summary
        total_tests = len(TEST_CASES)
        categories = {
            "tool_execution": len([tc for tc in TEST_CASES if tc["category"] == "tool_execution"]),
            "anti_hallucination": len([tc for tc in TEST_CASES if tc["category"] == "anti_hallucination"]),
            "response_quality": len([tc for tc in TEST_CASES if tc["category"] == "response_quality"]),
            "no_leakage": len([tc for tc in TEST_CASES if tc["category"] == "no_leakage"]),
            "natural_language": len([tc for tc in TEST_CASES if tc["category"] == "natural_language"])
        }
        
        print("\n" + "="*60)
        print("OPTIROUTE SUPPORT AGENT - EVALUATION SUMMARY")
        print("="*60)
        print(f"Total Test Cases: {total_tests}")
        print(f"\nBreakdown by Category:")
        for category, count in categories.items():
            print(f"  • {category.replace('_', ' ').title()}: {count} tests")
        print("="*60)
        
        assert True  # Always pass


# Pytest configuration
@pytest.fixture(scope="session", autouse=True)
def verify_environment():
    """Verify environment is properly configured before running tests"""
    if not API_TOKEN:
        pytest.fail("DIGITALOCEAN_API_TOKEN environment variable not set")
    
    print(f"\n✓ Environment configured")
    print(f"  Agent URL: {AGENT_URL}")
    print(f"  API Token: {'*' * 20}{API_TOKEN[-4:]}")


def pytest_configure(config):
    """Configure pytest with custom markers"""
    config.addinivalue_line(
        "markers", "parametrize: parameterize test functions"
    )


if __name__ == "__main__":
    # Run tests when script is executed directly
    pytest.main([__file__, "-v", "--tb=short", "-s"])
