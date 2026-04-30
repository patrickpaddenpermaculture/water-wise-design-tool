@echo off
echo Starting Paddy O Design Tool...
echo.

echo [1/2] Starting RAG Server (Patrick's portfolio knowledge base)...
start "Paddy O RAG Server" cmd /k "python rag_server.py"

echo Waiting for RAG server to start...
timeout /t 5 /nobreak > nul

echo [2/2] Starting Next.js web app...
start "Paddy O Web App" cmd /k "npm run dev"

echo.
echo ====================================
echo  Paddy O is starting up!
echo  Open: http://localhost:3000
echo  RAG:  http://localhost:8765/health
echo ====================================
pause
