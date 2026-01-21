# 🚀 DEPLOY PASSO A PASSO - Guia Para Iniciantes

## 📌 O QUE VOCÊ VAI FAZER:

Colocar o sistema na internet para que **TODOS acessem só com um link**, sem instalar nada no computador deles.

**Tempo total:** 20-30 minutos  
**Custo:** R$ 0,00 (100% grátis)

---

# ETAPA 1: INSTALAR O GIT (5 minutos)

## 🔹 O que é Git?
É um programa que "guarda" o código e envia para a internet.

## 🔹 Como instalar:

### PASSO 1.1: Baixar o Git
1. Abra o navegador (Chrome, Edge, Firefox)
2. Digite na barra de endereço: **https://git-scm.com/download/win**
3. O download começará automaticamente (arquivo tipo: Git-2.XX.X-64-bit.exe)
4. Aguarde baixar (geralmente vai para a pasta Downloads)

### PASSO 1.2: Instalar o Git
1. Vá na pasta **Downloads** do Windows
2. Dê duplo clique no arquivo **Git-2.XX.X-64-bit.exe**
3. Se aparecer "Deseja permitir que este aplicativo faça alterações?", clique **SIM**
4. Na tela de instalação:
   - Clique **Next** (Avançar) em TODAS as telas
   - NÃO mude nenhuma configuração, deixe tudo padrão
   - Continue clicando **Next** até aparecer **Install**
   - Clique **Install** e aguarde (1-2 minutos)
   - Quando terminar, clique **Finish**

### PASSO 1.3: Verificar se instalou
1. **IMPORTANTE: Feche todos os PowerShell/terminais que estiverem abertos**
2. Abra um NOVO PowerShell
3. Digite: `git --version`
4. Aperte Enter
5. Se aparecer algo como "git version 2.XX.X", funcionou! ✅

**SE NÃO FUNCIONAR:**
- Reinicie o computador
- Abra o PowerShell novamente
- Tente `git --version` de novo

---

# ETAPA 2: CRIAR CONTA NO GITHUB (5 minutos)

## 🔹 O que é GitHub?
É como um "Google Drive" para código. Vai guardar seu sistema online.

### PASSO 2.1: Criar a conta
1. Abra: **https://github.com**
2. Clique no botão verde **"Sign up"** (Inscrever-se)
3. Preencha:
   - **Email:** Use seu email da Localiza (ou pessoal)
   - **Password:** Crie uma senha forte (anote!)
   - **Username:** Escolha um nome de usuário (ex: luisphilippe-localiza)
4. Complete o puzzle de verificação
5. Clique **"Create account"**
6. Verifique seu email e clique no link de confirmação

### PASSO 2.2: Fazer login
1. Entre no GitHub com seu email e senha
2. Você verá uma tela inicial (dashboard)
3. Deixe essa aba aberta no navegador

---

# ETAPA 3: ENVIAR O CÓDIGO PARA O GITHUB (10 minutos)

### PASSO 3.1: Abrir PowerShell na pasta certa
1. No VS Code, aperte **Ctrl + '** (abre o terminal)
2. OU: Abra o menu **Terminal → New Terminal**
3. Verifique se está na pasta correta. Digite:
```powershell
pwd
```
4. Deve mostrar: `C:\Users\133407\OneDrive - Localiza\Área de Trabalho\Sistema - Pos contato`
5. Se não estiver, digite:
```powershell
cd "c:\Users\133407\OneDrive - Localiza\Área de Trabalho\Sistema - Pos contato"
```

### PASSO 3.2: Configurar seu nome no Git (FAÇA UMA VEZ SÓ)
Cole estes comandos no PowerShell (um de cada vez):

```powershell
git config --global user.name "Luis Philippe"
```
Aperte Enter. Depois:

```powershell
git config --global user.email "seu.email@localiza.com"
```
**IMPORTANTE:** Troque "seu.email@localiza.com" pelo SEU email real!

### PASSO 3.3: Inicializar o Git na pasta
```powershell
git init
```
Deve aparecer: "Initialized empty Git repository..."

### PASSO 3.4: Adicionar todos os arquivos
```powershell
git add .
```
(Sim, é "git add" + espaço + ponto)

### PASSO 3.5: Fazer o primeiro commit (salvar)
```powershell
git commit -m "Deploy inicial do sistema"
```

### PASSO 3.6: Criar repositório no GitHub
1. Volte no navegador (GitHub)
2. No canto superior direito, clique no **"+"**
3. Clique em **"New repository"**
4. Preencha:
   - **Repository name:** `sistema-pos-contato` (exatamente assim)
   - **Description:** "Sistema de Pós-Contato Localiza"
   - Deixe marcado **"Public"** (ou Private se preferir)
   - **NÃO marque** nenhuma caixa (README, .gitignore, license)
5. Clique no botão verde **"Create repository"**

### PASSO 3.7: Conectar sua pasta ao GitHub
Na tela que apareceu, você verá comandos. COPIE os 3 comandos da seção **"...or push an existing repository from the command line"**

Será algo assim (SEU_USUARIO vai ser diferente):
```powershell
git remote add origin https://github.com/SEU_USUARIO/sistema-pos-contato.git
git branch -M main
git push -u origin main
```

Cole no PowerShell e aperte Enter.

**Vai pedir login:**
- **Username:** seu usuário do GitHub
- **Password:** NÃO é sua senha! É um "token"

