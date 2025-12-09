# OpenSpec Workflow Backend

Python FastAPI backend for the OpenSpec Workflow application.

## Setup

### Prerequisites

- Python 3.11 or higher
- pip or pipenv

### Installation

1. Create a virtual environment:

```bash
python -m venv venv
```

2. Activate the virtual environment:

```bash
# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

5. Configure your environment variables in `.env`:

```env
GITHUB_API_ENDPOINT=http://103.98.213.149:8510
ANTHROPIC_API_KEY=your_anthropic_api_key_here
PORT=8000
DEBUG=false
```

### Running

Start the development server:

```bash
python run.py
```

The server will be available at:
- API: http://localhost:8000
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## API Documentation

The API documentation is automatically generated and available at `/docs` (Swagger UI) or `/redoc` (ReDoc) when the server is running.

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── config.py           # Configuration and settings
│   ├── main.py             # FastAPI application and routes
│   ├── models.py           # Pydantic request/response models
│   └── services/
│       ├── __init__.py
│       ├── anthropic_service.py   # Claude AI integration
│       ├── github_client.py       # GitHub API proxy client
│       └── openspec_service.py    # OpenSpec file handling
├── requirements.txt
├── run.py                  # Development server entry point
├── .env.example
└── README.md               # This file
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 8000 |
| `DEBUG` | Enable debug/reload mode | false |
| `GITHUB_API_ENDPOINT` | External GitHub API proxy | http://103.98.213.149:8510 |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude | Required for AI features |
| `CORS_ORIGINS` | Allowed CORS origins | ["http://localhost:3000"] |
