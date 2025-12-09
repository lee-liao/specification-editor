"""Claude Task API Client."""
import httpx
from typing import Dict, Any, Optional

class ClaudeTaskClient:
    """Client for interactions with the Claude Task API."""
    
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self.client = httpx.AsyncClient(timeout=60.0)
    
    async def create_task(
        self,
        repo_url: str,
        prompt: str,
        task_type: str = "feature-implementation",
        max_turns: int = 25
    ) -> Dict[str, Any]:
        """Kick off a new task process."""
        try:
            response = await self.client.post(
                f"{self.base_url}/tasks",
                json={
                    "taskType": task_type,
                    "repoUrl": repo_url,
                    "prompt": prompt,
                    "maxTurns": max_turns
                }
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            raise Exception(f"Failed to create task: {str(e)}")
            
    async def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """Get the status of a specific task."""
        try:
            response = await self.client.get(f"{self.base_url}/tasks/{task_id}")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            raise Exception(f"Failed to get task status: {str(e)}")
            
    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()
