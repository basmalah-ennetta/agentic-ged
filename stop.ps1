# ══════════════════════════════════════════════════════════
# HR Contract Pipeline - Stop All Services
# ══════════════════════════════════════════════════════════

Write-Host "🛑 Stopping HR Contract Pipeline..." -ForegroundColor Red

# Kill Python agents (uvicorn processes)
Get-Process -Name "python" -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Host "✅ Python agents stopped" -ForegroundColor Green

# Kill Node.js server
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Host "✅ Node.js server stopped" -ForegroundColor Green

# Stop MongoDB service
net stop MongoDB
Write-Host "✅ MongoDB stopped" -ForegroundColor Green

Write-Host "`n✅ All services stopped!" -ForegroundColor Green