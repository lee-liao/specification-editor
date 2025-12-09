# OpenSpec Workflow - Two-Tier Architecture

A modern web application for managing OpenSpec files, generating AI suggestions, and triggering code generation. Built with a **Python (FastAPI) backend** and **Next.js (React) frontend**.

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              Two-Tier Architecture                            │
├───────────────────────────────────┬──────────────────────────────────────────┤
│           Frontend (Next.js)       │            Backend (Python/FastAPI)      │
│           Port: 3000               │            Port: 8000                    │
├───────────────────────────────────┼──────────────────────────────────────────┤
│  • React 19 + TypeScript           │  • FastAPI + Pydantic                    │
│  • Tailwind CSS                    │  • Anthropic Claude API                  │
│  • react-icons                     │  • GitHub API Client (proxy)             │
│  • Client-side state management    │  • OpenSpec file handling                │
└───────────────────────────────────┴──────────────────────────────────────────┘
                  │                                    │
                  │          HTTP REST API             │
                  └────────────────────────────────────┘
                                    │
                                    ▼
               ┌─────────────────────────────────────────┐
               │     External Services                    │
               ├─────────────────────────────────────────┤
               │  • Anthropic Claude (AI Suggestions)     │
               │  • GitHub API Proxy (Code Generation)    │
               └─────────────────────────────────────────┘
```

## Features

- 📁 **Upload OpenSpec Files**: Upload and validate OpenSpec zip files
- ✏️ **Edit Specifications**: Rich text editor for editing specifications
- 🤖 **AI Suggestions**: Get AI-powered suggestions using Claude
- 🔀 **Code Generation**: Generate code and push to GitHub repositories
- 📝 **Pull Requests**: Create pull requests for implementations

## Quick Start

### Prerequisites

- **Python 3.11+** for the backend
- **Node.js 18+** for the frontend
- **Anthropic API key** for AI suggestions

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment
# Create a .env file with:
# GITHUB_API_ENDPOINT=http://103.98.213.149:8510
# ANTHROPIC_API_KEY=your_key_here
# PORT=8000

# Run the server
python run.py
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local file with:
# NEXT_PUBLIC_API_URL=http://localhost:8000

# Run development server
npm run dev
```

### Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs (Swagger)**: http://localhost:8000/docs

## Project Structure

```
specification-editor/
├── backend/                    # Python FastAPI Backend
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py          # Configuration settings
│   │   ├── main.py            # FastAPI application
│   │   ├── models.py          # Pydantic models
│   │   └── services/
│   │       ├── anthropic_service.py   # Claude AI integration
│   │       ├── github_client.py       # GitHub API client
│   │       └── openspec_service.py    # OpenSpec file handling
│   ├── requirements.txt
│   ├── run.py                 # Entry point
│   └── .env.example
│
├── frontend/                   # Next.js React Frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx     # Root layout
│   │   │   ├── page.tsx       # Main page
│   │   │   └── globals.css    # Global styles
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   ├── SpecTree.tsx
│   │   │   ├── Editor.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   └── Modals.tsx
│   │   └── lib/
│   │       ├── api.ts         # API client
│   │       └── types.ts       # TypeScript types
│   ├── package.json
│   └── tailwind.config.ts
│
├── docs/                       # Documentation
├── temp/                       # Temporary file storage
└── README.md                   # This file
```

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

## Environment Variables

### Backend (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 8000 |
| `GITHUB_API_ENDPOINT` | External GitHub API endpoint | http://103.98.213.149:8510 |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude | Required |
| `DEBUG` | Enable debug mode | false |

### Frontend (.env.local)

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | http://localhost:8000 |

## Development

### Running Both Services

For development, run both services in separate terminals:

**Terminal 1 - Backend:**
```bash
cd backend
python run.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Building for Production

**Backend:**
```bash
cd backend
pip install gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

**Frontend:**
```bash
cd frontend
npm run build
npm start
```

## License

MIT
