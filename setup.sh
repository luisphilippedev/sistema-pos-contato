#!/bin/bash
# Script de configuração inicial do Sistema Pós-Contato
# Este script cria o arquivo .env necessário para o funcionamento do sistema

echo "🚀 Configurando Sistema Pós-Contato..."
echo ""

# Verificar se .env já existe
if [ -f .env ]; then
    echo "⚠️  Arquivo .env já existe!"
    read -p "Deseja sobrescrever? (s/N): " resposta
    if [[ ! "$resposta" =~ ^[Ss]$ ]]; then
        echo "✅ Mantendo .env existente"
        exit 0
    fi
fi

# Verificar se .env.example existe
if [ ! -f .env.example ]; then
    echo "❌ Erro: .env.example não encontrado!"
    exit 1
fi

# Copiar .env.example para .env
cp .env.example .env

echo "✅ Arquivo .env criado com sucesso!"
echo ""
echo "📝 Próximos passos:"
echo "   1. npm install (se ainda não fez)"
echo "   2. npm start"
echo "   3. Acesse http://localhost:3000"
echo ""
echo "🔐 Login padrão:"
echo "   Email: admin@localiza.com"
echo "   Senha: admin123"
echo ""
echo "📖 Documentação:"
echo "   - SETUP-RAPIDO.md - Guia de configuração"
echo "   - TROUBLESHOOTING.md - Solução de problemas"
echo ""
