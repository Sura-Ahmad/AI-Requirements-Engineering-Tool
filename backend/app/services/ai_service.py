import json
import logging
from datetime import date
import anthropic
from fastapi import HTTPException
try:
    from json_repair import repair_json as _repair_json
    _HAS_JSON_REPAIR = True
except ImportError:
    _repair_json = None
    _HAS_JSON_REPAIR = False
from app.core.config import settings
from app.core.knowledge_base import retrieve_context

logger = logging.getLogger("requirements_ai")

_client = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    return _client


_ROLE_INSTRUCTIONS = {
    "product_owner": "Write requirements as high-level business outcomes and user stories. Focus on WHAT the system should do, not HOW. Use business language.",
    "business_analyst": "Write requirements as detailed functional specifications. Be precise and measurable. Include acceptance criteria hints.",
    "developer": "Write requirements as technical specifications. Include implementation details, APIs, data structures, and performance metrics.",
    "stakeholder": "Write requirements as business goals and benefits. Focus on value delivered, ROI, and business impact. Use non-technical language.",
}


# Requirements Generation 
def generate_requirements(
    domain: str,
    role: str,
    answers: list,
    document_text: str = "",
    knowledge_context: str = "",
    country: str = "Jordan",
) -> dict:
    if not knowledge_context:
        query = f"{domain} system requirements {' '.join([a.get('answer', '') for a in answers])}"
        knowledge_context = retrieve_context(domain, query, limit=3, country=country)

    answers_text = "\n".join(
        [f"Q: {a.get('question', '')} A: {a.get('answer', '')}" for a in answers]
    )
    role_instruction = _ROLE_INSTRUCTIONS.get(role, "Write clear and detailed requirements.")

    answers_content = " ".join([a.get("answer", "") for a in answers if a.get("answer", "").strip()])
    validation_input = answers_content or document_text[:500]
    if validation_input.strip():
        validation_prompt = (
            f'Does the following relate to the {domain} domain?\n'
            f'"{validation_input}"\nAnswer with only YES or NO.'
        )
        try:
            validation = _get_client().messages.create(
                model=settings.CLAUDE_MODEL,
                max_tokens=10,
                messages=[{"role": "user", "content": validation_prompt}],
            )
            if "NO" in validation.content[0].text.upper():
                return {
                    "functional": [],
                    "non_functional": [],
                    "raw": "",
                    "error": (
                        f"The system you described doesn't match the {domain} domain. "
                        f"Please choose a system related to {domain}."
                    ),
                }
        except Exception:
            logger.exception("Claude validation call failed")

    system_text = f"""You are a senior requirements engineer with 15+ years of experience in the {domain} domain in {country}.
Your requirements are precise, testable, and complete — no vague language, no overlaps, no gaps.

## Role-Specific Instructions
{role_instruction}

## Requirements Quality Rules
- Each requirement must be atomic (one requirement per line)
- Use active voice: "The system shall..." or "The system must...)"
- Each requirement must be verifiable/testable
- Avoid: "user-friendly", "fast", "easy" — be specific and measurable
- Non-functional requirements must include measurable thresholds (e.g., response time < 2s, uptime ≥ 99.9%)
- Cover: security, performance, scalability, accessibility where relevant

## Output Format
Generate exactly in this format — no extra text before or after:

### Functional Requirements
FR-1: [requirement]
FR-2: [requirement]

### Non-Functional Requirements
NFR-1: [requirement]
NFR-2: [requirement]"""

    user_prompt_parts = [
        f"## Project Context\n- Domain: {domain}\n- Target Role: {role.replace('_', ' ').title()}\n- Country: {country}",
        f"## Questionnaire Answers\n{answers_text}",
    ]
    if document_text:
        user_prompt_parts.append(f"## Additional Document Content\n{document_text}")
    if knowledge_context:
        user_prompt_parts.append(f"## {country} Domain Knowledge Base\n{knowledge_context}")

    user_prompt = "\n\n".join(user_prompt_parts)

    try:
        message = _get_client().messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=2000,
            system=[
                {
                    "type": "text",
                    "text": system_text,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[{"role": "user", "content": user_prompt}],
            extra_headers={"anthropic-beta": "prompt-caching-2024-07-31"},
        )
    except Exception:
        logger.exception("Claude generation call failed")
        return {"functional": [], "non_functional": [], "raw": "", "error": "AI generation failed. Please try again."}

    response_text = message.content[0].text
    functional: list[str] = []
    non_functional: list[str] = []
    current_section = None

    for line in response_text.split("\n"):
        line = line.strip()
        if "Functional Requirements" in line and "Non-" not in line:
            current_section = "functional"
        elif "Non-Functional Requirements" in line:
            current_section = "non_functional"
        elif line.startswith("FR-") and current_section == "functional":
            functional.append(line)
        elif line.startswith("NFR-") and current_section == "non_functional":
            non_functional.append(line)

    return {"functional": functional, "non_functional": non_functional, "raw": response_text}


# Shared Helper
def _sanitize_json_strings(s: str) -> str:
    """Replace literal newlines/tabs inside JSON string values with spaces."""
    result = []
    in_string = False
    escaped = False
    for char in s:
        if escaped:
            result.append(char)
            escaped = False
        elif char == '\\' and in_string:
            result.append(char)
            escaped = True
        elif char == '"':
            result.append(char)
            in_string = not in_string
        elif char in ('\n', '\r', '\t') and in_string:
            result.append(' ')
        else:
            result.append(char)
    return ''.join(result)


def parse_json_response(text: str) -> list:
    """Parse a JSON array from a Claude response, stripping markdown code fences."""
    clean = text.strip()
    try:
        if "```json" in clean:
            clean = clean.split("```json", 1)[1].split("```", 1)[0].strip()
        elif "```" in clean:
            clean = clean.split("```", 1)[1].split("```", 1)[0].strip()
        try:
            return json.loads(clean)
        except json.JSONDecodeError:
            try:
                return json.loads(clean, strict=False)
            except json.JSONDecodeError:
                if _HAS_JSON_REPAIR:
                    result = _repair_json(clean, return_objects=True)
                    if isinstance(result, list):
                        return result
                    if isinstance(result, dict):
                        for v in result.values():
                            if isinstance(v, list):
                                return v
                raise ValueError("Could not repair JSON")
    except (json.JSONDecodeError, IndexError, ValueError, Exception):
        logger.error("Could not parse JSON response from AI (cleaned): %s", clean[:500])
        raise HTTPException(status_code=502, detail="AI returned an unexpected response. Please try again.")


#  Use Case Generation 
def generate_use_cases(domain_name: str, country: str, requirements: list) -> list:
    """Build a use-case prompt, call Claude, return a list of use-case dicts."""
    fr_text = "\n".join([f"{r.code}: {r.description}" for r in requirements])

    system_prompt = f"""You are a senior systems analyst with expertise in use case modeling for {domain_name} systems in {country}.
You produce complete, professional use cases following UML and IEEE standards.
Each use case must be directly traceable to one or more functional requirements.
Cover ALL provided functional requirements — no FR should be left without a use case."""

    user_prompt = f"""Generate use cases for a {domain_name} system in {country} based on these functional requirements:

{fr_text}

Rules:
- Create one use case per major user goal (group related FRs where logical)
- Identify all relevant actors (end users, admins, external systems)
- Every use case must cover at least one FR from the list above
- Alternative flows must cover the most common deviation paths
- Exception flows must cover failure/error scenarios

IMPORTANT: All JSON string values must be on a single line. Use " | " to separate multiple steps — do NOT use actual line breaks inside JSON strings.

Return ONLY a valid JSON array with this exact structure — no other text:
[
  {{
    "use_case_id": "UC-1",
    "title": "Short action-oriented title",
    "actor": "Primary actor",
    "trigger": "What initiates this use case",
    "preconditions": "What must be true before execution",
    "main_flow": "1. Step one | 2. Step two | 3. Step three",
    "alternative_flows": "A1: If X happens, then Y | A2: If Z happens, then W",
    "exception_flows": "E1: If error occurs, system shows message and logs the error",
    "postconditions": "What is true after successful completion",
    "priority": "High",
    "related_requirements": "FR-1, FR-2"
  }}
]"""

    try:
        message = _get_client().messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=16000,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
    except Exception:
        logger.exception("Claude use-cases call failed")
        raise HTTPException(status_code=503, detail="AI service unavailable. Please try again.")
    return parse_json_response(message.content[0].text)


# SRS Generation 
def generate_srs(
    project_name: str,
    description: str,
    domain_name: str,
    country: str,
    functional: list,
    non_functional: list,
) -> str:
    """Build an IEEE 830 SRS prompt, call Claude, return the raw SRS text."""
    fr_text = "\n".join([f"{r.code}: {r.description}" for r in functional])
    nfr_text = "\n".join([f"{r.code}: {r.description}" for r in non_functional])

    description_line = (
        f"Description: {description}"
        if description and str(description).strip() and str(description).strip().lower() not in ("none", "null", "")
        else "Description: Derive the system description from the functional and non-functional requirements listed below."
    )

    today = date.today().strftime("%B %d, %Y")

    prompt = f"""Generate a complete IEEE 830 Software Requirements Specification (SRS) document for the following project:

Project Name: {project_name}
Domain: {domain_name}
Country: {country}
Date: {today}
{description_line}

Functional Requirements:
{fr_text}

Non-Functional Requirements:
{nfr_text}

Generate a complete SRS document following IEEE 830 standard with these sections:
1. Introduction
   1.1 Purpose
   1.2 Scope
   1.3 Definitions and Abbreviations
   1.4 References
   1.5 Overview
2. Overall Description
   2.1 Product Perspective
   2.2 Product Functions
   2.3 User Classes and Characteristics
   2.4 Operating Environment
   2.5 Constraints
3. Specific Requirements
   3.1 Functional Requirements
   3.2 Non-Functional Requirements
4. Appendices

Make it professional and complete.
Use plain text only — do NOT use markdown formatting, asterisks, bold, italic, or any special symbols. Use numbered sections and plain headings only."""

    try:
        message = _get_client().messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=4000,
            messages=[{"role": "user", "content": prompt}],
        )
    except Exception:
        logger.exception("Claude SRS call failed")
        raise HTTPException(status_code=503, detail="AI service unavailable. Please try again.")
    return message.content[0].text


