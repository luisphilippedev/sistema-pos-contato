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

const isPostgres = !!process.env.DATABASE_URL;

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function isWithinWorkHours(user) {
  const inicio = parseTimeToMinutes(user.horario_inicio);
  const fim = parseTimeToMinutes(user.horario_fim);
  if (inicio === null || fim === null) return true;

  // Horário de Brasília (UTC-3)
  const now = new Date();
  const brasiliaOffset = -3 * 60; // UTC-3 em minutos
  const localOffset = now.getTimezoneOffset(); // offset local em minutos
  const offsetDiff = brasiliaOffset - localOffset;
  
  const brasiliaTime = new Date(now.getTime() + offsetDiff * 60 * 1000);
  const nowMinutes = brasiliaTime.getHours() * 60 + brasiliaTime.getMinutes();

  if (inicio === fim) return true;
  if (fim > inicio) {
    return nowMinutes >= inicio && nowMinutes <= fim;
  }
  // Turno atravessa meia-noite
  return nowMinutes >= inicio || nowMinutes <= fim;
}

function getEffectiveStatus(user) {
  if (!isWithinWorkHours(user)) return 'offline';
  return user.status || 'offline';
}

function withEffectiveStatus(user) {
  return { ...user, status: getEffectiveStatus(user) };
}

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

    const usuarioComStatus = withEffectiveStatus(usuario);

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        cargo: usuario.cargo,
        perfil: usuario.perfil,
        fila: usuario.fila,
        status: usuarioComStatus.status,
        horario_inicio: usuario.horario_inicio,
        horario_fim: usuario.horario_fim
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== ROTAS DE USUÁRIOS =====

