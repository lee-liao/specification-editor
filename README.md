# OpenSpec Workflow

A standalone tool for managing OpenSpec files, generating AI suggestions, and triggering code generation.

## Features

- 📁 **Upload OpenSpec Files**: Upload and validate OpenSpec zip files
- ✏️ **Edit Specifications**: Rich text editor for editing specifications
- 🤖 **AI Suggestions**: Get AI-powered suggestions to improve your specifications using Claude
- 🔀 **Code Generation**: Generate code and push to GitHub repositories
- 📝 **Pull Requests**: Create pull requests for your implementations

## Architecture

This project is designed to be **decoupled** from the main code-generation-platform. Instead of directly using a GitHub App, it proxies GitHub operations through an external API endpoint.

```
┌─────────────────────┐         ┌──────────────────────────────┐
│                     │         │                              │
│  OpenSpec Workflow  │ ──────► │  Code Generation Platform    │
│  (This Project)     │  HTTP   │  (GitHub API Proxy)          │
│                     │         │  http://103.98.213.149:8510  │
└─────────────────────┘         └──────────────────────────────┘
         │
         │ Claude API
         ▼
┌─────────────────────┐
│                     │
│   Anthropic API     │
│   (AI Suggestions)  │
│                     │
└─────────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Anthropic API key (for AI suggestions)

### Installation

1. Clone or copy this directory
2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file from the example:

```bash
cp example.env .env
```

4. Configure your `.env` file:

```env
# GitHub API endpoint (external code-generation-platform)
GITHUB_API_ENDPOINT=http://103.98.213.149:8510

# Anthropic API Key for AI suggestions
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Server Port
PORT=3001
```

5. Start the server:

```bash
npm start
```

6. Open your browser to `http://localhost:3001`

## API Endpoints

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/openspec/projects` | Create a new project |
| GET | `/api/openspec/projects/:id` | Get project details |
| POST | `/api/openspec/projects/:id/upload` | Upload OpenSpec file |

### Specifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/openspec/projects/:id/specs/:specId` | Get specification |
| PUT | `/api/openspec/projects/:id/specs/:specId` | Update specification |
| POST | `/api/openspec/projects/:id/specs/:specId/suggestions` | Generate AI suggestions |

### Code Generation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/openspec/projects/:id/generate` | Start code generation |
| GET | `/api/openspec/tasks/:taskId/status` | Check task status |
| POST | `/api/openspec/projects/:id/pull-request` | Create pull request |

## Project Structure

```
openspec-workflow-standalone/
├── server.js                 # Main Express server
├── package.json
├── example.env
├── public/
│   ├── index.html           # Main UI
│   ├── css/
│   │   └── openspec-workflow.css
│   └── js/
│       └── openspec-workflow.js
├── routes/
│   └── openspec-workflow.js # API routes
├── utils/
│   └── github-api-client.js # GitHub API proxy client
├── docs/
│   └── OPENSPEC_INSTRUCTIONS.md
└── temp/                    # Temporary file storage
```

## Development

### Running in development mode

```bash
npm run dev
```

### Swagger API Documentation

Access the Swagger UI at `http://localhost:3001/api-docs`

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3001 |
| `GITHUB_API_ENDPOINT` | External GitHub API endpoint | http://103.98.213.149:8510 |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude | Required for AI features |

## License

MIT