**Como criar o token:**
1. No GitHub, clique na sua foto (canto superior direito)
2. **Settings** → **Developer settings** (final da lista esquerda)
3. **Personal access tokens** → **Tokens (classic)**
4. **Generate new token** → **Generate new token (classic)**
5. **Note:** "Deploy Render"
6. **Expiration:** 90 days (ou No expiration)
7. Marque a caixa **"repo"** (marca tudo relacionado)
8. Role até o fim e clique **"Generate token"**
9. COPIE O TOKEN (parece: ghp_xxxxxxxxxxxx)
10. COLE no PowerShell quando pedir password

Aguarde o upload (pode demorar 1-2 minutos).

Se der certo, verá: "Branch 'main' set up to track..."

---

# ETAPA 4: CRIAR CONTA NO RENDER (3 minutos)

### PASSO 4.1: Acessar Render
1. Abra: **https://render.com**
2. Clique **"Get Started for Free"**

### PASSO 4.2: Login com GitHub (mais fácil)
1. Clique em **"GitHub"** (botão com logo do GitHub)
2. Vai abrir uma tela do GitHub pedindo autorização
3. Clique **"Authorize Render"**
4. Pronto! Você está logado no Render

---

# ETAPA 5: FAZER O DEPLOY (10 minutos)

### PASSO 5.1: Criar Web Service
1. No dashboard do Render, clique **"New +"** (canto superior direito)
2. Selecione **"Web Service"**

### PASSO 5.2: Conectar o repositório
1. Você verá uma lista dos seus repositórios do GitHub
2. Encontre **"sistema-pos-contato"**
3. Clique no botão **"Connect"** ao lado dele

### PASSO 5.3: Configurar o serviço
Preencha os campos assim:

| Campo | O que colocar |
|-------|---------------|
| **Name** | `sistema-pos-contato` |
| **Region** | Deixe o padrão (Oregon US West) |
| **Branch** | `main` |
| **Root Directory** | Deixe em branco |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |

### PASSO 5.4: Escolher plano grátis
Role para baixo até **"Instance Type"**:
- Selecione **"Free"** (R$ 0,00/mês)

### PASSO 5.5: Adicionar variáveis de ambiente
Role até **"Environment Variables"**:

Clique **"Add Environment Variable"** e adicione ESTAS 3:

**Variável 1:**
- **Key:** `JWT_SECRET`
- **Value:** `MinhaChaveSecretaSuperForte2026!@#`

**Variável 2:**
- **Key:** `NODE_ENV`
- **Value:** `production`

**Variável 3:**
- **Key:** `PORT`
- **Value:** `3000`

### PASSO 5.6: Criar!
1. Role até o final da página
2. Clique no botão azul **"Create Web Service"**
3. Aguarde 5-10 minutos (vai mostrar os logs rodando)

### PASSO 5.7: Pegar o link
1. Quando terminar, no topo da tela aparecerá **"Live"** (bolinha verde)
2. Logo abaixo você verá uma URL tipo: `https://sistema-pos-contato.onrender.com`
3. **COPIE ESSA URL!**

---

# ETAPA 6: TESTAR O SISTEMA! 🎉

1. Cole a URL no navegador
2. Aguarde 30-60 segundos na primeira vez (Render está "acordando" o sistema)
3. Deve aparecer a tela de login!
4. Entre com:
   - **Email:** admin@localiza.com
   - **Senha:** admin123

**DEU CERTO! Agora compartilhe esse link com toda a equipe!** 🚀

---

# 📊 OPCIONAL: ADICIONAR BANCO DE DADOS PERMANENTE

Para não perder dados quando o sistema reiniciar:

### PASSO 1: Criar PostgreSQL
1. No Render, clique **"New +"** → **"PostgreSQL"**
2. **Name:** `pos-contato-db`
3. **Database:** `poscontato`
4. **User:** deixe automático
5. **Region:** mesma do Web Service (Oregon)
6. **Instance Type:** **Free**
7. Clique **"Create Database"**
8. Aguarde 2-3 minutos

### PASSO 2: Conectar ao Web Service
1. Na página do banco, role até **"Connections"**
2. COPIE a **"Internal Database URL"** (começa com postgres://)
3. Volte no **Web Service** (sistema-pos-contato)
4. Clique na aba **"Environment"**
5. Clique **"Add Environment Variable"**
6. **Key:** `DATABASE_URL`
7. **Value:** COLE a URL que copiou
8. Clique **"Save Changes"**

O sistema vai reiniciar automaticamente. Agora os dados são permanentes!

---

# 🔄 COMO ATUALIZAR O SISTEMA DEPOIS

Quando você fizer mudanças no código:

```powershell
cd "c:\Users\133407\OneDrive - Localiza\Área de Trabalho\Sistema - Pos contato"
git add .
git commit -m "Descrição do que mudou"
git push
```

O Render detecta automaticamente e atualiza o site em 5 minutos!

---

# ⚠️ PROBLEMAS COMUNS

**"git não é reconhecido"**
→ Instale o Git e reinicie o PowerShell

**"Permission denied" ao fazer push**
→ Use Personal Access Token em vez de senha (expliquei acima)

**"Build failed" no Render**
→ Veja os logs. Geralmente falta alguma dependência no package.json

**Site demora para carregar**
→ Normal no plano grátis. Primeira visita demora 30s-1min

**"Application error" na tela**
→ Veja os logs no Render. Verifique as variáveis de ambiente

---

# 📞 PRECISA DE AJUDA?

Me chame em QUALQUER etapa que você travar! Vou te guiar! 🚀
