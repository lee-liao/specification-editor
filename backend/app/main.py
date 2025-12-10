"""Main FastAPI application."""
import asyncio
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Dict, Any
from uuid import uuid4

from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .models import (
    ProjectCreate, Project, SpecificationUpdate, SuggestionRequest,
    GenerateRequest, PullRequestCreate, HealthResponse, TaskStatus, Task
)
from .services.github_client import GitHubApiClient
from .services.anthropic_service import AnthropicService
from .services.openspec_service import OpenSpecService
from .services.claude_task_client import ClaudeTaskClient

# In-memory storage
user_sessions: Dict[str, Dict[str, Any]] = {}
task_manager: Dict[str, Dict[str, Any]] = {}

# Services
settings = get_settings()
github_client: GitHubApiClient = None
anthropic_service: AnthropicService = None
openspec_service: OpenSpecService = None
claude_task_client: ClaudeTaskClient = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    global github_client, anthropic_service, openspec_service, claude_task_client
    
    # Startup
    github_client = GitHubApiClient(settings.GITHUB_API_ENDPOINT)
    anthropic_service = AnthropicService(settings.ANTHROPIC_API_KEY)
    openspec_service = OpenSpecService("./temp")
    claude_task_client = ClaudeTaskClient(settings.CLAUDE_TASK_ENDPOINT)
    
    yield
    
    # Shutdown
    if github_client:
        await github_client.close()
    if claude_task_client:
        await claude_task_client.close()


app = FastAPI(
    title="OpenSpec Workflow API",
    description="API for managing OpenSpec files, generating AI suggestions, and triggering code generation",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================
# Helper Functions
# ============================================

def find_spec_in_tree(nodes: list, spec_id: str) -> Dict[str, Any] | None:
    """Find specification in tree by ID."""
    for node in nodes:
        if node.get("id") == spec_id:
            return node
        if node.get("children"):
            found = find_spec_in_tree(node["children"], spec_id)
            if found:
                return found
    return None


def update_spec_in_tree(nodes: list, spec_id: str, updates: Dict[str, Any]) -> bool:
    """Update specification in tree."""
    for node in nodes:
        if node.get("id") == spec_id:
            node.update(updates)
            return True
        if node.get("children"):
            if update_spec_in_tree(node["children"], spec_id, updates):
                return True
    return False


# ============================================
# Health Check
# ============================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        message="OpenSpec Workflow API is running!",
        githubApiEndpoint=settings.GITHUB_API_ENDPOINT
    )


# ============================================
# Project Management Routes
# ============================================

@app.post("/api/openspec/projects")
async def create_project(project: ProjectCreate):
    """Create a new OpenSpec project."""
    project_id = str(uuid4())
    
    project_data = {
        "id": project_id,
        "projectName": project.projectName,
        "description": project.description,
        "owner": project.owner,
        "repository": project.repository,
        "isPrivate": project.isPrivate,
        "specTree": [],
        "currentSpec": None,
        "createdAt": datetime.now().isoformat(),
        "updatedAt": datetime.now().isoformat()
    }
    
    user_sessions[project_id] = project_data
    
    return {
        "success": True,
        "projectId": project_id,
        "project": {
            "id": project_id,
            "projectName": project.projectName,
            "owner": project.owner,
            "repository": project.repository,
            "isPrivate": project.isPrivate
        }
    }


@app.get("/api/openspec/projects/{project_id}")
async def get_project(project_id: str):
    """Get project information."""
    project = user_sessions.get(project_id)
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return {"success": True, "project": project}


# ============================================
# File Upload Routes
# ============================================

@app.post("/api/openspec/projects/{project_id}/upload")
async def upload_openspec(project_id: str, openspecFile: UploadFile = File(...)):
    """Upload and validate OpenSpec file."""
    project = user_sessions.get(project_id)
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not openspecFile.filename.lower().endswith('.zip'):
        raise HTTPException(status_code=400, detail="File must be a .zip file")
    
    # Read file content
    content = await openspecFile.read()
    
    # Validate structure
    validation = openspec_service.validate_structure(content)
    print(f"DEBUG: Validation result for {openspecFile.filename}: {validation}")
    
    if not validation.get("isValid"):
        print(f"DEBUG: Validation failed: {validation}")
        raise HTTPException(
            status_code=400,
            detail=f"Invalid OpenSpec structure. Found: {validation}"
        )
    
    # Save file
    file_path = await openspec_service.save_uploaded_file(
        project_id,
        openspecFile.filename,
        content
    )
    
    # Extract content
    spec_content = openspec_service.extract_content(content)
    
    # Update project
    project["openspecFile"] = {
        "name": openspecFile.filename,
        "path": file_path,
        "uploadedAt": datetime.now().isoformat()
    }
    project["specTree"] = spec_content["specTree"]
    project["currentSpec"] = spec_content.get("rootSpec")
    project["updatedAt"] = datetime.now().isoformat()
    
    return {
        "success": True,
        "specContent": spec_content,
        "message": "OpenSpec file uploaded and validated successfully"
    }


