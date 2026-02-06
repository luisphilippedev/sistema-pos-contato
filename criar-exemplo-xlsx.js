const XLSX = require('xlsx');

// Dados de exemplo
const dados = [
  // Cabeçalho (17 colunas na ordem especificada)
  [
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
  ],
  // Linha 1 - Pendente
  [
    '2024-01-15',
    'pos_rapidos_medios',
    'SP',
    'Ramo A',
    'Sim',
    '11987654321',
    'Manutenção',
    'ABC1234',
    'SS001',
    'Satisfeito',
    '2024-01-20',
    'João Silva',
    'Positiva',
    'Cliente satisfeito com o atendimento',
    'Não',
    '85',
    'Não'
  ],
  // Linha 2 - Pendente
  [
    '2024-01-16',
    'pos_lentes_complexos',
    'RJ',
    'Ramo B',
    'Sim',
    '21987654321',
    'Troca de peças',
    'XYZ5678',
    'SS002',
    'Neutro',
    '2024-01-21',
    'Maria Santos',
    'Neutra',
    'Sem observações',
    'Sim',
    '70',
    'Não'
  ],
  // Linha 3 - Respondida (pesquisa já foi respondida)
  [
    '2024-01-17',
    'pos_rapidos_medios',
    'MG',
    'Ramo C',
    'Sim',
    '31987654321',
    'Revisão',
    'DEF9012',
    'SS003',
    'Muito Satisfeito',
    '2024-01-22',
    'Pedro Oliveira',
    'Muito Positiva',
    'Excelente atendimento',
    'Não',
    '95',
    'Sim'
  ],
  // Linha 4 - Pendente
  [
    '2024-01-18',
    'pos_rapidos_medios',
    'SP',
    'Ramo A',
    'Sim',
    '11976543210',
    'Diagnóstico',
    'GHI3456',
    'SS004',
    'Insatisfeito',
    '2024-01-23',
    'Ana Costa',
    'Negativa',
    'Cliente reclamou do tempo de espera',
    'Não',
    '45',
    'Não'
  ],
  // Linha 5 - Pendente
  [
    '2024-01-19',
    'pos_lentes_complexos',
    'BA',
    'Ramo D',
    'Sim',
    '71987654321',
    'Instalação',
    'JKL7890',
    'SS005',
    'Satisfeito',
    '2024-01-24',
    'Carlos Almeida',
    'Positiva',
    'Tudo certo',
    'Sim',
    '80',
    'Não'
  ]
];

// Criar workbook
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(dados);

// Adicionar worksheet ao workbook
XLSX.utils.book_append_sheet(wb, ws, 'SS');

// Salvar arquivo
XLSX.writeFile(wb, 'exemplo_importacao.xlsx');

console.log('✅ Arquivo exemplo_importacao.xlsx criado com sucesso!');
console.log('📊 Total de registros: 5 (3 pendentes + 1 respondida + 1 pendente)');
console.log('🎯 Clusters: pos_rapidos_medios (3), pos_lentes_complexos (2)');
