# 🚀 Configuração Rápida - Sistema Pós-Contato

## ⚡ Início Rápido (5 minutos)

### 1️⃣ Instalar Dependências
```powershell
npm install
```

### 2️⃣ Configurar Variáveis de Ambiente

**IMPORTANTE:** O sistema precisa do arquivo `.env` para funcionar!

Copie o arquivo de exemplo:
```powershell
# Windows PowerShell
copy .env.example .env

# Linux/Mac
cp .env.example .env
```

OU crie manualmente um arquivo `.env` na raiz do projeto com:

```env
# .env
PORT=3000
JWT_SECRET=minha-chave-secreta-super-forte-desenvolvimento-2026
NODE_ENV=development
```

### 3️⃣ Iniciar o Servidor
```powershell
npm start
```

### 4️⃣ Acessar o Sistema
1. Abra: http://localhost:3000
2. Login padrão:
   - **Email:** admin@localiza.com
   - **Senha:** admin123

---

## ⚠️ Problemas Comuns

### ❌ "JWT_SECRET não está definido"
**Causa:** Arquivo `.env` não existe ou está vazio

**Solução:**
```powershell
# Crie o arquivo .env:
copy .env.example .env

# Reinicie o servidor:
npm start
```

### ❌ "Token inválido"
**Causa:** JWT_SECRET mudou ou cache do navegador

**Solução:**
```powershell
# 1. Verifique o .env
notepad .env

# 2. Limpe o navegador:
# - Pressione F12
# - Console
# - Digite: localStorage.clear()
# - Enter
# - Recarregue (F5)
```

Para mais detalhes, veja: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

## 🔐 Segurança

### Desenvolvimento (Local)
Use qualquer JWT_SECRET:
```env
JWT_SECRET=minha-chave-secreta-desenvolvimento-2026
```

### Produção (Render, Heroku, etc.)
Use uma chave forte e aleatória:

```bash
# Gerar chave forte no PowerShell:
-join ((65..90) + (97..122) + (48..57) + (33..47) | Get-Random -Count 32 | % {[char]$_})
```

Configure no Render.com:
1. Dashboard → Web Service
2. Environment → Add Environment Variable
3. **Key:** `JWT_SECRET`
4. **Value:** (cole a chave gerada)
5. Save Changes

⚠️ **NUNCA** compartilhe o JWT_SECRET publicamente!
⚠️ **NUNCA** commit o `.env` no Git!

---

## 📁 Estrutura de Arquivos

```
sistema-pos-contato/
├── .env                    ← VOCÊ PRECISA CRIAR ESTE ARQUIVO!
├── .env.example            ← Template para .env
├── .gitignore              ← .env já está ignorado
├── server.js               ← Servidor Node.js
├── database.js             ← SQLite (desenvolvimento)
├── database-postgres.js    ← PostgreSQL (produção)
├── package.json
├── public/
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── README.md
├── INSTALACAO.md
├── TROUBLESHOOTING.md      ← Guia de problemas
├── DEPLOY-RAPIDO.md        ← Deploy no Render
└── HOSPEDAGEM.md
```

---

## 📚 Documentação Completa

- **[README.md](./README.md)** - Visão geral e funcionalidades
- **[INSTALACAO.md](./INSTALACAO.md)** - Guia de instalação detalhado
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Solução de problemas
- **[DEPLOY-RAPIDO.md](./DEPLOY-RAPIDO.md)** - Deploy passo a passo
- **[HOSPEDAGEM.md](./HOSPEDAGEM.md)** - Opções de hospedagem

---

## 🎯 Próximos Passos

Após configurar:

1. ✅ Fazer login com usuário admin
2. ✅ Alterar senha padrão (Perfil → Alterar Senha)
3. ✅ Criar novos usuários (se for Liderança)
4. ✅ Importar dados de SS's
5. ✅ Começar a usar o sistema!

---

## 🆘 Precisa de Ajuda?

1. Veja [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. Confira os logs do servidor no terminal
3. Abra o Console do navegador (F12) para ver erros
4. Entre em contato com a equipe de TI

---

**Versão:** 1.0.0
**Data:** Março 2026
