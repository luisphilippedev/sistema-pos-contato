@echo off
REM Script de configuração inicial do Sistema Pós-Contato
REM Este script cria o arquivo .env necessário para o funcionamento do sistema

echo.
echo 🚀 Configurando Sistema Pós-Contato...
echo.

REM Verificar se .env já existe
if exist .env (
    echo ⚠️  Arquivo .env já existe!
    set /p resposta="Deseja sobrescrever? (s/N): "
    if /i not "%resposta%"=="s" (
        echo ✅ Mantendo .env existente
        exit /b 0
    )
)

REM Verificar se .env.example existe
if not exist .env.example (
    echo ❌ Erro: .env.example não encontrado!
    exit /b 1
)

REM Copiar .env.example para .env
copy .env.example .env >nul

echo ✅ Arquivo .env criado com sucesso!
echo.
echo 📝 Próximos passos:
echo    1. npm install (se ainda não fez)
echo    2. npm start
echo    3. Acesse http://localhost:3000
echo.
echo 🔐 Login padrão:
echo    Email: admin@localiza.com
echo    Senha: admin123
echo.
echo 📖 Documentação:
echo    - SETUP-RAPIDO.md - Guia de configuração
echo    - TROUBLESHOOTING.md - Solução de problemas
echo.
pause
