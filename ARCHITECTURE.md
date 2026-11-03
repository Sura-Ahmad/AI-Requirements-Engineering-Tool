# System Architecture — Requirements Super Tool

# Diagram 1 — Client-server architecture

```mermaid
graph LR
    subgraph CLIENT["🖥️CLIENT — Vercel (Next.js)"]
        UI["Pages & Components\n(Dashboard, Requirements,\nHistory, Profile, Admin)"]
        APICLIENT["API Client\nlib/api.ts\n(Axios + JWT interceptor)"]
        WORDDOC["Document Generator\nlib/generateSRSWord.ts\n(docx / jsPDF)"]
    end

    subgraph SERVER["⚙️SERVER — Railway (FastAPI)"]
        subgraph ROUTERS["Routers Layer"]
            R1["auth.py"]
            R2["requirements.py"]
            R3["upload.py"]
            R4["profile.py"]
            R5["admin.py"]
            R6["crosscheck.py"]
            R7["srs.py"]
            R8["usecases.py"]
            R9["domain.py"]
        end

        subgraph SERVICES["Services Layer"]
            S1["auth_service"]
            S2["requirement_service"]
            S3["ai_service"]
            S4["file_service"]
            S5["kb_service"]
            S6["admin_service"]
            S7["audit_service"]
            S8["profile_service"]
            S9["crosscheck_service"]
            S10["srs_service"]
            S11["usecases_service"]
            S12["domain_service"]
        end

        subgraph CORE["Core Layer"]
            C1["security.py\n(JWT)"]
            C2["database.py\n(SQLAlchemy)"]
            C3["limiter.py\n(Rate limiting)"]
            C4["email.py\n(Brevo)"]
            C5["knowledge_base.py\n(Qdrant client)"]
            C6["config.py"]
        end

        subgraph MODELS["Models / Schemas Layer"]
            M1["User, RefreshToken\nPasswordResetToken"]
            M2["Domain, UserSession\nDomainQuestion"]
            M3["Requirement"]
            M4["AuditLog, LoginHistory"]
        end
    end

    subgraph DATA["🗄️DATA LAYER"]
        DB[("PostgreSQL\nUsers · Sessions\nRequirements · Audit")]
        VDB[("Qdrant\nVector DB\nKnowledge Base")]
    end

    subgraph EXTERNAL["🌐EXTERNAL SERVICES"]
        AI["Anthropic\nClaude API\n(AI Generation)"]
        EMAIL["Brevo\n(Transactional Email)"]
        PII["Microsoft Presidio\n(PII Detection)"]
    end

    UI --> APICLIENT
    UI -->|"client-side only"| WORDDOC
    APICLIENT -->|"REST / JSON\nHTTPS"| ROUTERS
    ROUTERS --> SERVICES
    SERVICES --> CORE
    CORE --> MODELS
    MODELS --> DB
    C5 --> VDB
    S3 -->|"LLM API call"| AI
    C4 -->|"SMTP / API"| EMAIL
    S4 -->|"NLP scan"| PII
    S4 -->|"index / retrieve"| VDB
```

---

# Diagram 2 — RAG Flow (Retrieval-Augmented Generation)

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant RequirementService
    participant KbService
    participant Qdrant
    participant AiService
    participant Claude

    User->>Frontend: Complete wizard (domain + role + answers + document)
    Frontend->>RequirementService: POST /requirements/generate {session_id, document_text}
    RequirementService->>KbService: retrieve_context(domain, country, query)

    Note over KbService,Qdrant: RETRIEVE step
    KbService->>Qdrant: semantic vector search
    Qdrant-->>KbService: relevant KB chunks

    Note over AiService: AUGMENT step
    KbService-->>RequirementService: knowledge_context (domain regulations & standards)
    RequirementService->>AiService: generate_requirements(answers, document_text, knowledge_context)

    Note over AiService,Claude: GENERATE step
    AiService->>Claude: Enriched prompt (questionnaire + document + KB context)
    Claude-->>AiService: Functional & Non-Functional Requirements
    AiService-->>RequirementService: parsed requirements list
    RequirementService-->>Frontend: RequirementsResponse
    Frontend-->>User: Display requirements
```




# Diagram 3 —  Layered Architecture (All Layers + All Files)

```mermaid
flowchart TB
 subgraph L0["Layer 0 — User Interface (Vercel · Next.js)"]
        UI0["Pages & Components\n(Dashboard · Requirements · History · Profile · Admin)"]
        UI1["API Client — lib/api.ts\n(Axios + JWT interceptor + token refresh)"]
        UI2["Document Generator — lib/generateSRSWord.ts\n(docx · jsPDF · client-side only)"]
  end
 subgraph L1["Layer 1 — Routers (HTTP · FastAPI · Railway)"]
        R["auth.py · requirements.py · upload.py · profile.py\nadmin.py · crosscheck.py · srs.py · usecases.py · domain.py\n─────────────────────────────────────────\nResponsibilities: HTTP routing · Auth guards · Rate limiting · Request validation"]
  end
 subgraph L2["Layer 2 — Services (Business Logic)"]
        S["auth_service · requirement_service · ai_service\nfile_service · kb_service · admin_service\naudit_service · profile_service · crosscheck_service\nsrs_service · usecases_service · domain_service\n─────────────────────────────────────────\nResponsibilities: Requirements generation · Auth flows · RAG pipeline\nPII processing · Audit logging · Admin operations"]
  end
 subgraph L3["Layer 3 — Core (Infrastructure)"]
        C["security.py (JWT) · database.py (SQLAlchemy sessions)\nlimiter.py (Rate limiting) · email.py (Brevo)\nknowledge_base.py (Qdrant client) · config.py (App settings)\n─────────────────────────────────────────\nResponsibilities: Token creation/validation · DB session management\nEmail dispatch · Vector DB queries · Configuration"]
  end
 subgraph L4["Layer 4 — Models & Schemas (SQLAlchemy ORM · Pydantic)"]
        M["ORM Models: User · RefreshToken · PasswordResetToken\nDomain · UserSession · DomainQuestion\nRequirement · AuditLog · LoginHistory\n─────────────────────────────────────────\nPydantic Schemas: Request/Response validation for all endpoints\nAlembic: Database migration management"]
  end
 subgraph L5["Layer 5 — Data"]
        DB[("PostgreSQL\nUsers · Sessions · Requirements\nAudit · Login History · Domains")]
        VDB[("Qdrant\nVector DB\nDomain Knowledge Base")]
  end
    UI0 -- calls --> UI1
    UI0 -- "client-side only" --> UI2
    UI1 -- REST / JSON / HTTPS --> L1
    L1 -- delegates to --> L2
    L2 -- uses --> L3
    L3 -- maps via --> L4
    L4 -- SQLAlchemy ORM --> DB
    C -- index / retrieve --> VDB
```


