const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

class Database {
  constructor() {
    this.db = new sqlite3.Database('./database.db', (err) => {
      if (err) {
        console.error('Erro ao conectar ao banco de dados:', err);
      } else {
        console.log('Conectado ao banco de dados SQLite');
        this.init();
      }
    });
  }

  init() {
    this.db.serialize(() => {
      // Tabela de Usuários
      this.db.run(`
        CREATE TABLE IF NOT EXISTS usuarios (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          senha TEXT NOT NULL,
          cargo TEXT NOT NULL,
          perfil TEXT NOT NULL DEFAULT 'analista',
          status TEXT NOT NULL DEFAULT 'online',
          horario_inicio TEXT,
          horario_fim TEXT,
          fila TEXT NOT NULL DEFAULT 'pos_rapidos_medios',
          meta_diaria INTEGER DEFAULT 50,
          criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Adicionar colunas de horário (migração simples)
      this.db.run('ALTER TABLE usuarios ADD COLUMN horario_inicio TEXT', () => {});
      this.db.run('ALTER TABLE usuarios ADD COLUMN horario_fim TEXT', () => {});

      // Tabela de SS (Solicitações de Serviço)
      this.db.run(`
        CREATE TABLE IF NOT EXISTS ss (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          numero_ss TEXT UNIQUE NOT NULL,
          placa TEXT,
          data_saida DATETIME,
          humor_cliente TEXT,
          cluster TEXT,
          teve_compra_peca TEXT,
          regional TEXT,
          pos_contato TEXT,
          servico_principal TEXT,
          data_envio_pesquisa DATETIME,
          ramo_fornec TEXT,
          tel_cliente TEXT,
          regiao TEXT,
          responsavel_id INTEGER,
          status TEXT DEFAULT 'pendente',
          fila TEXT,
          detalhes TEXT,
          processado_em DATETIME,
          criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (responsavel_id) REFERENCES usuarios(id)
        )
      `);

      // Tabela de Metas Diárias
      this.db.run(`
        CREATE TABLE IF NOT EXISTS metas_diarias (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          usuario_id INTEGER NOT NULL,
          data DATE NOT NULL,
          contatos_realizados INTEGER DEFAULT 0,
          meta INTEGER DEFAULT 50,
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
          UNIQUE(usuario_id, data)
        )
      `);

      // Tabela de Histórico de Redistribuição
      this.db.run(`
        CREATE TABLE IF NOT EXISTS redistribuicoes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ss_id INTEGER NOT NULL,
          usuario_origem_id INTEGER,
          usuario_destino_id INTEGER,
          realizado_por_id INTEGER NOT NULL,
          data DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (ss_id) REFERENCES ss(id),
          FOREIGN KEY (usuario_origem_id) REFERENCES usuarios(id),
          FOREIGN KEY (usuario_destino_id) REFERENCES usuarios(id),
          FOREIGN KEY (realizado_por_id) REFERENCES usuarios(id)
        )
      `);

      // Tabela de Contatos/Monitoramentos
      this.db.run(`
        CREATE TABLE IF NOT EXISTS contatos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ss_id INTEGER NOT NULL,
          usuario_id INTEGER NOT NULL,
          sucesso_contato TEXT NOT NULL,
          disparo_whatsapp TEXT NOT NULL,
          percepcao TEXT NOT NULL,
          humor_contato TEXT NOT NULL,
          observacoes TEXT,
          criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (ss_id) REFERENCES ss(id),
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        )
      `);

      // Tabela de Logs de Importação
      this.db.run(`
        CREATE TABLE IF NOT EXISTS logs_importacao (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tipo TEXT NOT NULL,
          total_ss INTEGER DEFAULT 0,
          sucesso INTEGER DEFAULT 0,
          erros INTEGER DEFAULT 0,
          usuario_id INTEGER,
          criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        )
      `);

      // Tabela de Detalhes de Importação
      this.db.run(`
        CREATE TABLE IF NOT EXISTS detalhes_importacao (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          log_id INTEGER NOT NULL,
          status TEXT NOT NULL,
          numero_ss TEXT,
          placa TEXT,
          cluster TEXT,
          responsavel TEXT,
          mensagem TEXT,
          criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (log_id) REFERENCES logs_importacao(id)
        )
      `);

      // Criar usuário admin padrão
      this.criarUsuarioAdmin();
    });
  }

  criarUsuarioAdmin() {
    const senhaHash = bcrypt.hashSync('admin123', 10);
    this.db.run(`
      INSERT OR IGNORE INTO usuarios (nome, email, senha, cargo, perfil, status, fila)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, ['Luis Philippe', 'admin@localiza.com', senhaHash, 'Liderança', 'lideranca', 'online', 'pos_rapidos_medios'], (err) => {
      if (err) {
        console.log('Usuário admin já existe');
      } else {
        console.log('Usuário admin criado: admin@localiza.com / admin123');
      }
    });
  }

  query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  all(sql, params = []) {
    // Alias para query() para compatibilidade
    return this.query(sql, params);
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes, lastID: this.lastID });
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
}

module.exports = new Database();
