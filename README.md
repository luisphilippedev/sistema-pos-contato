# Sistema de Pós-Contato com Cliente

Sistema web desenvolvido para gerenciar o atendimento pós-contato com clientes da Localiza.

## ⚠️ IMPORTANTE - Configuração Inicial

**Antes de iniciar o sistema, você PRECISA configurar o arquivo `.env`:**

```powershell
# Copie o arquivo de exemplo
copy .env.example .env
```

Se não fizer isso, você verá o erro: **"JWT_SECRET não está definido"**

📖 **Guia rápido:** [SETUP-RAPIDO.md](./SETUP-RAPIDO.md)
🔧 **Problemas?** [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

## 📋 Funcionalidades

### Página Home (Implementada)
- ✅ Login com autenticação JWT
- ✅ Identificação do usuário (nome e cargo)
- ✅ Meta diária com indicador visual de progresso
- ✅ Visualização da fila atribuída e quantidade de SS's
- ✅ Redistribuição de SS's (lote e pontual) - Apenas Liderança
- ✅ Gerenciamento de usuários e filas - Apenas Liderança
- ✅ Pesquisa de SS's por número ou placa
- ✅ Tabela de SS's processadas
- ✅ Importação/exportação de planilhas

### Próximas Telas
- 🔄 Tela "Iniciar Análise" (próxima etapa)

## 🚀 Como Executar o Sistema

### Pré-requisitos
- Node.js versão 16 ou superior
- PowerShell ou terminal Windows

### Passo 1: Instalar Dependências
```powershell
npm install
```

### Passo 2: Iniciar o Servidor
```powershell
npm start
```

O servidor será iniciado em: **http://localhost:3000**

### Passo 3: Acessar o Sistema
1. Abra seu navegador
2. Acesse: http://localhost:3000
3. Faça login com as credenciais padrão:
   - **Email:** admin@localiza.com
   - **Senha:** admin123

## 👥 Perfis de Usuário

### Analista
- Visualizar meta diária
- Visualizar fila atribuída
- Processar SS's
- Consultar SS's processadas

### Liderança (Admin)
- Todas as funcionalidades de Analista
- Redistribuir SS's entre usuários
- Gerenciar usuários (criar, editar, alterar status)
- Alterar filas dos usuários
- Importar/exportar planilhas

## 📊 Estrutura do Banco de Dados

### Tabela: usuarios
- id, nome, email, senha, cargo, perfil, status, fila, meta_diaria

### Tabela: ss (Solicitações de Serviço)
- id, numero_ss, placa, humor_cliente, cluster, teve_compra_peca
- regional, servico_principal, regiao, responsavel_id, status, fila, detalhes

### Tabela: metas_diarias
- id, usuario_id, data, contatos_realizados, meta

### Tabela: redistribuicoes
- id, ss_id, usuario_origem_id, usuario_destino_id, realizado_por_id, data

## 📥 Importar Dados via Planilha

### Endpoint para Importação
```
POST /api/importar-planilha
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

### Formato da Planilha Excel (.xlsx)
A planilha deve conter as seguintes colunas:

| numero_ss | placa | humor_cliente | cluster | teve_compra_peca | regional | servico_principal | regiao | fila |
|-----------|-------|---------------|---------|------------------|----------|-------------------|--------|------|

**Exemplo:**
| numero_ss | placa | humor_cliente | cluster | teve_compra_peca | regional | servico_principal | regiao | fila |
|-----------|-------|---------------|---------|------------------|----------|-------------------|--------|------|
| SS001 | ABC1234 | Satisfeito | Cluster A | Sim | SP | Manutenção | Sudeste | pos_rapidos_medios |
| SS002 | XYZ5678 | Neutro | Cluster B | Não | RJ | Revisão | Sudeste | pos_complexo |

### Como Importar pelo Sistema
1. Faça login como Liderança
2. Use a API: POST /api/importar-planilha
3. Envie o arquivo Excel no campo "planilha"

## 🌐 Hospedagem e Uso Simultâneo

### SIM, o sistema suporta múltiplos usuários simultaneamente!

### Opções de Hospedagem

#### 1. Servidor Local (Rede Interna)
**Ideal para:** Testes internos na empresa

**Como fazer:**
1. Instale o sistema em um computador que ficará ligado
2. Configure o firewall do Windows para permitir a porta 3000
3. Os outros usuários acessam pelo IP da máquina: `http://IP_DA_MAQUINA:3000`

#### 2. Hospedagem em Nuvem (Recomendado)
**Plataformas gratuitas/baratas:**

**A) Render.com (Grátis)**
- Crie conta em render.com
- Conecte seu repositório Git
- Deploy automático
- URL: `https://seu-sistema.onrender.com`

