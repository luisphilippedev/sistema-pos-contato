# 🌐 HOSPEDAGEM GRATUITA - Render.com

## 🎯 Objetivo
Colocar o sistema na internet para que todos acessem apenas com um link, **SEM INSTALAR NADA** no computador.

---

## 📋 PASSO A PASSO COMPLETO

### 1️⃣ Criar Conta no GitHub (Grátis)

**O que é:** GitHub guarda o código do seu sistema online.

1. Acesse: https://github.com
2. Clique em **"Sign up"** (Inscrever-se)
3. Crie uma conta com seu email
4. Confirme o email que eles enviarem
5. Faça login

### 2️⃣ Instalar Git no Windows

1. Baixe: https://git-scm.com/download/win
2. Execute o instalador
3. Clique "Next" em tudo (deixe padrão)
4. **Reinicie o PowerShell** após instalar

### 3️⃣ Preparar o Sistema para Hospedagem

Abra o PowerShell e execute:

```powershell
# Entre na pasta do sistema
cd "c:\Users\133407\OneDrive - Localiza\Área de Trabalho\Sistema - Pos contato"

# Configure o Git (use seu nome e email)
git config --global user.name "Seu Nome"
git config --global user.email "seu.email@localiza.com"

# Inicialize o repositório Git
git init

# Adicione todos os arquivos
git add .

# Faça o primeiro commit
git commit -m "Sistema Pós-Contato v1.0"
```

### 4️⃣ Enviar Código para o GitHub

No navegador (GitHub):

1. Clique no **"+"** no canto superior direito
2. Selecione **"New repository"** (Novo repositório)
3. Preencha:
   - **Repository name:** sistema-pos-contato
   - **Descrição:** Sistema de Pós-Contato com Cliente
   - Deixe **Public** (ou Private se preferir)
   - **NÃO** marque nenhuma opção de README/gitignore
4. Clique **"Create repository"**

Na tela seguinte, copie os comandos da seção **"...or push an existing repository from the command line"**

No PowerShell, execute algo como:

```powershell
git remote add origin https://github.com/SEU_USUARIO/sistema-pos-contato.git
git branch -M main
git push -u origin main
```

*Vai pedir login do GitHub - use suas credenciais*

### 5️⃣ Criar Conta no Render.com (Grátis)

1. Acesse: https://render.com
2. Clique em **"Get Started for Free"**
3. Escolha **"Sign in with GitHub"** (Entrar com GitHub)
4. Autorize o Render a acessar seus repositórios

### 6️⃣ Criar Web Service no Render

1. No dashboard do Render, clique **"New +"**
2. Selecione **"Web Service"**
3. Conecte seu repositório **sistema-pos-contato**
4. Clique **"Connect"**

Configure assim:

| Campo | Valor |
|-------|-------|
| **Name** | sistema-pos-contato |
| **Region** | Oregon (US West) - mais próximo |
| **Branch** | main |
| **Runtime** | Node |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | **Free** |

### 7️⃣ Configurar Variáveis de Ambiente

Ainda na tela de configuração, role até **"Environment Variables"**:

Clique **"Add Environment Variable"** e adicione:

| Key | Value |
|-----|-------|
| `JWT_SECRET` | `SuaChaveSecretaSuperForte123!@#` |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |

### 8️⃣ Deploy!

1. Clique em **"Create Web Service"** no final da página
2. Aguarde 5-10 minutos enquanto faz o deploy
3. Quando terminar, você verá **"Live"** no topo

### 9️⃣ Acessar o Sistema

O Render vai gerar uma URL tipo:
```
https://sistema-pos-contato.onrender.com
```

**Pronto! Todos podem acessar esse link de qualquer lugar!**

---

## 🔄 Atualizar o Sistema Depois

Quando fizer alterações no código:

```powershell
cd "c:\Users\133407\OneDrive - Localiza\Área de Trabalho\Sistema - Pos contato"

git add .
git commit -m "Descrição da mudança"
git push
```

O Render detecta automaticamente e atualiza o site!

---

## 🗄️ Banco de Dados (IMPORTANTE!)

**Problema:** O banco SQLite no Render é temporário. A cada reinício, os dados são perdidos!

**Solução:** Use o PostgreSQL gratuito do Render:

### Criar Banco PostgreSQL:

1. No Render, clique **"New +"**
2. Selecione **"PostgreSQL"**
3. Configure:
   - **Name:** pos-contato-db
   - **Database:** poscontato
   - **User:** deixe automático
   - **Region:** mesma do Web Service
   - **Instance Type:** **Free**
4. Clique **"Create Database"**
5. Aguarde 2-3 minutos

### Conectar ao Web Service:

1. Copie a **Internal Database URL** do PostgreSQL
2. Vá no seu Web Service
3. Em **"Environment"** adicione:
   - Key: `DATABASE_URL`
   - Value: *cole a URL do banco*

---

## ⚠️ IMPORTANTE - Migrar de SQLite para PostgreSQL

Precisamos adaptar o código para usar PostgreSQL. Vou criar os arquivos necessários:

### Criar arquivo `package.json` atualizado:

Adicione a dependência do PostgreSQL:
```json
"pg": "^8.11.3"
```

### Criar novo `database-postgres.js`:

Vou criar um arquivo específico para PostgreSQL que funciona igual ao SQLite mas salva tudo na nuvem!

Quer que eu faça essa migração agora ou prefere começar com SQLite (dados temporários) e migrar depois?

---

## 🎯 Resumo do Processo

```
1. GitHub (guardar código) → 2. Render (hospedar) → 3. Link público!
```

**Tempo total:** 20-30 minutos na primeira vez  
**Custo:** R$ 0,00 (completamente grátis)  
**Limite:** Gratuito suporta bem até 20-30 usuários simultâneos

---

## 🆘 Problemas Comuns

### "Git não é reconhecido"
- Instale o Git e reinicie o PowerShell

### "Permission denied" no GitHub
- Use Personal Access Token em vez de senha
- GitHub → Settings → Developer settings → Personal access tokens → Generate new token

### "Build failed" no Render
- Verifique se `package.json` está correto
- Veja os logs de erro no Render

### Site lento na primeira visita
- Render hiberna apps grátis após 15min sem uso
- Primeira visita demora 30s-1min (depois é rápido)

---

## 💡 Dicas

✅ Anote a URL do site (ex: sistema-pos-contato.onrender.com)  
✅ Compartilhe apenas essa URL com a equipe  
✅ Ninguém precisa instalar nada!  
✅ Funciona em qualquer navegador (Chrome, Edge, Firefox, Safari)  
✅ Funciona até no celular!  

---

## 🚀 Próximo Nível (Opcional)

Depois que estiver rodando, você pode:

1. **Domínio próprio:** poscontato.localiza.com
2. **Upgrade:** $7/mês para mais performance
3. **Backup automático:** do banco de dados
4. **Monitoramento:** uptime e performance

---

**Qualquer dúvida, me chame! Vou te ajudar em cada passo!** 🎉
