from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.requirements import Requirement
from app.models.domain import UserSession, Domain
from app.schemas.crosscheck import IssueItem, CrossCheckResponse
from app.core.knowledge_base import retrieve_context
from app.services.ai_service import run_crosscheck
from app.services.requirement_service import get_questions_for_answers

COLOR_MAP = {
    "ambiguity": "#FFA500",
    "duplicate": "#FF6B6B",
    "inconsistency": "#9B59B6",
    "conflict": "#FF0000",
    "unsupported": "#3498DB",
}




def run(session_id: str, db: Session, user_id=None) -> CrossCheckResponse:
    q = db.query(UserSession).filter(UserSession.id == session_id)
    if user_id is not None:
        q = q.filter(UserSession.user_id == user_id)
    session = q.first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    domain = db.query(Domain).filter(Domain.id == session.domain_id).first()
    if not domain:
        raise HTTPException(status_code=404, detail="Domain not found")

    raw_answers = session.answers or []
    questions_map = get_questions_for_answers(raw_answers, db)
    answers_text = build_answers_text(raw_answers, questions_map, session.document_text)

    requirements = db.query(Requirement).filter(Requirement.session_id == session_id).all()
    if not requirements:
        raise HTTPException(status_code=404, detail="No requirements found")

    req_list = "\n".join([f"{r.code}: {r.description}" for r in requirements])
    kb_context = retrieve_context(domain.name, req_list)
    issues_data = run_crosscheck(req_list, answers_text, kb_context)

    issues, ambiguities, duplicates, inconsistencies = map_issues(issues_data, requirements)
    return CrossCheckResponse(
        session_id=session_id,
        issues=issues,
        ambiguities_count=ambiguities,
        duplicates_count=duplicates,
        inconsistencies_count=inconsistencies,
        total_issues=len(issues),
    )


def build_answers_text(raw_answers: list, questions_map: dict, document_text: str = "") -> str:
    text = "\n".join([
        f"Q: {questions_map.get(a.get('question_id'), 'Unknown question')} A: {a.get('answer', '')}"
        for a in raw_answers
    ])
    if document_text and document_text.strip():
        doc_section = f"User provided document:\n{document_text.strip()}"
        return f"{text}\n\n{doc_section}".strip() if text else doc_section
    return text or "No user answers provided"


def map_issues(issues_data: list, requirements: list) -> tuple:
    req_map = {r.code: r for r in requirements}
    issues = []
    ambiguities = 0
    duplicates = 0
    inconsistencies = 0

    for issue in issues_data:
        code = issue.get("requirement_code", "")
        issue_type = issue.get("issue_type", "")
        req = req_map.get(code)

        if req and issue_type in COLOR_MAP:
            issues.append(IssueItem(
                requirement_id=req.id,
                code=code,
                description=req.description,
                issue_type=issue_type,
                issue_detail=issue.get("issue_detail", ""),
                highlight_color=COLOR_MAP[issue_type],
                conflict_with=issue.get("conflict_with", ""),
            ))
            if issue_type == "ambiguity":
                ambiguities += 1
            elif issue_type == "duplicate":
                duplicates += 1
            elif issue_type == "inconsistency":
                inconsistencies += 1

    return issues, ambiguities, duplicates, inconsistencies
