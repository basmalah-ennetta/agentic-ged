from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn
import sys
import os
from typing import Optional

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared.ollama_client import ask_ollama, check_ollama_health

app = FastAPI(
    title="Summarization Agent",
    description="Generates human-readable summaries of HR contracts",
    version="1.0.0"
)


# ── REQUEST MODEL ──────────────────────────────────────────────────────────
class SummarizationRequest(BaseModel):
    text: str
    contract_id: str
    document_type: str
    extracted_info: dict    # the fields already extracted by extraction agent


# ── SUMMARIZATION LOGIC ────────────────────────────────────────────────────
def generate_summary(
    text: str,
    document_type: str,
    extracted_info: dict
) -> str:
    """
    Uses Ollama to generate a clear, concise summary of the contract.

    The summary is written in plain English so any HR person can
    quickly understand the contract without reading the full document.
    """

    # Format the extracted info nicely for the prompt
    # We only include fields that actually have values
    info_lines = []
    field_labels = {
        "employeeName": "Employee Name",
        "companyName": "Company",
        "jobTitle": "Job Title",
        "salary": "Salary",
        "startDate": "Start Date",
        "endDate": "End Date",
        "contractDuration": "Duration",
        "workLocation": "Work Location",
        "noticePeriod": "Notice Period"
    }

    for key, label in field_labels.items():
        value = extracted_info.get(key, "")
        if value:  # only include if not empty
            info_lines.append(f"- {label}: {value}")

    info_section = "\n".join(info_lines) if info_lines else "No key info extracted"

    system_prompt = """You are an expert HR document summarizer.
Your job is to write clear, professional summaries of HR contracts.

Rules for your summary:
- Write in plain English that any HR professional can understand
- Be concise but complete — cover all important points
- Use a professional but friendly tone
- Structure it in short paragraphs, not bullet points
- Maximum 3 paragraphs
- Start with what TYPE of document this is and WHO it involves
- Include all key terms (salary, dates, role)
- End with any notable clauses or conditions"""

    user_prompt = f"""Write a professional summary for this {document_type.replace('_', ' ')}.

Key information already extracted:
{info_section}

Full contract text (for context):
{text[:1000]}

Write a clear 2-3 paragraph summary."""

    summary = ask_ollama(user_prompt, system_prompt)
    return summary.strip()


# ── HEALTH CHECK ───────────────────────────────────────────────────────────
@app.get("/health")
async def health_check():
    ollama_ok = check_ollama_health()
    return JSONResponse(content={
        "agent": "summarization_agent",
        "status": "running",
        "port": 8004,
        "ollama": "OK" if ollama_ok else "ERROR - run: ollama serve",
        "ready": ollama_ok
    })


# ── PROCESS ENDPOINT ───────────────────────────────────────────────────────
@app.post("/process")
async def process(request: SummarizationRequest):
    """
    Generates a human-readable summary of the contract.
    Called by Node.js orchestrator after extraction is complete.
    """

    print(f"\n[Summarization Agent] Processing contract: {request.contract_id}")
    print(f"[Summarization Agent] Document type: {request.document_type}")

    if not request.text or len(request.text.strip()) < 10:
        raise HTTPException(
            status_code=400,
            detail="Text is too short to summarize."
        )

    try:
        summary = generate_summary(
            request.text,
            request.document_type,
            request.extracted_info
        )

        print(f"[Summarization Agent] Summary generated "
              f"({len(summary)} characters)")

        return JSONResponse(content={
            "success": True,
            "agent": "summarization_agent",
            "contract_id": request.contract_id,
            "summary": summary
        })

    except Exception as e:
        print(f"[Summarization Agent] ERROR: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Summarization failed: {str(e)}"
        )


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8004, reload=True)