@echo off
setlocal

rem Vai da pasta scripts para a raiz do projeto.
cd /d "%~dp0\.."

echo ==========================================
echo        FinDash - Ambiente de teste
echo ==========================================
echo.

rem Usa o ambiente virtual quando existir.
if exist ".venv\Scripts\python.exe" (
    set "PYTHON_CMD=%CD%\.venv\Scripts\python.exe"
    goto iniciar
)

rem Caso contrario, usa o Python Launcher do Windows.
where py >nul 2>nul
if errorlevel 1 goto python_nao_encontrado

set "PYTHON_CMD=py"

:iniciar
echo Python selecionado: %PYTHON_CMD%
echo.

echo Iniciando a API...
start "FinDash API" cmd /k "%PYTHON_CMD% -m uvicorn main:app --reload"

timeout /t 2 /nobreak >nul

echo Iniciando o frontend...
start "FinDash Frontend" cmd /k "%PYTHON_CMD% -m http.server 5500 --directory frontend"

timeout /t 2 /nobreak >nul

echo Abrindo o navegador...
start "" "http://127.0.0.1:5500"

echo.
echo Backend:  http://127.0.0.1:8000
echo Frontend: http://127.0.0.1:5500
echo.
echo Mantenha as janelas "FinDash API" e "FinDash Frontend" abertas.
echo.

endlocal
exit /b 0

:python_nao_encontrado
echo.
echo [ERRO] O comando py nao foi encontrado.
echo Teste manualmente:
echo     py --version
echo.
pause

endlocal
exit /b 1