// Dados do usuário logado
app.get('/api/me', authenticateToken, async (req, res) => {
  try {
    const usuario = await db.get(
      'SELECT id, nome, email, cargo, perfil, status, fila, meta_diaria, horario_inicio, horario_fim FROM usuarios WHERE id = ?'
      , [req.user.id]
    );

    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(withEffectiveStatus(usuario));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint de debug para verificar status de distribuição
app.get('/api/debug/status-distribuicao', authenticateToken, async (req, res) => {
  try {
    const { cluster } = req.query;
    const usuario = await db.get(
      'SELECT id, nome, status, fila, horario_inicio, horario_fim FROM usuarios WHERE id = ?',
      [req.user.id]
    );
    
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const inicio = parseTimeToMinutes(usuario.horario_inicio);
    const fim = parseTimeToMinutes(usuario.horario_fim);
    
    const debugInfo = {
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        status_banco: usuario.status,
        fila: usuario.fila,
        horario_inicio: usuario.horario_inicio,
        horario_fim: usuario.horario_fim
      },
      horario_atual: {
        hora: now.toLocaleTimeString('pt-BR'),
        minutos_do_dia: nowMinutes,
        inicio_minutos: inicio,
        fim_minutos: fim
      },
      verificacoes: {
        tem_horario_configurado: !!(usuario.horario_inicio && usuario.horario_fim),
        status_e_online: usuario.status === 'online',
        dentro_horario: isWithinWorkHours(usuario),
        fila_corresponde: cluster ? usuario.fila === cluster : 'não verificado',
        status_efetivo: getEffectiveStatus(usuario)
      },
      cluster_verificado: cluster || 'nenhum',
      passou_filtro: usuario.status === 'online' && 
                     getEffectiveStatus(usuario) === 'online' && 
                     (!cluster || usuario.fila === cluster)
    };
    
    res.json(debugInfo);
  } catch (error) {
    console.error('Erro ao verificar status:', error);
    res.status(500).json({ error: 'Erro ao verificar status' });
  }
});


// Listar todos os usuários (apenas liderança)
app.get('/api/usuarios', authenticateToken, authenticateLideranca, async (req, res) => {
  try {
    const usuarios = await db.query('SELECT id, nome, email, cargo, perfil, status, fila, meta_diaria, horario_inicio, horario_fim FROM usuarios');
    res.json(usuarios.map(withEffectiveStatus));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Criar novo usuário (apenas liderança)
app.post('/api/usuarios', authenticateToken, authenticateLideranca, async (req, res) => {
  try {
    const { nome, email, senha, cargo, perfil, fila, horario_inicio, horario_fim } = req.body;
    const senhaHash = bcrypt.hashSync(senha, 10);
    
    const result = await db.run(
      'INSERT INTO usuarios (nome, email, senha, cargo, perfil, fila, horario_inicio, horario_fim) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [nome, email, senhaHash, cargo, perfil || 'analista', fila || 'revisao_serv_rapido', horario_inicio || null, horario_fim || null]
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
    const { nome, cargo, perfil, status, fila, meta_diaria, horario_inicio, horario_fim } = req.body;
    
    await db.run(
      'UPDATE usuarios SET nome = ?, cargo = ?, perfil = ?, status = ?, fila = ?, meta_diaria = ?, horario_inicio = ?, horario_fim = ? WHERE id = ?',
      [nome, cargo, perfil, status, fila, meta_diaria, horario_inicio || null, horario_fim || null, id]
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
    const quatroDiasAtras = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    const dataLimite = isPostgres
      ? quatroDiasAtras.toISOString()
      : quatroDiasAtras.toISOString().replace('T', ' ').replace('Z', '');
    
    await db.run(`
      UPDATE ss 
      SET status = 'vencida' 
      WHERE status = 'pendente' 
      AND criado_em < ?
    `, [dataLimite]);
    
    // Buscar SS's pendentes com contagem de monitoramentos
    const ss = await db.query(`
      SELECT s.*, 
             COUNT(c.id) as total_monitoramentos,
             (
               SELECT c2.sucesso_contato
               FROM contatos c2
               WHERE c2.ss_id = s.id
               ORDER BY c2.criado_em DESC
               LIMIT 1
             ) as ultimo_sucesso_contato
      FROM ss s
      LEFT JOIN contatos c ON s.id = c.ss_id
      WHERE s.responsavel_id = ? AND s.status = 'pendente'
      GROUP BY s.id
      ORDER BY s.criado_em DESC
    `, [req.user.id]);
    
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
      AND status IN ('vencida', 'respondida')
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

// Redistribuir SS automaticamente (apenas liderança)
app.post('/api/ss/redistribuir-automatico', authenticateToken, authenticateLideranca, async (req, res) => {
  try {
    const { ss_ids } = req.body;
    if (!Array.isArray(ss_ids) || ss_ids.length === 0) {
      return res.status(400).json({ error: 'Selecione ao menos uma SS' });
    }

    const usuarios = await db.all(
      `SELECT id, nome, fila, status, horario_inicio, horario_fim FROM usuarios ORDER BY nome`
    );
    const usuariosOnline = usuarios.filter(u => getEffectiveStatus(u) === 'online');

    const contadorFila = {};

    for (const ss_id of ss_ids) {
      const ss = await db.get('SELECT id, responsavel_id, fila, cluster FROM ss WHERE id = ?', [ss_id]);
      if (!ss) continue;

      const fila = ss.fila || ss.cluster;
      const usuariosFila = usuariosOnline.filter(u => u.fila === fila);
      if (usuariosFila.length === 0) {
        continue;
      }

      const idx = (contadorFila[fila] || 0) % usuariosFila.length;
      const usuarioDestino = usuariosFila[idx];
      contadorFila[fila] = (contadorFila[fila] || 0) + 1;

      await db.run(
        'UPDATE ss SET responsavel_id = ? WHERE id = ?',
        [usuarioDestino.id, ss_id]
      );

      await db.run(
        'INSERT INTO redistribuicoes (ss_id, usuario_origem_id, usuario_destino_id, realizado_por_id) VALUES (?, ?, ?, ?)',
        [ss_id, ss.responsavel_id, usuarioDestino.id, req.user.id]
      );
    }

    res.json({ message: 'Redistribuição automática concluída' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Listar SS's para redistribuição (apenas liderança)
app.get('/api/ss/para-redistribuir', authenticateToken, authenticateLideranca, async (req, res) => {
  try {
    const ss = await db.query(`
      SELECT s.*, u.nome as responsavel_nome, u.status as responsavel_status,
             u.horario_inicio as responsavel_inicio, u.horario_fim as responsavel_fim
      FROM ss s
      LEFT JOIN usuarios u ON s.responsavel_id = u.id
      WHERE s.status = 'pendente'
      ORDER BY s.criado_em DESC
    `);

    const ssComStatus = ss.map(item => {
      const responsavel = {
        status: item.responsavel_status,
        horario_inicio: item.responsavel_inicio,
        horario_fim: item.responsavel_fim
      };
      return {
        ...item,
        responsavel_status: getEffectiveStatus(responsavel)
      };
    });

    res.json(ssComStatus);
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
    const contatos = await db.query(`
      SELECT c.*, u.nome as responsavel_nome
      FROM contatos c
      LEFT JOIN usuarios u ON c.usuario_id = u.id
      WHERE c.ss_id = ?
      ORDER BY c.criado_em DESC
    `, [id]);
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

// ===== ENDPOINTS DE IMPORTAÇÃO =====

// Importar planilha XLSX
app.post('/api/importar-xlsx', authenticateToken, upload.single('file'), async (req, res) => {
  const fs = require('fs');
  let logId = null;
  const excelSerialToDate = (value) => {
    const serial = Number(value);
    if (!Number.isFinite(serial)) return null;
    const ms = (serial - 25569) * 86400 * 1000;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date;
  };
  const parseDateFlexible = (value) => {
    if (!value && value !== 0) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'number') return excelSerialToDate(value);
    const str = String(value).trim();
    if (!str) return null;
    if (/^\d+(\.\d+)?$/.test(str)) return excelSerialToDate(str);
    if (str.includes('/')) {
      const [datePart, timePart = ''] = str.split(' ');
      const [d, m, y] = datePart.split('/');
      if (!y) return null;
      const [hh = '0', mm = '0', ss = '0'] = timePart.split(':');
      return new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss));
    }
    const parsed = new Date(str.replace(' ', 'T'));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };
  const formatDateTime = (date) => {
    if (!date) return null;
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
  };
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    // Ler planilha
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const dados = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Validar colunas (primeira linha = cabeçalho)
    const colunasEsperadas = [
      'ss_data_saida_real',
      'Cluster',
      'regional',
      'Ramo_Fornecedor',
      'PosContato',
      'Telefone_Cliente',
      'Servico_Principal',
      'placa',
      'ss_seq',
      'HumorCliente',
      'Data_Envio_Formatada',
      'Responsavel',
      'Percepcao',
      'Observacao',
      'Fila_Especial?',
      'Score_Priorizacao',
      'Pesquisa_respondida'
    ];

    const cabecalho = dados[0];
    if (!cabecalho || cabecalho.length < 17) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ 
        error: 'Planilha inválida: deve conter 17 colunas na ordem especificada' 
      });
    }

    // Criar log de importação
    const resultLog = await db.run(
      `INSERT INTO logs_importacao (tipo, total_ss, sucesso, erros, usuario_id) 
       VALUES (?, ?, ?, ?, ?)`,
      ['manual', 0, 0, 0, req.user.id]
    );
    logId = resultLog.id || resultLog.lastID;

    // Buscar usuários online para distribuição
    const usuarios = await db.all(
      `SELECT id, nome, fila, status, horario_inicio, horario_fim FROM usuarios ORDER BY nome`
    );
    const usuariosOnline = usuarios.filter(u => getEffectiveStatus(u) === 'online');

    if (usuariosOnline.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ 
        error: 'Nenhum usuário online para receber as SS\'s' 
      });
    }

    let totalProcessadas = 0;
    let sucessos = 0;
    let erros = 0;

    // Processar cada linha (ignorar cabeçalho)
    for (let i = 1; i < dados.length; i++) {
      const linha = dados[i];
      
      // Ignorar linhas vazias
      if (!linha || linha.length === 0 || !linha[8]) continue;

      try {
        const numeroSS = String(linha[8] || '').trim();
        const placa = String(linha[7] || '').trim();
        const clusterRaw = String(linha[1] || '').trim();
        const regional = String(linha[2] || '').trim();
        const servico = String(linha[6] || '').trim();
        const dataSaida = formatDateTime(parseDateFlexible(linha[0]));
        const pesquisaRespondida = String(linha[16] || '').trim().toLowerCase();

        // Normalizar cluster para formato do banco
        const clusterMap = {
          'REVISAO + SERV. RAPIDO': 'revisao_serv_rapido',
          'Revisao + Serv. Rapido': 'revisao_serv_rapido',
          'Revisão + Serv. Rápido': 'revisao_serv_rapido',
          'SERVICO COMPLEXO': 'servico_complexo',
          'Servico Complexo': 'servico_complexo',
          'Serviço Complexo': 'servico_complexo',
          'SERVICO MEDIO': 'servico_medio',
          'Servico Medio': 'servico_medio',
          'Serviço Médio': 'servico_medio',
          'ESPECIAIS': 'especiais',
          'Especiais': 'especiais',
          // Compatibilidade com nomes antigos
          'Pós Rápidos e Médios': 'revisao_serv_rapido',
          'pos rapidos e medios': 'revisao_serv_rapido',
          'Pós Complexo': 'servico_complexo',
          'pos complexo': 'servico_complexo',
          'Pós Especiais': 'especiais',
          'pos especiais': 'especiais'
        };
        const clusterNormalizado = clusterRaw
          .toLowerCase()
          .replace(/[+./]/g, ' ')
          .replace(/\s+/g, '_')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        const cluster = clusterMap[clusterRaw] || clusterNormalizado;

        if (!numeroSS) {
          erros++;
          await db.run(
            `INSERT INTO detalhes_importacao (log_id, status, numero_ss, mensagem) 
             VALUES (?, ?, ?, ?)`,
            [logId, 'erro', numeroSS, 'Número da SS vazio']
          );
          continue;
        }

        // Verificar se SS já existe
        const ssExistente = await db.get(
          `SELECT id, responsavel_id, status FROM ss WHERE numero_ss = ?`,
          [numeroSS]
        );

        if (ssExistente) {
          // Se pesquisa respondida = sim, marcar como respondida e tirar da análise
          if (pesquisaRespondida === 'sim') {
            await db.run(
              `UPDATE ss SET status = 'respondida' WHERE id = ?`,
              [ssExistente.id]
            );
            sucessos++;
            await db.run(
              `INSERT INTO detalhes_importacao (log_id, status, numero_ss, placa, cluster, mensagem) 
               VALUES (?, ?, ?, ?, ?, ?)`,
              [logId, 'sucesso', numeroSS, placa, cluster, 'SS já existia e foi marcada como respondida']
            );
          } else {
            erros++;
            await db.run(
              `INSERT INTO detalhes_importacao (log_id, status, numero_ss, placa, cluster, mensagem) 
               VALUES (?, ?, ?, ?, ?, ?)`,
              [logId, 'erro', numeroSS, placa, cluster, 'SS já existe no sistema']
            );
          }
          continue;
        }

        // Distribuir somente para usuários online da mesma fila
        let usuariosFila = usuariosOnline.filter(u => u.fila === cluster);
        if (usuariosFila.length === 0) {
          // fallback: tentar usuários com status='online' mesmo que estejam fora do horário
          const usuariosFilaFallback = usuarios.filter(u => u.status === 'online' && u.fila === cluster);
          if (usuariosFilaFallback.length > 0) {
            usuariosFila = usuariosFilaFallback;
          } else {
            erros++;
            await db.run(
              `INSERT INTO detalhes_importacao (log_id, status, numero_ss, placa, cluster, mensagem) 
               VALUES (?, ?, ?, ?, ?, ?)`,
              [logId, 'erro', numeroSS, placa, cluster, 'Nenhum usuário online na fila correspondente']
            );
            continue;
          }
        }

        const usuarioResponsavel = usuariosFila[totalProcessadas % usuariosFila.length];

        // Definir status baseado em Pesquisa_respondida
        const status = pesquisaRespondida === 'sim' ? 'respondida' : 'pendente';

        // Inserir SS
        await db.run(
          `INSERT INTO ss (
            numero_ss, placa, regional, servico_principal, data_saida, 
            data_envio_pesquisa, cluster, fila, responsavel_id, status, criado_em
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
          [
            numeroSS,
            placa,
            regional,
            servico,
            dataSaida,
            formatDateTime(parseDateFlexible(linha[10])) || null, // Data_Envio_Formatada
            cluster,
            cluster,
            usuarioResponsavel.id,
            status
          ]
        );

        sucessos++;
        await db.run(
          `INSERT INTO detalhes_importacao (log_id, status, numero_ss, placa, cluster, responsavel, mensagem) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [logId, 'sucesso', numeroSS, placa, cluster, usuarioResponsavel.nome, 
           `Distribuído para ${usuarioResponsavel.nome}`]
        );

      } catch (error) {
        erros++;
        await db.run(
          `INSERT INTO detalhes_importacao (log_id, status, numero_ss, mensagem) 
           VALUES (?, ?, ?, ?)`,
          [logId, 'erro', linha[8] || '', error.message]
        );
      }

      totalProcessadas++;
    }

    // Atualizar log
    await db.run(
      `UPDATE logs_importacao SET total_ss = ?, sucesso = ?, erros = ? WHERE id = ?`,
      [totalProcessadas, sucessos, erros, logId]
    );

    // Remover arquivo temporário
    fs.unlinkSync(req.file.path);

    res.json({
      message: 'Importação concluída',
      total: totalProcessadas,
      sucesso: sucessos,
      erros: erros,
      logId: logId
    });

  } catch (error) {
    // Limpar arquivo em caso de erro
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error('Erro na importação:', error);
    res.status(500).json({ error: error.message });
  }
});

// Listar logs de importação
app.get('/api/logs-importacao', authenticateToken, async (req, res) => {
  try {
    const logs = await db.all(`
      SELECT 
        l.*,
        u.nome as usuario_nome
      FROM logs_importacao l
      LEFT JOIN usuarios u ON l.usuario_id = u.id
      ORDER BY l.criado_em DESC
    `);
    
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obter log específico
app.get('/api/logs-importacao/:id', authenticateToken, async (req, res) => {
  try {
    const log = await db.get(`
      SELECT 
        l.*,
        u.nome as usuario_nome
      FROM logs_importacao l
      LEFT JOIN usuarios u ON l.usuario_id = u.id
      WHERE l.id = ?
    `, [req.params.id]);
    
    if (!log) {
      return res.status(404).json({ error: 'Log não encontrado' });
    }
    
    res.json(log);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obter detalhes de um log
app.get('/api/logs-importacao/:id/detalhes', authenticateToken, async (req, res) => {
  try {
    const detalhes = await db.all(`
      SELECT * FROM detalhes_importacao 
      WHERE log_id = ?
      ORDER BY id ASC
    `, [req.params.id]);
    
    res.json(detalhes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Acesse: http://localhost:${PORT}`);
});
