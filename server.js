const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
require('dotenv').config();

// Validar variáveis de ambiente obrigatórias
if (!process.env.JWT_SECRET) {
  console.error('❌ ERRO: JWT_SECRET não está definido nas variáveis de ambiente!');
  console.error('Por favor, adicione JWT_SECRET no Render.com (Environment Variables)');
  process.exit(1);
}

// Usar PostgreSQL se DATABASE_URL estiver definido, senão SQLite
const db = process.env.DATABASE_URL 
  ? require('./database-postgres')
  : require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configuração do Multer para upload de planilhas
const upload = multer({ dest: 'uploads/' });

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    console.log('❌ Token não fornecido');
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  console.log('🔑 Tentando validar token...');
  console.log('🔐 JWT_SECRET configurado:', process.env.JWT_SECRET ? 'SIM' : 'NÃO');
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.log('❌ Erro ao validar token:', err.message);
      return res.status(403).json({ error: 'Token inválido', detalhes: err.message });
    }
    console.log('✅ Token válido para usuário:', user.email);
    req.user = user;
    next();
  });
};

// Middleware para verificar perfil de liderança
const authenticateLideranca = (req, res, next) => {
  if (req.user.perfil !== 'lideranca') {
    return res.status(403).json({ error: 'Acesso restrito à liderança' });
  }
  next();
};

// ===== ROTAS DE AUTENTICAÇÃO =====

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    
    const usuario = await db.get('SELECT * FROM usuarios WHERE email = ?', [email]);
    
    if (!usuario) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const senhaValida = bcrypt.compareSync(senha, usuario.senha);
    
    if (!senhaValida) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, perfil: usuario.perfil },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        cargo: usuario.cargo,
        perfil: usuario.perfil,
        fila: usuario.fila,
        status: usuario.status
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== ROTAS DE USUÁRIOS =====

