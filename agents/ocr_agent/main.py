from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import uvicorn        
import pytesseract    
from PIL import Image 
import pdf2image      
import tempfile       
import os             
import sys

# ── WINDOWS ONLY: Tell pytesseract where Tesseract is installed ────────────
# On Windows, pytesseract can't find Tesseract automatically
# We need to give it the full path to tesseract.exe
# If your installation path is different, update this line
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# ── CREATE FASTAPI APP ─────────────────────────────────────────────────────
app = FastAPI(
    title="OCR Agent",
    description="Extracts text from PDF and image files using Tesseract OCR",
    version="1.0.0"
)

# ── HEALTH CHECK ENDPOINT ──────────────────────────────────────────────────
@app.get("/health")
async def health_check():
    """
    Returns the health status of this agent.
    Node.js will call this to verify the agent is running before using it.
    """
    # Test if Tesseract is accessible
    try:
        version = pytesseract.get_tesseract_version()
        tesseract_status = f"OK (version {version})"
    except Exception as e:
        tesseract_status = f"ERROR: {str(e)}"

    return JSONResponse(content={
        "agent": "ocr_agent",
        "status": "running",
        "port": 8001,
        "tesseract": tesseract_status
    })


# ── PROCESS ENDPOINT ───────────────────────────────────────────────────────
@app.post("/process")
async def process_file(file: UploadFile = File(...)):
    """
    Receives a PDF or image file, extracts all text from it using OCR,
    and returns the extracted text.

    This endpoint will be called by the Node.js orchestrator.
    """
    # full ocr agent implementation later
    # For now, return a placeholder response
    return JSONResponse(content={
        "success": True,
        "agent": "ocr_agent",
        "message": "OCR agent is ready. Full implementation coming in Phase 5.",
        "filename": file.filename
    })


# ── START THE SERVER ───────────────────────────────────────────────────────
if __name__ == "__main__":
    # Run this file directly with: python main.py
    # uvicorn starts the FastAPI server
    # host="0.0.0.0" means accept connections from any network interface
    # port=8001 is this agent's dedicated port
    # reload=True automatically restarts when you save the file (like nodemon)
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)