# ============================================
# Specification Routes
# ============================================

@app.get("/api/openspec/projects/{project_id}/specs/{spec_id}")
async def get_specification(project_id: str, spec_id: str):
    """Get specification content."""
    project = user_sessions.get(project_id)
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    spec = find_spec_in_tree(project.get("specTree", []), spec_id)
    
    if not spec:
        raise HTTPException(status_code=404, detail="Specification not found")
    
    return {"success": True, "spec": spec}


@app.put("/api/openspec/projects/{project_id}/specs/{spec_id}")
async def update_specification(
    project_id: str,
    spec_id: str,
    update: SpecificationUpdate
):
    """Update specification content."""
    project = user_sessions.get(project_id)
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    updated = update_spec_in_tree(
        project.get("specTree", []),
        spec_id,
        {
            "content": update.content,
            "suggestions": update.suggestions,
            "updatedAt": datetime.now().isoformat()
        }
    )
    
    if not updated:
        raise HTTPException(status_code=404, detail="Specification not found")
    
    project["updatedAt"] = datetime.now().isoformat()
    
    return {"success": True, "message": "Specification updated successfully"}


# ============================================
# AI Suggestions Routes
# ============================================

@app.post("/api/openspec/projects/{project_id}/specs/{spec_id}/suggestions")
async def generate_suggestions(
    project_id: str,
    spec_id: str,
    request: SuggestionRequest = None
):
    """Generate AI suggestions for a specification."""
    project = user_sessions.get(project_id)
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    spec = find_spec_in_tree(project.get("specTree", []), spec_id)
    
    if not spec:
        raise HTTPException(status_code=404, detail="Specification not found")
    
    # Generate suggestions
    suggestions = await anthropic_service.generate_suggestions(
        spec.get("content", ""),
        project.get("projectName", "")
    )
    
    # Update spec with suggestions
    update_spec_in_tree(project.get("specTree", []), spec_id, {"suggestions": suggestions})
    
    return {"success": True, "suggestions": suggestions}


# ============================================
# Code Generation Routes
# ============================================

async def run_code_generation(task_id: str, project: Dict[str, Any], branch_name: str, custom_prompt: str = None):
    """Background task for code generation."""
    task = task_manager.get(task_id)
    
    try:
        # Step 1: Create branch and Prepare Environment
        task["status"] = TaskStatus(
            step="creating_branch",
            message="Creating feature branch and syncing files...",
            completed=False
        ).model_dump()
        task["updatedAt"] = datetime.now().isoformat()
        
        # 1a. Create Branch
        try:
            await github_client.create_branch(
                project["owner"],
                project["repository"],
                branch_name,
                "main"
            )
        except Exception as e:
            print(f"Branch may already exist, continuing... {str(e)}")
        
        # 1b. Push OpenSpec files to the new branch
        # Determine Change ID from specTree (User says: top directory name)
        spec_tree = project.get("specTree", [])
        change_id = None
        has_root_dir = False
        
        # Check if there is a single top-level directory or valid root structure
        for node in spec_tree:
            if node.get("type") == "directory":
                change_id = node.get("name")
                has_root_dir = True
                break
        
        # Fallback to zip filename if no root directory found
        if not change_id:
            openspec_filename = project.get("openspecFile", {}).get("name", "change")
            if openspec_filename.lower().endswith('.zip'):
                 change_id = openspec_filename[:-4]
            else:
                 change_id = openspec_filename
            
            # Sanitize fallback ID
            import re
            change_id = re.sub(r'[^a-zA-Z0-9-_]', '-', change_id)
        
        files_to_push = []
        
        def collect_specs(nodes):
            result = []
            for node in nodes:
                # Include specifications and change files, skip directories if they are empty
                if node.get("type") in ["specification", "change", "file"] and node.get("content"):
                    # Logic: if zip has root dir, path is 'RootDir/file'. Target: 'openspec/changes/RootDir/file'
                    # If zip is flat, path is 'file'. Target: 'openspec/changes/ZipName/file'
                    
                    rel_path = node["path"].lstrip('/')
                    
                    if has_root_dir:
                        # Path already includes the change_id (root dir name)
                        target_path = f"openspec/changes/{rel_path}"
                    else:
                        # Path doesn't include ID, prepend it
                        target_path = f"openspec/changes/{change_id}/{rel_path}"
                    
                    result.append({
                        "path": target_path,
                        "content": node["content"]
                    })
                if node.get("children"):
                    result.extend(collect_specs(node["children"]))
            return result
            
        files_to_push = collect_specs(spec_tree)
                
        if files_to_push:
            await github_client.push_changes(
                project["owner"],
                project["repository"],
                f"Sync OpenSpec files for change {change_id}",
                files_to_push,
                branch_name,
                branch_name
            )

        # Step 2: Trigger Claude Task
        task["status"] = TaskStatus(
            step="generating_code",
            message="Queuing Agent Task...",
            completed=False
        ).model_dump()
        task["updatedAt"] = datetime.now().isoformat()
        
        # User requirement: repoUrl must include the branch path
        # Format: https://github.com/owner/repo/tree/branch
        repo_url = f"https://github.com/{project['owner']}/{project['repository']}/tree/{branch_name}"
        
        if custom_prompt:
            prompt = custom_prompt
        else:
            prompt = f"Checkout branch '{branch_name}'. Read the OpenSpec files at 'openspec/changes/{change_id}/' and implement the changes described. Provide a summary of changes."
        
        agent_task = await claude_task_client.create_task(
            repo_url=repo_url,
            prompt=prompt,
            task_type="feature-implementation"
        )
        agent_task_id = agent_task.get("taskId")
        
        # Step 3: Poll Status
        while True:
            await asyncio.sleep(5) # Poll every 5s
            
            try:
                status_resp = await claude_task_client.get_task_status(agent_task_id)
                status = status_resp.get("status")
                
                if status == "completed":
                    # Success
                    result_summary = status_resp.get("result", "Implementation completed.")
                    # Truncate summary for display if needed
                    
                    task["status"] = TaskStatus(
                        step="completed",
                        message=f"Agent Finished: {result_summary[:200]}...",
                        completed=True
                    ).model_dump()
                    task["updatedAt"] = datetime.now().isoformat()
                    break
                    
                elif status in ["failed", "error"]:
                    raise Exception(f"Agent task failed: {status_resp.get('error') or 'Unknown error'}")
                    
                else:
                    # Update progress message
                    step_msg = f"Agent working... Status: {status}"
                    if status == "running":
                        step_msg = "Agent is implementing changes..."
                        
                    task["status"]["message"] = step_msg
                    task["updatedAt"] = datetime.now().isoformat()
            
            except Exception as inner_e:
                print(f"Error polling task status: {inner_e}")
                pass
                
    except Exception as e:
        task["status"] = TaskStatus(
            step="error",
            message=str(e),
            completed=True,
            error=True
        ).model_dump()
        task["updatedAt"] = datetime.now().isoformat()