# Cross-check 
def run_crosscheck(req_list: str, answers_text: str, kb_context: str) -> list:
    """Build a cross-check prompt, call Claude, return a list of issue dicts."""
    prompt = f"""You are a senior requirements engineer.

Analyze the following requirements using:
1. Internal consistency (requirements vs requirements)
2. User answers (original input)
3. Domain knowledge (rules and regulations)

Requirements:
{req_list}

User Answers:
{answers_text}

Domain Knowledge:
{kb_context}

Find issues and return JSON array. Each issue must have:
- requirement_code: the code of the problematic requirement (e.g., "FR-1")
- issue_type: one of ["ambiguity", "duplicate", "inconsistency", "conflict", "unsupported"]
- issue_detail: clear explanation of the issue
- conflict_with: specify EXACTLY what this conflicts with:
  * If conflicts with another requirement: "Requirement FR-X" or "Requirement NFR-X"
  * If conflicts with domain rules: "Domain Knowledge: [quote the specific rule]"
  * If unsupported by user input: "User Answer: [quote what user said or didn't say]"
  * If duplicate: "Duplicate of FR-X"
  * If ambiguity: "N/A"

Quality threshold: Only report HIGH-CONFIDENCE issues that would significantly impact system correctness, safety, legal compliance, or user experience. Skip minor stylistic differences, trivial wording ambiguities, or issues with no real-world consequence. Aim for 5–15 meaningful issues maximum.
All JSON string values must be on a single line — do NOT use actual newlines inside strings. If no issues found, return [].
Return ONLY a valid JSON array, no other text."""

    try:
        message = _get_client().messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=4000,
            messages=[{"role": "user", "content": prompt}],
        )
    except Exception:
        logger.exception("Claude crosscheck call failed")
        raise HTTPException(status_code=503, detail="AI service unavailable. Please try again.")
    return parse_json_response(message.content[0].text)
