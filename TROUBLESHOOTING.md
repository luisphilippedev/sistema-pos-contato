# Guia de Solução de Problemas - Token Inválido

## ⚠️ Problema: "Token Inválido"

Se você está vendo erros como "Token inválido", "Token expirado" ou o sistema está pedindo login constantemente, siga este guia.

---

## 🔍 Causas Comuns

### 1. JWT_SECRET não está configurado
**Sintoma:** Sistema não inicia ou exibe erro "JWT_SECRET não está definido"

**Solução:**
1. Certifique-se que o arquivo `.env` existe na raiz do projeto
2. Abra o arquivo `.env` e verifique se tem a linha:
```
JWT_SECRET=minha-chave-secreta-super-forte-desenvolvimento-2026
```
3. Se o arquivo não existir, copie o `.env.example`:
```powershell
cp .env.example .env
```

### 2. JWT_SECRET mudou após tokens serem criados
**Sintoma:** Usuários conseguem fazer login, mas ao navegar no sistema recebem "Token inválido"

**Solução:**
1. O JWT_SECRET no `.env` foi alterado após usuários fazerem login
2. Todos os usuários precisam fazer logout e login novamente
3. OU: Restaure o JWT_SECRET anterior no `.env`

**Como resolver definitivamente:**
```powershell
# 1. Pare o servidor (Ctrl+C)

# 2. Abra o .env e garanta que JWT_SECRET está definido
# .env deve conter:
JWT_SECRET=minha-chave-secreta-super-forte-desenvolvimento-2026

# 3. Reinicie o servidor
npm start

# 4. Limpe o localStorage do navegador:
# - Abra o Console (F12)
# - Digite: localStorage.clear()
# - Aperte Enter
# - Recarregue a página (F5)
```

### 3. Tokens antigos no navegador
**Sintoma:** "Token inválido" mesmo após reiniciar o servidor

**Solução - Limpar cache do navegador:**

**Opção 1: Automático (recomendado)**
1. Abra o sistema no navegador
2. Pressione F12 (abre DevTools)
3. Clique com botão direito no botão de recarregar
4. Selecione "Limpar cache e recarregar forçadamente"

**Opção 2: Manual**
1. Abra o sistema no navegador
2. Pressione F12
3. Vá na aba "Console"
4. Digite: `localStorage.clear()`
5. Pressione Enter
6. Recarregue a página (F5)

### 4. Tokens expirados
**Sintoma:** Sistema funcionou por dias, depois começou a pedir login novamente

**Solução:**
- Tokens JWT expiram após 7 dias (configurado em `server.js:126`)
- Isso é normal e esperado por segurança
- Basta fazer login novamente

---

## 🚀 Solução Rápida (Resolve 90% dos casos)

Execute estes comandos na ordem:

```powershell
# 1. Pare o servidor (Ctrl+C se estiver rodando)

# 2. Verifique se .env existe
ls .env

# 3. Se não existir, crie:
cp .env.example .env

# 4. Abra o .env e verifique JWT_SECRET
notepad .env

# 5. Inicie o servidor novamente
npm start

# 6. No navegador:
# - Pressione F12
# - Aba Console
# - Digite: localStorage.clear()
# - Enter
# - Recarregue (F5)
```

---

## 🔧 Verificação de Ambiente

### Checar se JWT_SECRET está carregado:

```powershell
# No PowerShell, na pasta do projeto:
node -e "require('dotenv').config(); console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'DEFINIDO' : 'NÃO DEFINIDO')"
```

**Deve mostrar:** `JWT_SECRET: DEFINIDO`

Se mostrar "NÃO DEFINIDO", o arquivo `.env` não está na pasta correta ou está mal formatado.

---

## 📊 Entendendo o Fluxo de Autenticação

```
1. Usuário faz LOGIN
   ↓
2. Servidor gera TOKEN usando JWT_SECRET
   ↓
3. Token é armazenado no navegador (localStorage)
   ↓
4. Todas as requisições enviam o TOKEN
   ↓
5. Servidor VALIDA token usando MESMO JWT_SECRET
   ↓
6. Se JWT_SECRET mudou → Token Inválido ❌
   Se JWT_SECRET igual → Token Válido ✅
```

**IMPORTANTE:** O JWT_SECRET deve ser SEMPRE o mesmo para validar tokens existentes!

---

## 🏢 Em Produção (Render, Heroku, etc.)

### Configurar JWT_SECRET no Render:

1. Acesse o dashboard do Render
2. Selecione seu Web Service
3. Vá em **"Environment"**
4. Adicione variável:
   - **Key:** `JWT_SECRET`
   - **Value:** `SuaChaveSecretaSuperForte123!@#`
5. Clique **"Save Changes"**

### ⚠️ NUNCA mude o JWT_SECRET em produção sem avisar!
- Todos os usuários perderão a sessão
- Todos precisarão fazer login novamente

---

## 🐛 Debug Avançado

### Ver logs do servidor:

Quando o token falha, o servidor mostra logs detalhados:

```
❌ Erro ao validar token: invalid signature
   Tipo de erro: JsonWebTokenError
```

**Tipos de erro:**
- `TokenExpiredError` → Token expirou (após 7 dias)
- `JsonWebTokenError` → Token inválido ou JWT_SECRET mudou
- `NotBeforeError` → Token usado antes da hora

### Ver token no navegador:

```javascript
// No Console do navegador (F12)
console.log('Token:', localStorage.getItem('token'));
```

### Decodificar token (sem validar):

```javascript
// No Console do navegador (F12)
const token = localStorage.getItem('token');
const [header, payload, signature] = token.split('.');
console.log('Payload:', JSON.parse(atob(payload)));
```

Deve mostrar algo como:
```json
{
  "id": 1,
  "email": "admin@localiza.com",
  "perfil": "lideranca",
  "iat": 1234567890,
  "exp": 1234567890
}
```

---

## ✅ Checklist de Verificação

- [ ] Arquivo `.env` existe na raiz do projeto
- [ ] `.env` contém `JWT_SECRET=...`
- [ ] JWT_SECRET não está vazio
- [ ] Servidor reiniciado após alterar `.env`
- [ ] localStorage limpo no navegador
- [ ] Página recarregada após limpar localStorage
- [ ] Novo login realizado

Se todos os itens estão ✅ e ainda não funciona, veja logs do servidor para mais detalhes.

---

## 📞 Suporte

Se o problema persistir:

1. Verifique os logs do servidor no terminal
2. Verifique o Console do navegador (F12) para erros
3. Tire prints dos erros
4. Entre em contato com a equipe de TI

---

## 🔐 Boas Práticas de Segurança

### Desenvolvimento:
```
JWT_SECRET=minha-chave-secreta-desenvolvimento-2026
```

### Produção:
```
JWT_SECRET=kJ8$mP2#xQ9@wE5&rT7^yU3*iO0!aS4%dF6(
```

**Gerar chave forte:**
```bash
# Linux/Mac:
openssl rand -base64 32

# PowerShell:
-join ((65..90) + (97..122) + (48..57) + (33..47) | Get-Random -Count 32 | % {[char]$_})
```

---

**Última atualização:** Março 2026
