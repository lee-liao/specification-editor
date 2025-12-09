"""Anthropic Claude API service for AI suggestions."""
import json
import re
from typing import List, Dict, Any
from uuid import uuid4
from anthropic import Anthropic


class AnthropicService:
    """Service for generating AI suggestions using Claude."""
    
    def __init__(self, api_key: str):
        self.client = Anthropic(api_key=api_key)
        self.model = "claude-sonnet-4-20250514"
    
    async def generate_suggestions(
        self,
        spec_content: str,
        project_name: str = ""
    ) -> List[Dict[str, str]]:
        """Generate AI suggestions for a specification."""
        try:
            message = self.client.messages.create(
                model=self.model,
                max_tokens=2048,
                messages=[
                    {
                        "role": "user",
                        "content": f"""You are an expert software architect reviewing an OpenSpec specification.

Please analyze this specification and provide 2-3 specific suggestions to improve it. Focus on:
1. Clarity and completeness
2. Testability
3. Edge cases that should be considered
4. Potential implementation challenges

Specification content:
{spec_content}

Respond with a JSON array of suggestions, each with "id" and "content" fields."""
                    }
                ]
            )
            
            # Parse the response
            response_text = message.content[0].text
            
            # Try to extract JSON from the response
            json_match = re.search(r'\[[\s\S]*\]', response_text)
            if json_match:
                suggestions = json.loads(json_match.group(0))
                # Ensure each suggestion has an ID
                for suggestion in suggestions:
                    if 'id' not in suggestion:
                        suggestion['id'] = str(uuid4())
                return suggestions
            
            # Fallback: create suggestions from the text
            return [
                {
                    "id": str(uuid4()),
                    "content": response_text
                }
            ]
            
        except Exception as e:
            print(f"Error calling Claude API: {e}")
            # Return placeholder suggestions if API fails
            return [
                {
                    "id": str(uuid4()),
                    "content": "Consider adding more specific acceptance criteria for this feature."
                },
                {
                    "id": str(uuid4()),
                    "content": "Add error handling scenarios to make the specification more robust."
                }
            ]
