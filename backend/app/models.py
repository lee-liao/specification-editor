"""Pydantic models for request/response validation."""
from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime
from uuid import UUID, uuid4


class ProjectCreate(BaseModel):
    """Request model for creating a new project."""
    projectName: str
    description: Optional[str] = ""
    owner: str
    repository: str
    isPrivate: bool = False


class Project(BaseModel):
    """Project model."""
    id: str
    projectName: str
    description: Optional[str] = ""
    owner: str
    repository: str
    isPrivate: bool = False
    specTree: List[Any] = Field(default_factory=list)
    currentSpec: Optional[Any] = None
    createdAt: datetime = Field(default_factory=datetime.now)
    updatedAt: datetime = Field(default_factory=datetime.now)


class Specification(BaseModel):
    """Specification model."""
    id: str
    name: str
    path: str
    type: str  # 'specification' or 'change'
    content: str = ""
    children: List["Specification"] = Field(default_factory=list)
    suggestions: List[Any] = Field(default_factory=list)


class SpecificationUpdate(BaseModel):
    """Request model for updating a specification."""
    content: str
    suggestions: List[Any] = Field(default_factory=list)


class SuggestionRequest(BaseModel):
    """Request model for generating suggestions."""
    context: Optional[str] = "OpenSpec specification improvement"
    requirement: Optional[str] = "Enhance clarity and testability"


class Suggestion(BaseModel):
    """AI suggestion model."""
    id: str
    content: str


class GenerateRequest(BaseModel):
    """Request model for code generation."""
    branchName: str = "openspec-implementation"
    prompt: Optional[str] = None


class TaskStatus(BaseModel):
    """Task status model."""
    step: str
    message: str
    completed: bool = False
    error: bool = False


class Task(BaseModel):
    """Task model."""
    id: str
    projectId: str
    status: TaskStatus
    createdAt: datetime = Field(default_factory=datetime.now)
    updatedAt: datetime = Field(default_factory=datetime.now)


class PullRequestCreate(BaseModel):
    """Request model for creating a pull request."""
    title: str
    body: str
    branchName: str = "openspec-implementation"


class HealthResponse(BaseModel):
    """Health check response model."""
    status: str
    message: str
    githubApiEndpoint: str
