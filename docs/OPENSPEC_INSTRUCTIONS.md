# OpenSpec Workflow and Implementation Guide

This document provides instructions on how to use the OpenSpec features within the Code Generation Platform. The platform supports two main modes of operation: a full Project Workflow and a direct Implementation Agent.

## 1. OpenSpec Project Workflow

The Project Workflow allows you to manage OpenSpec projects, upload specifications, refine them with AI, and generate codebases. This is handled by the `OpenSpec Workflow` API endpoints.

### Step 1: Initialize a Project
Start by creating a new project session. This sets up the metadata for your repository and specification.

- **Endpoint**: `POST /openspec-workflow/projects`
- **Payload**:
  ```json
  {
    "projectName": "My New App",
    "description": "A web application for...",
    "owner": "github-username",
    "repository": "my-new-app-repo",
    "isPrivate": false
  }
  ```

### Step 2: Upload Specifications
Upload your OpenSpec zip file containing the `changes` and `specs` directories. The system will validate the structure and parse the specifications into a tree.

- **Endpoint**: `POST /openspec-workflow/projects/{projectId}/upload`
- **Body**: Multipart form-data with `openspecFile` (zip file).

### Step 3: Manage and Refine Specifications
Once uploaded, you can explore and refine your specifications before generation.

- **View Spec Tree**: `GET /openspec-workflow/projects/{projectId}/spec-tree`
- **View Spec Content**: `GET /openspec-workflow/projects/{projectId}/specs/{specId}`
- **Update Spec**: `PUT /openspec-workflow/projects/{projectId}/specs/{specId}`
- **Get AI Suggestions**: `POST /openspec-workflow/projects/{projectId}/specs/{specId}/suggestions`
  - Use this to ask Claude for improvements to your requirements.

### Step 4: Generate Codebase
When specifications are ready, trigger the AI generation process. This will create the repository (if it doesn't exist), create a branch, and generate code based on your specs.

- **Endpoint**: `POST /openspec-workflow/projects/{projectId}/generate`
- **Payload**:
  ```json
  {
    "branchName": "feature/initial-implementation"
  }
  ```
- **Track Status**: Use the returned `taskId` with `GET /openspec-workflow/tasks/{taskId}/status`.

### Step 5: Create Pull Request
After generation is complete, create a Pull Request to merge the generated code into your main branch.

- **Endpoint**: `POST /openspec-workflow/projects/{projectId}/pull-request`

---

## 2. OpenSpec Implementation Agent (Direct Mode)

The Implementation Agent provides a more direct "fire-and-forget" approach. You provide a zip file, and the agent handles the entire lifecycle: creating a branch, implementing changes via Claude, and creating a PR.

### How to Use
1. **Prepare your OpenSpec Zip**: Ensure your zip file contains the required `changes` folder structure.
2. **Trigger Implementation**:
   - **Endpoint**: `POST /openspec-implementation-agent/openspec-implement`
   - **Body**: Multipart form-data
     - `zipFile`: Your OpenSpec zip file.
     - `repoName`: The target repository name.

3. **Process**:
   - The agent validates the zip file.
   - It checks out the repository and creates a new feature branch.
   - It runs Claude to implement the requirements specified in the `changes` folder.
   - It commits the changes and automatically opens a Pull Request.

4. **Track Progress**:
   - Use the returned `taskId` to poll `GET /openspec-implementation-agent/task-status/{taskId}`.

---

## 3. API Documentation

For detailed information on all endpoints, parameters, and response formats, please refer to the **Swagger UI**.

- **URL**: `/api-docs` (e.g., `http://localhost:3000/api-docs`)
- The Swagger UI provides interactive documentation where you can test endpoints directly.

---

## 4. Frontend Dashboard

A complete web-based dashboard is available to interact with the OpenSpec workflow visually, without needing to call APIs manually.

- **URL**: `http://localhost:3000/openspec-workflow.html`

### Features
The dashboard provides a graphical interface for the entire lifecycle:
1.  **Project Management**: Create and switch between projects.
2.  **Visual Spec Editor**:
    - **File Tree**: Browse your uploaded specification files.
    - **Editor**: View and edit spec content with a rich text interface.
    - **Preview**: See how your markdown specs render.
3.  **AI Integration**:
    - **Get Suggestions**: Click the "AI Suggestions" tab to ask Claude for improvements.
    - **Apply Changes**: Review and apply AI suggestions directly to your spec.
4.  **Workflow Tracking**:
    - **Progress Bar**: Real-time tracking of the generation process (Upload -> Edit -> AI -> Generate).
    - **Status Updates**: Live polling of background tasks.

---




