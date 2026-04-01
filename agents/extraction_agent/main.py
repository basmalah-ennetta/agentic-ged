from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn
import sys
import os
import json
import re

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared.ollama_client import ask_ollama, check_ollama_health

app = FastAPI(
    title="Extraction Agent",
    description="Extracts key fields from HR contracts using Ollama AI",
    version="1.0.0"
)


# ── REQUEST MODEL ──────────────────────────────────────────────────────────
class ExtractionRequest(BaseModel):
    text: str
    contract_id: str
    document_type: str   # passed from classification agent


# ── EXTRACTION LOGIC ───────────────────────────────────────────────────────
def extract_key_info(text: str, document_type: str) -> dict:
    """
    Uses Ollama to extract specific key fields from the contract text.

    Returns a dict with employee name, salary, dates, job title, company.
    """

    system_prompt = """You are an expert HR contract analyst.
Your job is to extract specific key information from HR contract text.

Rules:
- Extract only information that is explicitly stated in the text
- If a field is not found, use an empty string ""
- For dates, use the format you find in the document (do not convert)
- For salary, include the currency symbol and period (e.g., "$3,000/month")
- You must respond with ONLY a valid JSON object, no extra text

Required JSON format:
{
  "employee_name": "full name of the employee",
  "company_name": "name of the company/employer",
  "job_title": "position or role title",
  "salary": "salary amount with currency and period",
  "start_date": "contract start date",
  "end_date": "contract end date or empty if permanent",
  "contract_duration": "duration if specified (e.g., 12 months)",
  "work_location": "city, country or remote",
  "notice_period": "notice period if mentioned"
}"""

    user_prompt = f"""Extract key information from this {document_type}.

Contract text:
{text[:4000]}

Return ONLY the JSON object with the extracted fields."""

    raw_response = ask_ollama(user_prompt, system_prompt)

    print(f"[Extraction Agent] Raw Ollama response: {raw_response[:300]}...")

    try:
        # Clean up the response in case AI added markdown formatting
        cleaned = raw_response.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("```")[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]

        result = json.loads(cleaned)
        return result

    except (json.JSONDecodeError, ValueError) as e:
        print(f"[Extraction Agent] JSON parse error: {e}")
        print("[Extraction Agent] Using regex fallback...")

        # ── REGEX FALLBACK ─────────────────────────────────────────────
        # If the AI doesn't return clean JSON, we try basic pattern matching
        # These are simple patterns that work for common contract formats

        extracted = {
            "employee_name": "",
            "company_name": "",
            "job_title": "",
            "salary": "",
            "start_date": "",
            "end_date": "",
            "contract_duration": "",
            "work_location": "",
            "notice_period": ""
        }

        # Try to find salary patterns like "$3,000" or "3000 USD" or "€2500"
        salary_pattern = r'[\$€£¥][\d,]+(?:\.\d{2})?(?:\s?(?:per|/)?\s?(?:month|year|annum|hour))?'
        salary_match = re.search(salary_pattern, text, re.IGNORECASE)
        if salary_match:
            extracted["salary"] = salary_match.group()

        # Try to find date patterns like "01/01/2024" or "January 1, 2024"
        date_pattern = r'\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\w+ \d{1,2},? \d{4})\b'
        dates = re.findall(date_pattern, text)
        if dates:
            extracted["start_date"] = dates[0]
        if len(dates) > 1:
            extracted["end_date"] = dates[1]

        return extracted


# ── HEALTH CHECK ───────────────────────────────────────────────────────────
@app.get("/health")
async def health_check():
    ollama_ok = check_ollama_health()
    return JSONResponse(content={
        "agent": "extraction_agent",
        "status": "running",
        "port": 8003,
        "ollama": "OK" if ollama_ok else "ERROR - run: ollama serve",
        "ready": ollama_ok
    })


# ── PROCESS ENDPOINT ───────────────────────────────────────────────────────
@app.post("/process")
async def process(request: ExtractionRequest):
    """
    Receives extracted text and pulls out key contract fields.
    Called by Node.js orchestrator after classification is complete.
    """

    print(f"\n[Extraction Agent] Processing contract: {request.contract_id}")
    print(f"[Extraction Agent] Document type: {request.document_type}")

    if not request.text or len(request.text.strip()) < 10:
        raise HTTPException(
            status_code=400,
            detail="Text is too short to extract information from."
        )

    try:
        result = extract_key_info(request.text, request.document_type)

        print(f"[Extraction Agent] Extracted: {json.dumps(result, indent=2)}")

        return JSONResponse(content={
            "success": True,
            "agent": "extraction_agent",
            "contract_id": request.contract_id,
            "extracted_info": {
                "employeeName": result.get("employee_name", ""),
                "companyName": result.get("company_name", ""),
                "jobTitle": result.get("job_title", ""),
                "salary": result.get("salary", ""),
                "startDate": result.get("start_date", ""),
                "endDate": result.get("end_date", ""),
                "contractDuration": result.get("contract_duration", ""),
                "workLocation": result.get("work_location", ""),
                "noticePeriod": result.get("notice_period", "")
            }
        })

    except Exception as e:
        print(f"[Extraction Agent] ERROR: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Extraction failed: {str(e)}"
        )


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8003, reload=True)