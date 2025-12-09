"""GitHub API Client - proxies operations to external code-generation-platform."""
import httpx
from typing import List, Dict, Any, Optional


class GitHubApiClient:
    """Client for GitHub operations via external API proxy."""
    
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def create_repository(
        self,
        owner: str,
        name: str,
        description: str,
        is_private: bool = False
    ) -> Dict[str, Any]:
        """Create a new GitHub repository."""
        try:
            response = await self.client.post(
                f"{self.base_url}/create-repo",
                json={
                    "owner": owner,
                    "name": name,
                    "description": description,
                    "isPrivate": is_private
                }
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            raise Exception(f"Failed to create repository: {str(e)}")
    
    async def create_branch(
        self,
        owner: str,
        repo: str,
        branch_name: str,
        source_branch: str = "main"
    ) -> Dict[str, Any]:
        """Create a new branch."""
        try:
            response = await self.client.post(
                f"{self.base_url}/create-branch",
                json={
                    "owner": owner,
                    "repo": repo,
                    "branchName": branch_name,
                    "sourceBranch": source_branch
                }
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            raise Exception(f"Failed to create branch: {str(e)}")
    
    async def push_changes(
        self,
        owner: str,
        repo: str,
        commit_message: str,
        files: List[Dict[str, str]],
        branch: str = "main",
        parent_branch: str = "main"
    ) -> Dict[str, Any]:
        """Push changes to a repository."""
        try:
            response = await self.client.post(
                f"{self.base_url}/push-changes",
                json={
                    "owner": owner,
                    "repo": repo,
                    "commitMessage": commit_message,
                    "files": files,
                    "branch": branch,
                    "parentBranch": parent_branch
                }
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            raise Exception(f"Failed to push changes: {str(e)}")
    
    async def create_pull_request(
        self,
        owner: str,
        repo: str,
        title: str,
        body: str,
        head: str,
        base: str = "main"
    ) -> Dict[str, Any]:
        """Create a pull request."""
        try:
            response = await self.client.post(
                f"{self.base_url}/create-pull-request",
                json={
                    "owner": owner,
                    "repo": repo,
                    "title": title,
                    "body": body,
                    "head": head,
                    "base": base
                }
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            raise Exception(f"Failed to create pull request: {str(e)}")
    
    async def get_repository(self, owner: str, repo: str) -> Dict[str, Any]:
        """Get repository information."""
        try:
            response = await self.client.get(
                f"{self.base_url}/repository",
                params={"owner": owner, "repo": repo}
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            raise Exception(f"Failed to get repository: {str(e)}")
    
    async def get_contents(
        self,
        owner: str,
        repo: str,
        path: str = "",
        ref: str = "main"
    ) -> Dict[str, Any]:
        """Get repository contents."""
        try:
            response = await self.client.get(
                f"{self.base_url}/contents",
                params={"owner": owner, "repo": repo, "path": path, "ref": ref}
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            raise Exception(f"Failed to get contents: {str(e)}")
    
    async def download_repository(
        self,
        owner: str,
        repo: str,
        ref: str = "main"
    ) -> bytes:
        """Download repository as zip buffer."""
        try:
            response = await self.client.get(
                f"{self.base_url}/download-repo",
                params={"owner": owner, "repo": repo, "ref": ref}
            )
            response.raise_for_status()
            return response.content
        except httpx.HTTPError as e:
            raise Exception(f"Failed to download repository: {str(e)}")
    
    async def get_branches(self, owner: str, repo: str) -> Dict[str, Any]:
        """Get branches."""
        try:
            response = await self.client.get(
                f"{self.base_url}/branches",
                params={"owner": owner, "repo": repo}
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            raise Exception(f"Failed to get branches: {str(e)}")
    
    async def check_installation_status(self, owner: str) -> Dict[str, Any]:
        """Check installation status."""
        try:
            response = await self.client.get(
                f"{self.base_url}/user-installation-status",
                params={"owner": owner}
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            raise Exception(f"Failed to check installation status: {str(e)}")
    
    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()
