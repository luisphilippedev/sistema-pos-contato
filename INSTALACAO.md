# 🚀 GUIA DE INSTALAÇÃO - Sistema Pós-Contato

## ⚠️ IMPORTANTE: Primeiro Passo - Instalar Node.js

O sistema precisa do Node.js instalado no seu computador. Siga os passos abaixo:

### 1️⃣ Instalar Node.js

1. Acesse: https://nodejs.org/
2. Baixe a versão **LTS (recomendada)** - botão verde à esquerda
3. Execute o instalador baixado
4. Clique em "Next" em todas as etapas (deixe as opções padrão)
5. Aguarde a instalação concluir
6. **Reinicie o computador** (importante!)

### 2️⃣ Verificar Instalação

Após reiniciar, abra o PowerShell e digite:
```powershell
node --version
npm --version
```

Se aparecer os números das versões, está instalado corretamente!

### 3️⃣ Instalar Dependências do Sistema

No PowerShell, navegue até a pasta do sistema e instale:
```powershell
cd "c:\Users\133407\OneDrive - Localiza\Área de Trabalho\Sistema - Pos contato"
npm install
```

Aguarde alguns minutos enquanto baixa todas as dependências.

### 4️⃣ Iniciar o Sistema

```powershell
npm start
```

Você verá a mensagem:
```
Conectado ao banco de dados SQLite
Usuário admin criado: admin@localiza.com / admin123
Servidor rodando na porta 3000
Acesse: http://localhost:3000
```

### 5️⃣ Acessar o Sistema

1. Abra seu navegador (Chrome, Edge, Firefox)
2. Digite na barra de endereços: **http://localhost:3000**
3. Faça login com:
   - **Email:** admin@localiza.com
   - **Senha:** admin123

## 📱 Acessar de Outros Computadores (Mesma Rede)

### No computador servidor (onde instalou):
1. Abra o PowerShell
2. Digite: `ipconfig`
3. Anote o "Endereço IPv4" (ex: 192.168.1.100)

### Nos outros computadores:
1. Abra o navegador
2. Digite: **http://192.168.1.100:3000** (substitua pelo IP anotado)
3. Faça login normalmente

### Liberar acesso no Firewall:
```powershell
# Execute como Administrador
New-NetFirewallRule -DisplayName "Sistema Pos Contato" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
```

## 🔄 Comandos Úteis

### Parar o servidor
Pressione `Ctrl + C` no PowerShell onde o servidor está rodando

### Reiniciar o servidor
```powershell
npm start
```

### Modo desenvolvimento (reinicia automaticamente ao editar código)
```powershell
npm run dev
```

### Ver erros
Se algo não funcionar, olhe as mensagens no PowerShell onde o servidor está rodando

## 🎯 Próximos Passos Após Instalação

1. ✅ Faça login como admin
2. ✅ Acesse "Usuários e Filas"
3. ✅ Cadastre os usuários da sua equipe
4. ✅ Defina as filas de cada usuário
5. ✅ Importe a planilha de SS's (se tiver)

## 📥 Como Importar Planilha de SS's

### Via Código (Temporário até criar interface)

Crie um arquivo `importar.js` na pasta do sistema:

```javascript
const XLSX = require('xlsx');
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.db');
const workbook = XLSX.readFile('./sua_planilha.xlsx');
const sheetName = workbook.SheetNames[0];
const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

data.forEach(row => {
    db.run(`
        INSERT INTO ss (numero_ss, placa, humor_cliente, cluster, teve_compra_peca, 
                        regional, servico_principal, regiao, fila, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente')
    `, [
        row.numero_ss || row.SS,
        row.placa || row.Placa,
        row.humor_cliente || row['Humor Cliente'],
        row.cluster || row.Cluster,
        row.teve_compra_peca || row['Teve compra de peça'],
        row.regional || row.Regional,
        row.servico_principal || row['Serviço principal'],
        row.regiao || row['Região'],
        row.fila || 'pos_rapidos_medios'
    ]);
});

console.log('Importação concluída!');
db.close();
```

Execute:
```powershell
node importar.js
```

## 🆘 Problemas Comuns

### "npm não é reconhecido"
- Node.js não está instalado ou precisa reiniciar o computador
- Solução: Instale o Node.js e reinicie

### "Porta 3000 já em uso"
- Outro programa está usando a porta 3000
- Solução: Altere a porta no arquivo `.env` para 3001

### "Erro ao conectar ao banco de dados"
- Permissões de pasta ou arquivo corrompido
- Solução: Delete o arquivo `database.db` e reinicie o servidor

### Sistema lento com muitos usuários
- SQLite tem limites para uso simultâneo
- Solução: Migre para PostgreSQL ou MySQL (para produção)

## 🌐 Colocar na Internet (Produção)

### Opção 1: Render.com (Grátis e Fácil)

1. Crie conta em: https://render.com
2. Crie um "Web Service"
3. Conecte ao seu GitHub (faça upload do código lá)
4. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Clique em "Create Web Service"
6. Aguarde o deploy (5-10 minutos)
7. Acesse a URL gerada: `https://seu-sistema.onrender.com`

### Opção 2: Railway.app (Grátis e Simples)

1. Acesse: https://railway.app
2. Faça login com GitHub
3. Clique em "New Project"
4. Selecione "Deploy from GitHub repo"
5. Deploy automático!

### Opção 3: VPS Profissional

Para mais de 50 usuários simultâneos:
- Contrate VPS (HostGator, Locaweb, DigitalOcean)
- Instale Node.js no servidor
- Configure Nginx como proxy reverso
- Use PostgreSQL como banco de dados
- Configure SSL (HTTPS)

## 📞 Suporte

Se encontrar dificuldades:
1. Verifique as mensagens de erro no PowerShell
2. Consulte o arquivo `README.md` completo
3. Entre em contato com o TI

---

**Boa sorte! O sistema está pronto para uso! 🎉**
