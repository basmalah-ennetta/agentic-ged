from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn
import sys
import os
import json

# Add parent directory to path so we can import from shared/
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared.ollama_client import ask_ollama, check_ollama_health

app = FastAPI(
    title="Classification Agent",
    description="Classifies HR documents into categories using Ollama AI",
    version="1.0.0"
)


# ── REQUEST MODEL ──────────────────────────────────────────────────────────
class ClassificationRequest(BaseModel):
    text: str          # the extracted text from OCR
    contract_id: str   # MongoDB ID for reference


# ── CLASSIFICATION LOGIC ───────────────────────────────────────────────────
def classify_document(text: str) -> dict:
    """
    Sends the extracted text to Ollama and asks it to classify
    what type of HR document it is.

    Returns a dict with:
        - document_type: the category name
        - confidence: how confident the AI is
        - reasoning: why it chose that category
    """

    # This is the "system prompt" — it sets the AI's role and behavior
    # Think of it as giving the AI its job description
    system_prompt = """You are an expert HR document classifier.
Your job is to analyze HR contract text and classify it into exactly one category.

Available categories:
- employment_contract: Standard employment agreement between employer and employee
- nda: Non-disclosure agreement / confidentiality agreement
- freelance_agreement: Contract for freelance or independent contractor work
- internship_agreement: Contract specifically for interns or trainees
- amendment: A modification or addendum to an existing contract
- termination_letter: Document related to ending employment
- other: Any other HR document that doesn't fit above categories

You must respond with ONLY a valid JSON object. No explanation, no markdown, no extra text.
The JSON must have exactly these fields:
{
  "document_type": "category_name_here",
  "confidence": "high|medium|low",
  "reasoning": "one sentence explanation"
}"""

    # This is the actual question we ask the AI
    # We include the first 3000 characters of text — usually enough to classify
    # (we limit it to avoid overwhelming the model with too much text)
    user_prompt = f"""Classify this HR document based on its content.

Document text (first 3000 characters):
{text[:3000]}

Respond with ONLY the JSON object."""

    # Send to Ollama and get response
    raw_response = ask_ollama(user_prompt, system_prompt)

    print(f"[Classification Agent] Raw Ollama response: {raw_response}")

    # Parse the JSON response from the AI
    # The AI should return a clean JSON string
    try:
        # Sometimes the AI wraps JSON in markdown code blocks
        # We clean that up just in case
        cleaned = raw_response.strip()
        if cleaned.startswith("```"):
            # Remove markdown code block markers
            cleaned = cleaned.split("```")[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]  # remove the word "json"

        result = json.loads(cleaned)

        # Validate the response has the fields we need
        if "document_type" not in result:
            raise ValueError("Missing document_type field")

        return result

    except (json.JSONDecodeError, ValueError) as e:
        # If the AI didn't return valid JSON, we return a fallback
        print(f"[Classification Agent] JSON parse error: {e}")
        print(f"[Classification Agent] Attempting keyword-based fallback...")

        # Simple keyword-based fallback classification
        text_lower = text.lower()
        if any(word in text_lower for word in ['non-disclosure', 'confidential', 'nda']):
            doc_type = 'nda'
        elif any(word in text_lower for word in ['internship', 'intern', 'trainee']):
            doc_type = 'internship_agreement'
        elif any(word in text_lower for word in ['freelance', 'contractor', 'independent']):
            doc_type = 'freelance_agreement'
        elif any(word in text_lower for word in ['termination', 'dismissed', 'resignation']):
            doc_type = 'termination_letter'
        elif any(word in text_lower for word in ['amendment', 'addendum', 'modification']):
            doc_type = 'amendment'
        elif any(word in text_lower for word in ['employment', 'employee', 'employer', 'salary']):
            doc_type = 'employment_contract'
        else:
            doc_type = 'other'

        return {
            "document_type": doc_type,
            "confidence": "low",
            "reasoning": "Classified using keyword fallback due to AI response parsing error"
        }


# ── HEALTH CHECK ───────────────────────────────────────────────────────────
@app.get("/health")
async def health_check():
    ollama_ok = check_ollama_health()
    return JSONResponse(content={
        "agent": "classification_agent",
        "status": "running",
        "port": 8002,
        "ollama": "OK" if ollama_ok else "ERROR - run: ollama serve",
        "ready": ollama_ok
    })


# ── PROCESS ENDPOINT ───────────────────────────────────────────────────────
@app.post("/process")
async def process(request: ClassificationRequest):
    """
    Receives extracted text and classifies the document type.
    Called by the Node.js orchestrator after OCR is complete.
    """

    print(f"\n[Classification Agent] Processing contract: {request.contract_id}")
    print(f"[Classification Agent] Text length: {len(request.text)} characters")

    # Make sure we have text to work with
    if not request.text or len(request.text.strip()) < 10:
        raise HTTPException(
            status_code=400,
            detail="Text is too short to classify. OCR may have failed."
        )

    try:
        # Run the classification
        result = classify_document(request.text)

        print(f"[Classification Agent] Result: {result['document_type']} "
              f"(confidence: {result.get('confidence', 'unknown')})")

        return JSONResponse(content={
            "success": True,
            "agent": "classification_agent",
            "contract_id": request.contract_id,
            "document_type": result["document_type"],
            "confidence": result.get("confidence", "medium"),
            "reasoning": result.get("reasoning", "")
        })

    except Exception as e:
        print(f"[Classification Agent] ERROR: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Classification failed: {str(e)}"
        )


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True)