// Listar todos os usuários (apenas liderança)
app.get('/api/usuarios', authenticateToken, authenticateLideranca, async (req, res) => {
  try {
    const usuarios = await db.query('SELECT id, nome, email, cargo, perfil, status, fila, meta_diaria FROM usuarios');
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Criar novo usuário (apenas liderança)
app.post('/api/usuarios', authenticateToken, authenticateLideranca, async (req, res) => {
  try {
    const { nome, email, senha, cargo, perfil, fila } = req.body;
    const senhaHash = bcrypt.hashSync(senha, 10);
    
    const result = await db.run(
      'INSERT INTO usuarios (nome, email, senha, cargo, perfil, fila) VALUES (?, ?, ?, ?, ?, ?)',
      [nome, email, senhaHash, cargo, perfil || 'analista', fila || 'pos_rapidos_medios']
    );
    
    res.status(201).json({ id: result.id, message: 'Usuário criado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Atualizar usuário (apenas liderança)
app.put('/api/usuarios/:id', authenticateToken, authenticateLideranca, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, cargo, perfil, status, fila, meta_diaria } = req.body;
    
    await db.run(
      'UPDATE usuarios SET nome = ?, cargo = ?, perfil = ?, status = ?, fila = ?, meta_diaria = ? WHERE id = ?',
      [nome, cargo, perfil, status, fila, meta_diaria, id]
    );
    
    res.json({ message: 'Usuário atualizado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== ROTAS DE SS (SOLICITAÇÕES DE SERVIÇO) =====

// Buscar SS específica por ID
app.get('/api/ss/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const ss = await db.get('SELECT * FROM ss WHERE id = ?', [id]);
    
    if (!ss) {
      return res.status(404).json({ error: 'SS não encontrada' });
    }
    
    res.json(ss);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Listar SS's atribuídas ao usuário (pendentes e vencidas)
app.get('/api/minhas-ss', authenticateToken, async (req, res) => {
  try {
    // Primeiro, marcar SS's vencidas (mais de 4 dias desde data_envio_pesquisa)
    const quatroDiasAtras = new Date();
    quatroDiasAtras.setDate(quatroDiasAtras.getDate() - 4);
    
    await db.run(`
      UPDATE ss 
      SET status = 'vencida' 
      WHERE status = 'pendente' 
      AND data_envio_pesquisa IS NOT NULL 
      AND data_envio_pesquisa < ?
    `, [quatroDiasAtras.toISOString()]);
    
    // Buscar apenas SS's pendentes (não vencidas, não processadas)
    const ss = await db.query(
      'SELECT * FROM ss WHERE responsavel_id = ? AND status = "pendente" ORDER BY criado_em DESC',
      [req.user.id]
    );
    res.json(ss);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Listar SS's finalizadas (apenas vencidas) do usuário
app.get('/api/ss-finalizadas', authenticateToken, async (req, res) => {
  try {
    const ss = await db.query(`
      SELECT * FROM ss 
      WHERE responsavel_id = ? 
      AND status = 'vencida'
      ORDER BY criado_em DESC
      LIMIT 100
    `, [req.user.id]);
    res.json(ss);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Listar SS's processadas (legacy - para relatórios)
app.get('/api/ss-processadas', authenticateToken, async (req, res) => {
  try {
    const ss = await db.query(`
      SELECT s.*, u.nome as responsavel_nome 
      FROM ss s 
      LEFT JOIN usuarios u ON s.responsavel_id = u.id 
      WHERE s.status = "processado" OR s.status = "processada"
      ORDER BY s.criado_em DESC
      LIMIT 100
    `);
    res.json(ss);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});;

// Buscar SS específica
app.get('/api/ss/buscar', authenticateToken, async (req, res) => {
  try {
    const { numero_ss, placa } = req.query;
    let query = 'SELECT s.*, u.nome as responsavel_nome FROM ss s LEFT JOIN usuarios u ON s.responsavel_id = u.id WHERE 1=1';
    const params = [];
    
    if (numero_ss) {
      query += ' AND s.numero_ss LIKE ?';
      params.push(`%${numero_ss}%`);
    }
    
    if (placa) {
      query += ' AND s.placa LIKE ?';
      params.push(`%${placa}%`);
    }
    
    const ss = await db.query(query, params);
    res.json(ss);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Processar SS
app.put('/api/ss/:id/processar', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { detalhes } = req.body;
    
    await db.run(
      'UPDATE ss SET status = "processado", detalhes = ?, processado_em = CURRENT_TIMESTAMP WHERE id = ?',
      [detalhes, id]
    );
    
    // Atualizar contatos realizados do dia
    const hoje = new Date().toISOString().split('T')[0];
    await db.run(`
      INSERT INTO metas_diarias (usuario_id, data, contatos_realizados, meta)
      VALUES (?, ?, 1, 50)
      ON CONFLICT(usuario_id, data) DO UPDATE SET contatos_realizados = contatos_realizados + 1
    `, [req.user.id, hoje]);
    
    res.json({ message: 'SS processada com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Redistribuir SS (apenas liderança)
app.post('/api/ss/redistribuir', authenticateToken, authenticateLideranca, async (req, res) => {
  try {
    const { ss_ids, usuario_destino_id } = req.body;
    
    for (const ss_id of ss_ids) {
      const ss = await db.get('SELECT responsavel_id FROM ss WHERE id = ?', [ss_id]);
      
      await db.run(
        'UPDATE ss SET responsavel_id = ? WHERE id = ?',
        [usuario_destino_id, ss_id]
      );
      
      await db.run(
        'INSERT INTO redistribuicoes (ss_id, usuario_origem_id, usuario_destino_id, realizado_por_id) VALUES (?, ?, ?, ?)',
        [ss_id, ss.responsavel_id, usuario_destino_id, req.user.id]
      );
    }
    
    res.json({ message: 'SS(s) redistribuída(s) com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Listar SS's para redistribuição (apenas liderança)
app.get('/api/ss/para-redistribuir', authenticateToken, authenticateLideranca, async (req, res) => {
  try {
    const ss = await db.query(`
      SELECT s.*, u.nome as responsavel_nome, u.status as responsavel_status
      FROM ss s
      LEFT JOIN usuarios u ON s.responsavel_id = u.id
      WHERE s.status = "pendente"
      ORDER BY s.criado_em DESC
    `);
    res.json(ss);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== ROTAS DE METAS =====

// Obter meta diária do usuário
app.get('/api/minha-meta', authenticateToken, async (req, res) => {
  try {
    const hoje = new Date().toISOString().split('T')[0];
    
    const meta = await db.get(`
      SELECT * FROM metas_diarias 
      WHERE usuario_id = ? AND data = ?
    `, [req.user.id, hoje]);
    
    if (!meta) {
      const usuario = await db.get('SELECT meta_diaria FROM usuarios WHERE id = ?', [req.user.id]);
      res.json({ contatos_realizados: 0, meta: usuario.meta_diaria || 50 });
    } else {
      res.json(meta);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obter quantidade de SS's na fila do usuário
app.get('/api/minha-fila', authenticateToken, async (req, res) => {
  try {
    const usuario = await db.get('SELECT fila FROM usuarios WHERE id = ?', [req.user.id]);
    const count = await db.get(
      'SELECT COUNT(*) as total FROM ss WHERE fila = ? AND status = "pendente"',
      [usuario.fila]
    );
    
    res.json({ fila: usuario.fila, total_ss: count.total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== POPULAR DADOS DE TESTE =====

app.post('/api/popular-dados-teste', authenticateToken, authenticateLideranca, async (req, res) => {
  try {
    const clusters = ['SERVIÇO COMPLEXO', 'SERVIÇO MÉDIO', 'SERVIÇO RÁPIDO', 'SERVIÇO ESPECIAL'];
    const regionais = ['RIO', 'SÃO PAULO', 'BRASÍLIA', 'MINAS GERAIS', 'BAHIA', 'PARANÁ', 'RIO GRANDE DO SUL'];
    const servicosPrincipais = ['REVISÃO', 'TROCA DE ÓLEO', 'ALINHAMENTO', 'BALANCEAMENTO', 'FREIOS', 'SUSPENSÃO', 'AR CONDICIONADO'];
    const posContato = ['PÓS CONTATO SEM SUCESSO', 'PÓS CONTATO COM SUCESSO', 'PÓS CONTATO PARCIAL'];
    const ramoFornec = ['CONCESSIONÁRIA', 'OFICINA INDEPENDENTE', 'AUTO CENTER', 'OFICINA ESPECIALIZADA'];
    const humores = [
      'Sem detração Registrada. Humor Registrado: Satisfeito',
      'Sem detração Registrada. Humor Registrado: Neutro',
      'Detração Registrada. Humor: Insatisfeito',
      'Sem detração Registrada. Humor Registrado: Não-serviço - Reagendamento e cancelamento de agendamento'
    ];
    const compraPeca = ['Sim', 'Não', 'Não é Serviço Médio'];

    function gerarPlaca() {
      const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const numeros = '0123456789';
      let placa = '';
      for (let i = 0; i < 3; i++) {
        placa += letras.charAt(Math.floor(Math.random() * letras.length));
      }
      placa += numeros.charAt(Math.floor(Math.random() * numeros.length));
      for (let i = 0; i < 3; i++) {
        placa += numeros.charAt(Math.floor(Math.random() * numeros.length));
      }
      return placa;
    }

    function gerarTelefone() {
      const ddd = ['11', '21', '31', '41', '51', '61', '71', '81', '91'];
      return '55' + ddd[Math.floor(Math.random() * ddd.length)] + '9' + 
             Math.floor(10000000 + Math.random() * 90000000);
    }

    function gerarDataAleatoria(diasAtras) {
      const data = new Date();
      data.setDate(data.getDate() - Math.floor(Math.random() * diasAtras));
      data.setHours(Math.floor(Math.random() * 24));
      data.setMinutes(Math.floor(Math.random() * 60));
      data.setSeconds(Math.floor(Math.random() * 60));
      return data.toISOString();
    }

    // Buscar usuários
    const usuarios = await db.query('SELECT id FROM usuarios');
    
    if (usuarios.length === 0) {
      return res.status(400).json({ error: 'Nenhum usuário encontrado. Crie usuários primeiro!' });
    }

    let inseridos = 0;
    let erros = 0;

    // Criar 50 SS's
    for (let i = 1; i <= 50; i++) {
      const numero_ss = `2SPX${String.fromCharCode(65 + (i % 26))}${String.fromCharCode(65 + Math.floor(i / 26))}/${i}`;
      const placa = gerarPlaca();
      const data_saida = gerarDataAleatoria(10);
      const data_envio_pesquisa = Math.random() > 0.3 ? gerarDataAleatoria(5) : null;
      const cluster = clusters[Math.floor(Math.random() * clusters.length)];
      const regional = regionais[Math.floor(Math.random() * regionais.length)];
      const servico_principal = servicosPrincipais[Math.floor(Math.random() * servicosPrincipais.length)];
      const pos_contato_val = posContato[Math.floor(Math.random() * posContato.length)];
      const ramo_fornec = ramoFornec[Math.floor(Math.random() * ramoFornec.length)];
      const humor_cliente = humores[Math.floor(Math.random() * humores.length)];
      const teve_compra_peca = compraPeca[Math.floor(Math.random() * compraPeca.length)];
      const tel_cliente = gerarTelefone();
      const fila = i <= 20 ? 'pos_rapidos_medios' : (i <= 40 ? 'pos_complexo' : 'pos_especiais');
      const responsavel_id = usuarios[Math.floor(Math.random() * usuarios.length)].id;
      
      try {
        await db.run(`
          INSERT INTO ss (
            numero_ss, placa, data_saida, data_envio_pesquisa, cluster, regional,
            servico_principal, pos_contato, ramo_fornec, humor_cliente, teve_compra_peca,
            tel_cliente, fila, responsavel_id, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente')
        `, [
          numero_ss, placa, data_saida, data_envio_pesquisa, cluster, regional,
          servico_principal, pos_contato_val, ramo_fornec, humor_cliente, teve_compra_peca,
          tel_cliente, fila, responsavel_id
        ]);
        inseridos++;
      } catch (error) {
        erros++;
      }
    }
    
    res.json({ 
      message: `Dados de teste criados com sucesso!`,
      inseridos,
      erros,
      total: 50
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== ROTAS DE IMPORTAÇÃO/EXPORTAÇÃO =====

// Importar planilha de SS's
app.post('/api/importar-planilha', authenticateToken, authenticateLideranca, upload.single('planilha'), async (req, res) => {
  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    
    let importadas = 0;
    for (const row of data) {
      try {
        await db.run(`
          INSERT INTO ss (numero_ss, placa, humor_cliente, cluster, teve_compra_peca, regional, servico_principal, regiao, fila, responsavel_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          row.numero_ss || row.SS,
          row.placa || row.Placa,
          row.humor_cliente || row['Humor Cliente'],
          row.cluster || row.Cluster,
          row.teve_compra_peca || row['Teve compra de peça'],
          row.regional || row.Regional,
          row.servico_principal || row['Serviço principal'],
          row.regiao || row['Região'],
          row.fila || 'pos_rapidos_medios',
          row.responsavel_id || null
        ]);
        importadas++;
      } catch (err) {
        console.log(`Erro ao importar linha: ${err.message}`);
      }
    }
    
    res.json({ message: `${importadas} SS's importadas com sucesso` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Exportar SS's processadas
app.get('/api/exportar-ss', authenticateToken, authenticateLideranca, async (req, res) => {
  try {
    const ss = await db.query(`
      SELECT s.*, u.nome as responsavel_nome 
      FROM ss s 
      LEFT JOIN usuarios u ON s.responsavel_id = u.id 
      WHERE s.status = "processado"
      ORDER BY s.processado_em DESC
    `);
    
    const worksheet = XLSX.utils.json_to_sheet(ss);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'SS Processadas');
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Disposition', 'attachment; filename=ss_processadas.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== ROTAS DE CONTATOS (MONITORAMENTO) =====

// Listar contatos de uma SS
app.get('/api/ss/:id/contatos', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const contatos = await db.query(
      'SELECT * FROM contatos WHERE ss_id = ? ORDER BY criado_em DESC',
      [id]
    );
    res.json(contatos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Registrar novo contato
app.post('/api/ss/:id/contato', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { sucesso_contato, disparo_whatsapp, percepcao, humor_contato, observacoes } = req.body;
    
    await db.run(`
      INSERT INTO contatos (ss_id, usuario_id, sucesso_contato, disparo_whatsapp, percepcao, humor_contato, observacoes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, req.user.id, sucesso_contato, disparo_whatsapp, percepcao, humor_contato, observacoes]);
    
    // SS permanece 'pendente' até vencer ou cliente responder NPS
    // Não marcar como processada aqui
    
    // Atualizar contatos realizados do dia
    const hoje = new Date().toISOString().split('T')[0];
    await db.run(`
      INSERT INTO metas_diarias (usuario_id, data, contatos_realizados, meta)
      VALUES (?, ?, 1, 50)
      ON CONFLICT(usuario_id, data) DO UPDATE SET contatos_realizados = contatos_realizados + 1
    `, [req.user.id, hoje]);
    
    res.json({ message: 'Contato registrado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Acesse: http://localhost:${PORT}`);
});
