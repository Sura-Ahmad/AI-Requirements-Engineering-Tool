# RequirementsSuperTool

An AI-powered software requirements generation platform that helps product owners, business analysts, developers, and stakeholders produce structured, regulation-aware requirements documents. Users answer domain-specific questions, optionally upload a project document, and the system generates functional requirements (FR), non-functional requirements (NFR), use case documents, and full SRS reports using the Anthropic Claude API combined with a domain knowledge base stored in Qdrant.

# The knowledge base for the healthcare sector is currently ready. For the remaining sectors, I am still collecting relevant documents.

**Live demo:** [req-tool-five.vercel.app](https://req-tool-five.vercel.app)

---

# Key Features

- **AI-Driven Generation** — Produces FR and NFR lists tailored to the selected domain, country regulations, user role, and project context.
- **Document Upload** — Accepts PDF and DOCX files (up to 20 MB); extracts and processes text automatically.
- **PII Protection** — Detects and removes personally identifiable information from uploaded content using Microsoft Presidio before any AI processing.
- **Domain Knowledge Base** — Retrieves regulation-specific context from a Qdrant vector database (RAG pipeline) to ground generated requirements in real-world compliance needs.
- **Requirement Refinement** — Users can edit, add, and delete individual requirements after generation; every edit is versioned in a history log.
- **Document Export** — Generates formatted SRS and use case documents downloadable as DOCX.
- **Role-Based Access** — Separate user and admin roles; admins can manage users, domains, and audit logs.
- **Full Audit Trail** — All system actions and login attempts are logged for traceability.

---

# Architecture

The system is organized into five layers:

| Layer | Responsibility |
|---|---|
| **UI** | Next.js pages, Axios API client, document generator |
| **Routers** | FastAPI HTTP endpoints (auth, domains, requirements, input, admin) |
| **Services** | Business logic — auth, RAG pipeline, AI generation, file processing, auditing |
| **Core** | Infrastructure — JWT, SQLAlchemy ORM, rate limiting, email, Qdrant client |
| **Data** | PostgreSQL (relational data) + Qdrant (vector embeddings) |

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed Mermaid diagrams of the system, RAG pipeline, and layered architecture.

---

# Technology Stack

# Frameworks & Libraries

| Technology | Purpose |
|---|---|
| Next.js + React | Frontend — SSR, routing, UI |
| FastAPI | Backend — RESTful API |
| SQLAlchemy | Python ORM for database interaction |
| Pydantic | Data validation and schema management |
| SlowAPI | Rate limiting middleware for FastAPI |

# Databases & Storage

| Technology | Purpose |
|---|---|
| PostgreSQL | Relational database — users, sessions, requirements, audit logs |
| Qdrant | Vector database — semantic similarity search for the knowledge base |

# AI & NLP

| Technology | Purpose |
|---|---|
| Anthropic Claude API | LLM for requirements, SRS, and use case generation |
| SentenceTransformers (`all-MiniLM-L6-v2`) | Embedding model for vector search |
| Microsoft Presidio | PII detection and anonymization |

# Document Processing

| Technology | Purpose |
|---|---|
| pdfplumber | PDF text extraction |
| python-docx | Microsoft Word document processing |

# Security

| Technology | Purpose |
|---|---|
| Passlib / bcrypt | Password hashing |
| PyJWT | JSON Web Token authentication |

# APIs & Integrations

| Technology | Purpose |
|---|---|
| Swagger (OpenAPI) | Auto-generated API documentation |
| Brevo | Transactional email delivery (verification, password reset) |

# Languages & Tooling

| Technology | Purpose |
|---|---|
| Python | Backend development |
| TypeScript | Frontend logic with static typing |
| Tailwind CSS | Utility-first styling |
| Git / GitHub | Version control and repository management |
| Pytest | Backend unit and integration testing |

---

# Local Development

# Prerequisites

- Python 3.12+
- Node.js 18+
- PostgreSQL 16
- A running Qdrant instance (cloud)

# 1. Backend

```bash
cd backend

#in the terminal (git clone https://github.com/Sura-Ahmad/Req-Tool.git)
# Create and activate a virtual environment
python -m venv venv
venv\Scripts\activate 


# Install dependencies
pip install -r requirements.txt
python -m spacy download en_core_web_lg

# Configure environment variables
copy .env.example .env
# .env file is not published as it contains sensitive data and instead i put .env example without real data.

# Apply database migrations
alembic upgrade head

# Start the development server
uvicorn app.main:app --reload --port 8000
```

- API base URL: `http://localhost:8000`
- Swagger docs: `http://localhost:8000/docs`

### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
# in the .env.local file set:
# NEXT_PUBLIC_API_URL=http://localhost:8000

# Start the development server
npm run dev
```

- App URL: `http://localhost:3000`

---

# Docker

```bash
# Copy and populate the backend environment file
copy backend\.env.example backend\.env
# Edit backend/.env with project credentials 

# Build and start all services
docker-compose up --build
```

| Service | URL |
|---|---|
| Frontend | `http://localhost:3000` |
| Backend API | `http://localhost:8000` |
| Swagger docs | `http://localhost:8000/docs` |

Run database migrations inside the running container:

```bash
docker-compose exec backend alembic upgrade head
```

---


# Deployment

| Service | Platform |
|---|---|
| Frontend | Vercel — [req-tool-five.vercel.app](https://req-tool-five.vercel.app) |
| Backend API | Railway |

---

# UML Diagrams

Diagram files are located in [`docs/uml/`](docs/uml/).

| File | Type | How to View |
|---|---|---|
| `class_diagram.puml` | Class diagram | Open in VS Code → right-click → **Preview Diagram** (PlantUML extension required) |
| `signup_Sequence.puml` | Sequence diagram | Same as above |
| `sequence_diagram_upload documentOrInputText.puml` | Sequence diagram | Same as above |
| `State_machine_diagram.puml` | State machine diagram | Same as above |

Architecture diagrams in [`ARCHITECTURE.md`](ARCHITECTURE.md) use Mermaid syntax — paste any diagram block into [mermaid.live](https://mermaid.live) to render.

---

# Testing

Run the backend test suite from the `backend` directory:

```bash
python -m pytest tests/test_auth.py -v
```
