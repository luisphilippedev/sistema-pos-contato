const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

class DatabasePostgres {
  constructor() {
    // Usar DATABASE_URL do Render ou SQLite local em desenvolvimento
    if (process.env.DATABASE_URL) {
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false
        }
      });
      console.log('Conectado ao PostgreSQL');
      this.init();
    } else {
      // Fallback para SQLite em desenvolvimento local
      const sqlite3 = require('sqlite3').verbose();
      this.db = new sqlite3.Database('./database.db', (err) => {
        if (err) {
          console.error('Erro ao conectar ao banco de dados:', err);
        } else {
          console.log('Conectado ao SQLite (desenvolvimento)');
          this.initSQLite();
        }
      });
    }
  }

  async init() {
    try {
      // Criar tabelas PostgreSQL
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS usuarios (
          id SERIAL PRIMARY KEY,
          nome TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          senha TEXT NOT NULL,
          cargo TEXT NOT NULL,
          perfil TEXT NOT NULL DEFAULT 'analista',
          status TEXT NOT NULL DEFAULT 'online',
          fila TEXT NOT NULL DEFAULT 'pos_rapidos_medios',
          meta_diaria INTEGER DEFAULT 50,
          criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS ss (
          id SERIAL PRIMARY KEY,
          numero_ss TEXT UNIQUE NOT NULL,
          placa TEXT,
          humor_cliente TEXT,
          cluster TEXT,
          teve_compra_peca TEXT,
          regional TEXT,
          servico_principal TEXT,
          regiao TEXT,
          responsavel_id INTEGER REFERENCES usuarios(id),
          status TEXT DEFAULT 'pendente',
          fila TEXT,
          detalhes TEXT,
          processado_em TIMESTAMP,
          criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS metas_diarias (
          id SERIAL PRIMARY KEY,
          usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
          data DATE NOT NULL,
          contatos_realizados INTEGER DEFAULT 0,
          meta INTEGER DEFAULT 50,
          UNIQUE(usuario_id, data)
        )
      `);

      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS redistribuicoes (
          id SERIAL PRIMARY KEY,
          ss_id INTEGER NOT NULL REFERENCES ss(id),
          usuario_origem_id INTEGER REFERENCES usuarios(id),
          usuario_destino_id INTEGER REFERENCES usuarios(id),
          realizado_por_id INTEGER NOT NULL REFERENCES usuarios(id),
          data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await this.criarUsuarioAdmin();
    } catch (error) {
      console.error('Erro ao inicializar banco PostgreSQL:', error);
    }
  }

  initSQLite() {
    this.db.serialize(() => {
      this.db.run(`
        CREATE TABLE IF NOT EXISTS usuarios (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          senha TEXT NOT NULL,
          cargo TEXT NOT NULL,
          perfil TEXT NOT NULL DEFAULT 'analista',
          status TEXT NOT NULL DEFAULT 'online',
          fila TEXT NOT NULL DEFAULT 'pos_rapidos_medios',
          meta_diaria INTEGER DEFAULT 50,
          criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      this.db.run(`
        CREATE TABLE IF NOT EXISTS ss (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          numero_ss TEXT UNIQUE NOT NULL,
          placa TEXT,
          humor_cliente TEXT,
          cluster TEXT,
          teve_compra_peca TEXT,
          regional TEXT,
          servico_principal TEXT,
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

      this.criarUsuarioAdmin();
    });
  }

  async criarUsuarioAdmin() {
    const senhaHash = bcrypt.hashSync('admin123', 10);
    
    if (this.pool) {
      // PostgreSQL
      try {
        await this.pool.query(`
          INSERT INTO usuarios (nome, email, senha, cargo, perfil, status, fila)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (email) DO NOTHING
        `, ['Luis Philippe', 'admin@localiza.com', senhaHash, 'Liderança', 'lideranca', 'online', 'pos_rapidos_medios']);
        console.log('Usuário admin verificado: admin@localiza.com / admin123');
      } catch (error) {
        console.log('Usuário admin já existe');
      }
    } else {
      // SQLite
      this.db.run(`
        INSERT OR IGNORE INTO usuarios (nome, email, senha, cargo, perfil, status, fila)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, ['Luis Philippe', 'admin@localiza.com', senhaHash, 'Liderança', 'lideranca', 'online', 'pos_rapidos_medios'], (err) => {
        if (!err) {
          console.log('Usuário admin criado: admin@localiza.com / admin123');
        }
      });
    }
  }

  async query(sql, params = []) {
    if (this.pool) {
      // PostgreSQL - converte placeholders ? para $1, $2, etc
      let pgSql = sql;
      params.forEach((_, index) => {
        pgSql = pgSql.replace('?', `$${index + 1}`);
      });
      const result = await this.pool.query(pgSql, params);
      return result.rows;
    } else {
      // SQLite
      return new Promise((resolve, reject) => {
        this.db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    }
  }

  async run(sql, params = []) {
    if (this.pool) {
      // PostgreSQL
      let pgSql = sql;
      params.forEach((_, index) => {
        pgSql = pgSql.replace('?', `$${index + 1}`);
      });
      
      // Se for INSERT, retornar o ID
      if (sql.trim().toUpperCase().startsWith('INSERT')) {
        pgSql = pgSql.replace(/INSERT INTO (\w+)/, 'INSERT INTO $1') + ' RETURNING id';
        const result = await this.pool.query(pgSql, params);
        return { id: result.rows[0]?.id, changes: result.rowCount };
      }
      
      const result = await this.pool.query(pgSql, params);
      return { id: null, changes: result.rowCount };
    } else {
      // SQLite
      return new Promise((resolve, reject) => {
        this.db.run(sql, params, function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, changes: this.changes });
        });
      });
    }
  }

  async get(sql, params = []) {
    if (this.pool) {
      // PostgreSQL
      let pgSql = sql;
      params.forEach((_, index) => {
        pgSql = pgSql.replace('?', `$${index + 1}`);
      });
      const result = await this.pool.query(pgSql, params);
      return result.rows[0];
    } else {
      // SQLite
      return new Promise((resolve, reject) => {
        this.db.get(sql, params, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    }
  }
}

module.exports = new DatabasePostgres();