@app.post("/api/openspec/projects/{project_id}/generate")
async def generate_codebase(
    project_id: str,
    request: GenerateRequest,
    background_tasks: BackgroundTasks
):
    """Generate codebase from OpenSpec."""
    project = user_sessions.get(project_id)
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    task_id = str(uuid4())
    
    task_manager[task_id] = {
        "id": task_id,
        "projectId": project_id,
        "status": TaskStatus(
            step="initializing",
            message="Starting code generation...",
            completed=False
        ).model_dump(),
        "createdAt": datetime.now().isoformat(),
        "updatedAt": datetime.now().isoformat()
    }
    
    # Run in background
    background_tasks.add_task(run_code_generation, task_id, project, request.branchName, request.prompt)
    
    return {
        "success": True,
        "taskId": task_id,
        "message": "Code generation started"
    }


@app.get("/api/openspec/tasks/{task_id}/status")
async def get_task_status(task_id: str):
    """Get task status."""
    task = task_manager.get(task_id)
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {"success": True, "task": task}


@app.get("/api/openspec/projects/{project_id}/suggested-branch")
async def get_suggested_branch(project_id: str):
    """Get suggested unique branch name."""
    project = user_sessions.get(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    import re
    
    base_name = "openspec-implementation"
    if project.get("openspecFile") and project["openspecFile"].get("name"):
        # Remove extension and sanitize
        raw_name = project["openspecFile"]["name"]
        if raw_name.lower().endswith('.zip'):
            raw_name = raw_name[:-4]
        
        # Replace non-alphanumeric with hyphen
        base_name = re.sub(r'[^a-zA-Z0-9]', '-', raw_name)
    
    # Add timestamp
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    branch_name = f"feature/{base_name}-{timestamp}"
    
    return {"success": True, "branchName": branch_name}


# ============================================
# Pull Request Routes
# ============================================

@app.post("/api/openspec/projects/{project_id}/pull-request")
async def create_pull_request(project_id: str, request: PullRequestCreate):
    """Create a pull request."""
    project = user_sessions.get(project_id)
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    try:
        result = await github_client.create_pull_request(
            project["owner"],
            project["repository"],
            request.title,
            request.body,
            request.branchName,
            "main"
        )
        
        return {
            "success": True,
            "pullRequest": result,
            "message": "Pull request created successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=settings.PORT)
