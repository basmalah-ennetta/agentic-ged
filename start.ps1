# ══════════════════════════════════════════════════════════
# HR Contract Pipeline - One-Click Startup Script
# Run this file to start ALL services at once
# ══════════════════════════════════════════════════════════

Write-Host "🚀 Starting HR Contract Pipeline..." -ForegroundColor Cyan

# ── Start MongoDB ──────────────────────────────────────────
Write-Host "`n📦 Starting MongoDB..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "net start MongoDB" -Verb RunAs

Start-Sleep -Seconds 3

# ── Start Ollama ───────────────────────────────────────────
Write-Host "🤖 Starting Ollama..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "ollama serve" -WindowStyle Minimized

Start-Sleep -Seconds 2

# ── Start Python Agents ────────────────────────────────────
Write-Host "🐍 Starting OCR Agent (port 8001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList `
  "cd '$PSScriptRoot\agents'; .\\ocr_agent\\venv\\Scripts\\activate; cd ocr_agent; python main.py" `
  -WindowStyle Normal

Start-Sleep -Seconds 2

Write-Host "🐍 Starting Classification Agent (port 8002)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList `
  "cd '$PSScriptRoot\agents'; .\\classification_agent\\venv\\Scripts\\activate; cd classification_agent; python main.py" `
  -WindowStyle Normal

Start-Sleep -Seconds 2

Write-Host "🐍 Starting Extraction Agent (port 8003)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList `
  "cd '$PSScriptRoot\agents'; .\\extraction_agent\\venv\\Scripts\\activate; cd extraction_agent; python main.py" `
  -WindowStyle Normal

Start-Sleep -Seconds 2

Write-Host "🐍 Starting Summarization Agent (port 8004)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList `
  "cd '$PSScriptRoot\agents'; .\\summarization_agent\\venv\\Scripts\\activate; cd summarization_agent; python main.py" `
  -WindowStyle Normal

Start-Sleep -Seconds 2

# ── Start Node.js Server ───────────────────────────────────
Write-Host "⚙️  Starting Node.js Server (port 5000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList `
  "cd '$PSScriptRoot\server'; npm run dev" `
  -WindowStyle Normal

Start-Sleep -Seconds 3

# ── Start React Frontend ───────────────────────────────────
Write-Host "⚛️  Starting React Frontend (port 5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList `
  "cd '$PSScriptRoot\client'; npm run dev" `
  -WindowStyle Normal

Start-Sleep -Seconds 3

# ── Open Browser ───────────────────────────────────────────
Write-Host "`n🌐 Opening browser..." -ForegroundColor Cyan
Start-Process "http://localhost:5173"

Write-Host "`n✅ All services started!" -ForegroundColor Green
Write-Host "   Frontend  → http://localhost:5173" -ForegroundColor White
Write-Host "   Backend   → http://localhost:5000" -ForegroundColor White
Write-Host "   OCR       → http://localhost:8001" -ForegroundColor White
Write-Host "   Classify  → http://localhost:8002" -ForegroundColor White
Write-Host "   Extract   → http://localhost:8003" -ForegroundColor White
Write-Host "   Summarize → http://localhost:8004" -ForegroundColor White
Write-Host "`n⚠️  Close the individual windows to stop each service." -ForegroundColor Yellow