// Script para popular o banco com 50 SS's de teste
const db = require('./database');

const clusters = ['SERVICO COMPLEXO', 'SERVICO MEDIO', 'REVISAO + SERV. RAPIDO', 'ESPECIAIS'];
const regionais = ['RIO', 'SÃO PAULO', 'BRASÍLIA', 'MINAS GERAIS', 'BAHIA', 'PARANÁ', 'RIO GRANDE DO SUL'];
const servicosPrincipais = ['REVISÃO', 'TROCA DE ÓLEO', 'ALINHAMENTO', 'BALANCEAMENTO', 'FREIOS', 'SUSPENSÃO', 'AR CONDICIONADO'];
const posContato = ['PÓS CONTATO SEM SUCESSO', 'PÓS CONTATO COM SUCESSO', 'PÓ CONTATO PARCIAL'];
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

async function popularBanco() {
  console.log('Iniciando população do banco de dados...\n');
  
  try {
    // Aguardar um pouco para garantir que as tabelas foram criadas
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Buscar usuários cadastrados
    const usuarios = await db.query('SELECT id FROM usuarios');
    
    if (usuarios.length === 0) {
      console.log('❌ Nenhum usuário encontrado. Crie usuários primeiro!');
      return;
    }
    
    console.log(`✅ Encontrados ${usuarios.length} usuário(s)\n`);
    
    // Criar 50 SS's
    for (let i = 1; i <= 50; i++) {
      const numero_ss = `2SPX${String.fromCharCode(65 + (i % 26))}${String.fromCharCode(65 + Math.floor(i / 26))}/${i}`;
      const placa = gerarPlaca();
      const data_saida = gerarDataAleatoria(10);
      const data_envio_pesquisa = Math.random() > 0.3 ? gerarDataAleatoria(5) : null; // 70% tem data
      const cluster = clusters[Math.floor(Math.random() * clusters.length)];
      const regional = regionais[Math.floor(Math.random() * regionais.length)];
      const servico_principal = servicosPrincipais[Math.floor(Math.random() * servicosPrincipais.length)];
      const pos_contato_val = posContato[Math.floor(Math.random() * posContato.length)];
      const ramo_fornec = ramoFornec[Math.floor(Math.random() * ramoFornec.length)];
      const humor_cliente = humores[Math.floor(Math.random() * humores.length)];
      const teve_compra_peca = compraPeca[Math.floor(Math.random() * compraPeca.length)];
      const tel_cliente = gerarTelefone();
      const fila = i <= 12 ? 'revisao_serv_rapido' : (i <= 24 ? 'servico_medio' : (i <= 36 ? 'servico_complexo' : 'especiais'));
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
        
        console.log(`✅ ${i}/50 - SS ${numero_ss} | Placa: ${placa} | Fila: ${fila}`);
        
      } catch (error) {
        console.log(`❌ Erro ao inserir SS ${numero_ss}: ${error.message}`);
      }
    }
    
    console.log('\n🎉 População do banco concluída!');
    console.log('\nEstatísticas:');
    const total = await db.get('SELECT COUNT(*) as total FROM ss');
    const porFila = await db.query('SELECT fila, COUNT(*) as qtd FROM ss GROUP BY fila');
    
    console.log(`Total de SS's: ${total.total}`);
    porFila.forEach(f => {
      const nome = f.fila === 'pos_rapidos_medios' ? 'Rápidos/Médios' :
                   f.fila === 'pos_complexo' ? 'Complexo' : 'Especiais';
      console.log(`  - ${nome}: ${f.qtd}`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao popular banco:', error);
  }
  
  process.exit(0);
}

// Executar
popularBanco();