**B) Railway.app (Grátis com limites)**
- Deploy direto do código
- Banco de dados incluído
- Muito fácil de usar

**C) Heroku ($7/mês)**
- Muito estável
- Fácil configuração
- Banco de dados PostgreSQL

**D) Servidor VPS - HostGator, Locaweb, AWS ($10-30/mês)**
- Controle total
- Melhor performance
- Requer conhecimento técnico

### Como Preparar para Hospedagem

1. **Criar repositório Git:**
```powershell
git init
git add .
git commit -m "Sistema Pós-Contato v1.0"
```

2. **Criar conta no Render.com** (exemplo)
   - Vá em render.com
   - Conecte seu GitHub
   - Crie um "Web Service"
   - Selecione o repositório
   - Configure:
     - Build Command: `npm install`
     - Start Command: `npm start`
   - Deploy!

3. **Banco de Dados em Produção**
   - Para produção, recomendo migrar de SQLite para PostgreSQL
   - Render oferece PostgreSQL gratuito

## 🔒 Segurança

### Em Produção, ALTERE:
1. `.env` - JWT_SECRET (use uma chave forte)
2. Senha do usuário admin
3. Configure HTTPS (SSL)
4. Use banco de dados PostgreSQL ou MySQL

## 📁 Estrutura de Arquivos

```
Sistema - Pos contato/
├── public/
│   ├── index.html      # Página principal
│   ├── styles.css      # Estilos
│   └── app.js          # JavaScript frontend
├── database.js         # Configuração do banco
├── server.js           # Servidor Node.js
├── package.json        # Dependências
├── .env                # Variáveis de ambiente
└── README.md           # Esta documentação
```

## 🛠️ Desenvolvimento

### Modo Desenvolvedor (com auto-reload)
```powershell
npm run dev
```

### Adicionar Novos Usuários
Via sistema (botão "Novo Usuário") ou API:
```javascript
POST /api/usuarios
{
  "nome": "Nome do Usuário",
  "email": "email@localiza.com",
  "senha": "senha123",
  "cargo": "Analista",
  "perfil": "analista",
  "fila": "pos_rapidos_medios"
}
```

## 📞 API Endpoints

### Autenticação
- `POST /api/login` - Login

### Usuários
- `GET /api/usuarios` - Listar todos (Liderança)
- `POST /api/usuarios` - Criar usuário (Liderança)
- `PUT /api/usuarios/:id` - Atualizar usuário (Liderança)

### SS's
- `GET /api/minhas-ss` - Minhas SS's pendentes
- `GET /api/ss-processadas` - SS's finalizadas
- `GET /api/ss/buscar` - Buscar SS específica
- `PUT /api/ss/:id/processar` - Marcar SS como processada
- `GET /api/ss/para-redistribuir` - SS's disponíveis (Liderança)
- `POST /api/ss/redistribuir` - Redistribuir SS's (Liderança)

### Metas e Filas
- `GET /api/minha-meta` - Meta diária do usuário
- `GET /api/minha-fila` - Fila atribuída

### Importação/Exportação
- `POST /api/importar-planilha` - Importar Excel (Liderança)
- `GET /api/exportar-ss` - Exportar SS's processadas (Liderança)

## 🎨 Personalização

### Alterar Cores
Edite o arquivo `public/styles.css`:
```css
:root {
    --verde-escuro: #2d5f3f;  /* Cor primária */
    --verde-claro: #6DBF8B;   /* Cor secundária */
}
```

### Alterar Meta Padrão
Edite `database.js` linha 48:
```javascript
meta_diaria INTEGER DEFAULT 50  // Altere o valor 50
```

## 📝 Próximos Passos

1. Implementar tela "Iniciar Análise"
2. Adicionar notificações em tempo real
3. Relatórios e dashboards
4. Exportar relatórios em PDF
5. Integração com WhatsApp/Email

## ⚠️ Problemas Comuns

### Erro ao instalar dependências
```powershell
# Limpe o cache do npm
npm cache clean --force
npm install
```

### Porta 3000 já em uso
Altere a porta em `.env`:
```
PORT=3001
```

### Banco de dados corrompido
Delete `database.db` e reinicie o servidor (criará novo banco)

## 📧 Suporte

Para dúvidas ou problemas, entre em contato com a equipe de TI.

---

**Versão:** 1.0.0  
**Desenvolvido para:** Localiza  
**Data:** Janeiro 2026
