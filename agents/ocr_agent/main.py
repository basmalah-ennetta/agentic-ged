# ── IMPORTS ────────────────────────────────────────────────────────────────

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
import uvicorn
import pytesseract       # Python wrapper around Tesseract OCR engine
from PIL import Image    # Pillow — opens and processes image files
import pdf2image         # converts PDF pages into PIL Image objects
import tempfile          # creates safe temporary files and directories
import os                # file path and directory operations
import shutil            # for copying/moving files
import sys

# ── WINDOWS CONFIGURATION ──────────────────────────────────────────────────
# On Windows, pytesseract cannot find tesseract.exe automatically
# We must give it the exact path where Tesseract was installed
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# ── CREATE FASTAPI APP ─────────────────────────────────────────────────────
app = FastAPI(
    title="OCR Agent",
    description="Extracts text from PDF and image files using Tesseract OCR",
    version="1.0.0"
)


# ── HELPER: EXTRACT TEXT FROM A SINGLE IMAGE ──────────────────────────────
def extract_text_from_image(image: Image.Image) -> str:
    """
    Takes a PIL Image object and returns the text found in it.

    Parameters:
        image: a PIL Image object (can come from an image file or a PDF page)

    Returns:
        str: the extracted text
    """
    # lang='eng' tells Tesseract to use English language data
    # You can add more languages like lang='eng+fra' for English + French
    #
    # config='--psm 3' sets the "page segmentation mode"
    # psm 3 = fully automatic page segmentation (best for documents)
    text = pytesseract.image_to_string(
        image,
        lang='eng+fra',
        config='--psm 3'
    )
    return text


# ── HELPER: PROCESS A PDF FILE ─────────────────────────────────────────────
def extract_text_from_pdf(file_path: str) -> str:
    """
    Converts each page of a PDF into an image, then runs OCR on each page.
    Combines all pages' text into one string.

    Parameters:
        file_path: the path to the PDF file on disk

    Returns:
        str: combined text from all pages
    """
    all_text = []

    # pdf2image.convert_from_path() converts each PDF page into a PIL Image
    # dpi=300 sets the resolution — higher DPI = better OCR accuracy
    # but also slower and uses more memory
    # 300 DPI is the standard for good OCR quality
    pages = pdf2image.convert_from_path(
        file_path,
        dpi=300,
        fmt='PNG'    # convert pages to PNG format images
    )

    # Process each page one by one
    for page_number, page_image in enumerate(pages, start=1):
        print(f"  Processing page {page_number} of {len(pages)}...")

        # Run OCR on this page's image
        page_text = extract_text_from_image(page_image)

        # Add a page separator so we know where each page starts
        all_text.append(f"--- Page {page_number} ---\n{page_text}")

    # Join all pages with a newline between them
    return "\n\n".join(all_text)


# ── HELPER: PROCESS AN IMAGE FILE ─────────────────────────────────────────
def extract_text_from_image_file(file_path: str) -> str:
    """
    Opens an image file and runs OCR on it.

    Parameters:
        file_path: the path to the image file on disk

    Returns:
        str: the extracted text
    """
    # Image.open() opens the image file into a PIL Image object
    image = Image.open(file_path)

    # Convert to RGB just in case it's in a different color mode
    # (e.g., RGBA for PNG with transparency, or grayscale)
    # Tesseract works best with RGB images
    image = image.convert('RGB')

    return extract_text_from_image(image)


# ── HEALTH CHECK ENDPOINT ──────────────────────────────────────────────────
@app.get("/health")
async def health_check():
    """
    Checks if the OCR agent and Tesseract are working correctly.
    """
    try:
        # Try to get Tesseract version — if this works, Tesseract is installed
        version = pytesseract.get_tesseract_version()
        tesseract_status = f"OK (version {version})"
        tesseract_ok = True
    except Exception as e:
        tesseract_status = f"ERROR: {str(e)}"
        tesseract_ok = False

    return JSONResponse(content={
        "agent": "ocr_agent",
        "status": "running",
        "port": 8001,
        "tesseract": tesseract_status,
        "ready": tesseract_ok
    })


# ── MAIN PROCESS ENDPOINT ──────────────────────────────────────────────────
@app.post("/process")
async def process_file(file: UploadFile = File(...)):
    """
    Receives a PDF or image file, extracts all text using OCR,
    and returns the extracted text.

    The Node.js orchestrator will call this endpoint with the contract file.

    Expected input:  multipart form-data with a file field named "file"
    Returns:         JSON with extracted text and metadata
    """

    print(f"\n[OCR Agent] Received file: {file.filename}")

    # Validate file type
    allowed_extensions = ['.pdf', '.png', '.jpg', '.jpeg', '.tiff', '.tif']
    file_extension = os.path.splitext(file.filename)[1].lower()

    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file_extension}. "
                   f"Allowed: {allowed_extensions}"
        )

    # tempfile.mkdtemp() creates a unique temporary folder
    # This folder is automatically cleaned up when we're done
    temp_dir = tempfile.mkdtemp()

    try:
        # ── SAVE THE UPLOADED FILE TO DISK ─────────────────────────────
        # FastAPI gives us the file as a stream — we save it to a temp file
        temp_file_path = os.path.join(temp_dir, file.filename)

        # Read the uploaded file content
        file_content = await file.read()

        # Write it to the temporary file
        with open(temp_file_path, 'wb') as temp_file:
            temp_file.write(file_content)

        print(f"[OCR Agent] Saved to temp file: {temp_file_path}")
        print(f"[OCR Agent] File size: {len(file_content)} bytes")

        # ── EXTRACT TEXT BASED ON FILE TYPE ────────────────────────────
        extracted_text = ""

        if file_extension == '.pdf':
            print("[OCR Agent] Processing as PDF...")
            extracted_text = extract_text_from_pdf(temp_file_path)

        else:
            print("[OCR Agent] Processing as image...")
            extracted_text = extract_text_from_image_file(temp_file_path)

        # ── CLEAN UP THE TEXT ───────────────────────────────────────────
        # Remove excessive whitespace and empty lines
        lines = extracted_text.split('\n')
        # Filter out lines that are just whitespace
        cleaned_lines = [line for line in lines if line.strip()]
        cleaned_text = '\n'.join(cleaned_lines)

        print(f"[OCR Agent] Extraction complete. "
              f"Characters extracted: {len(cleaned_text)}")

        # ── RETURN THE RESULT ───────────────────────────────────────────
        return JSONResponse(content={
            "success": True,
            "agent": "ocr_agent",
            "filename": file.filename,
            "file_type": file_extension,
            "character_count": len(cleaned_text),
            "extracted_text": cleaned_text
        })

    except Exception as e:
        # Log the error and return a failure response
        print(f"[OCR Agent] ERROR: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"OCR processing failed: {str(e)}"
        )

    finally:
        # ── ALWAYS CLEAN UP TEMP FILES ──────────────────────────────────
        # "finally" runs whether we succeeded or failed
        # This ensures we never leave temp files sitting on disk
        shutil.rmtree(temp_dir, ignore_errors=True)
        print(f"[OCR Agent] Cleaned up temp directory")


# ── START THE SERVER ───────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)