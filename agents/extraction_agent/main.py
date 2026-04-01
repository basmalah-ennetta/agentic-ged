from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared.ollama_client import check_ollama_health

app = FastAPI(
    title="Extraction Agent",
    description="Extracts key information from HR contracts using Ollama AI",
    version="1.0.0"
)

class ExtractionRequest(BaseModel):
    text: str            # the extracted text
    contract_id: str     # MongoDB ID of the contract
    document_type: str   # what type of document (from classification agent)


@app.get("/health")
async def health_check():
    ollama_ok = check_ollama_health()
    return JSONResponse(content={
        "agent": "extraction_agent",
        "status": "running",
        "port": 8003,
        "ollama": "OK" if ollama_ok else "ERROR - run: ollama serve"
    })


@app.post("/process")
async def process(request: ExtractionRequest):
    """
    Receives extracted text and pulls out key fields:
    employee name, salary, dates, job title, company name.
    Full implementation later.
    """
    return JSONResponse(content={
        "success": True,
        "agent": "extraction_agent",
        "message": "Extraction agent is ready. Full implementation later.",
        "contract_id": request.contract_id
    })


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8003, reload=True)