const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api'
    : 'https://sistema-pos-contato-2.onrender.com/api';

const token = localStorage.getItem('token');
if (!token) {
    window.location.href = 'login.html';
}

let periodo = 'mes';
let dadosDashboard = null;

// ===== CORES =====
const CORES = {
    primary: '#2d5f3f',
    green: '#6DBF8B',
    blue: '#4A90E2',
    yellow: '#F5A623',
    red: '#E74C3C',
    purple: '#9B59B6',
    filas: ['#6DBF8B', '#4A90E2', '#F5A623', '#9B59B6'],
    status: {
        pendente: '#F5A623',
        vencida: '#E74C3C',
        respondida: '#6DBF8B'
    },
    contato: {
        'Resolvido': '#27ae60',
        'Sem sucesso': '#F5A623',
        'Fora de atuação': '#4A90E2',
        'Sem contato': '#95a5a6'
    }
};

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', async () => {
    await carregarDados();
    
    document.getElementById('filtroPeriodo').addEventListener('change', async (e) => {
        periodo = e.target.value;
        await carregarDados();
    });
    
    document.getElementById('btnAtualizar').addEventListener('click', async () => {
        await carregarDados();
    });
});

// ===== CARREGAR DADOS =====
async function carregarDados() {
    try {
        const [ssData, usuarios, contatos] = await Promise.all([
            fetch(`${API_URL}/dashboard/ss?periodo=${periodo}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(r => r.json()),
            fetch(`${API_URL}/usuarios`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(r => r.json()),
            fetch(`${API_URL}/dashboard/contatos?periodo=${periodo}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(r => r.json()).catch(() => [])
        ]);
        
        dadosDashboard = { ss: ssData, usuarios, contatos };
        
        renderizarDashboard();
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        alert('Erro ao carregar dados do dashboard');
    }
}

// ===== RENDERIZAR DASHBOARD =====
function renderizarDashboard() {
    const { ss, usuarios, contatos } = dadosDashboard;
    
    atualizarPeriodoAtual();
    renderizarKPIs(ss, contatos);
    renderizarChartFila(ss);
    renderizarChartTemporal(ss);
    renderizarChartRegional(ss);
    renderizarChartStatus(ss);
    renderizarRanking(ss, usuarios);
    renderizarPlacas(ss);
    renderizarChartContato(contatos);
}

// ===== PERÍODO ATUAL =====
function atualizarPeriodoAtual() {
    const hoje = new Date();
    const opcoes = { day: '2-digit', month: 'long', year: 'numeric' };
    let texto = '';
    
    switch(periodo) {
        case 'hoje':
            texto = `Hoje - ${hoje.toLocaleDateString('pt-BR', opcoes)}`;
            break;
        case 'semana':
            texto = 'Esta Semana';
            break;
        case 'mes':
            texto = hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
            break;
        case 'trimestre':
            texto = 'Último Trimestre';
            break;
    }
    
    document.getElementById('periodoAtual').textContent = texto;
}

// ===== KPIS =====
function renderizarKPIs(ss, contatos) {
    const total = ss.length;
    const concluidas = ss.filter(s => s.status === 'respondida').length;
    const emAnalise = ss.filter(s => s.status === 'pendente').length;
    const vencidas = ss.filter(s => s.status === 'vencida').length;
    
    // Calcular média de input por dia
    const datasUnicas = [...new Set(ss.map(s => s.criado_em?.split(' ')[0] || s.criado_em?.split('T')[0]))].length;
    const mediaInput = datasUnicas > 0 ? (total / datasUnicas).toFixed(1) : 0;
    
    // Taxa de sucesso
    const contatosSucesso = contatos.filter(c => c.sucesso_contato === 'Resolvido').length;
    const taxaSucesso = contatos.length > 0 ? ((contatosSucesso / contatos.length) * 100).toFixed(1) : 0;
    
    document.getElementById('kpiTotalSS').textContent = total.toLocaleString('pt-BR');
    document.getElementById('kpiConcluidas').textContent = concluidas.toLocaleString('pt-BR');
    document.getElementById('kpiEmAnalise').textContent = emAnalise.toLocaleString('pt-BR');
    document.getElementById('kpiVencidas').textContent = vencidas.toLocaleString('pt-BR');
    document.getElementById('kpiMediaInput').textContent = mediaInput;
    document.getElementById('kpiTaxaSucesso').textContent = `${taxaSucesso}%`;
    
    // Mudanças (mock - implementar comparação com período anterior)
    mostrarMudanca('changeTotalSS', 12, true);
    mostrarMudanca('changeConcluidas', 8, true);
    mostrarMudanca('changeEmAnalise', -5, true);
    mostrarMudanca('changeVencidas', -15, true);
    mostrarMudanca('changeMediaInput', 3, true);
    mostrarMudanca('changeTaxaSucesso', 5, true);
}

function mostrarMudanca(elementId, valor, positivo) {
    const el = document.getElementById(elementId);
    const sinal = valor >= 0 ? '+' : '';
    const classe = valor > 0 ? (positivo ? 'positive' : 'negative') : (positivo ? 'negative' : 'positive');
    el.textContent = `${sinal}${valor}% vs período anterior`;
    el.className = `kpi-change ${classe}`;
}

// ===== CHART: PERFORMANCE POR FILA =====
function renderizarChartFila(ss) {
    const filas = {
        'revisao_serv_rapido': 'Revisão + Serv. Rápido',
        'servico_medio': 'Serviço Médio',
        'servico_complexo': 'Serviço Complexo',
        'especiais': 'Especiais'
    };
    
    const dados = {};
    Object.keys(filas).forEach(key => dados[key] = 0);
    
    ss.forEach(s => {
        const fila = s.fila || s.cluster;
        if (dados[fila] !== undefined) dados[fila]++;
    });
    
    const ctx = document.getElementById('chartFila');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.values(filas),
            datasets: [{
                data: Object.values(dados),
                backgroundColor: CORES.filas,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 15, font: { size: 13 } }
                }
            }
        }
    });
}

// ===== CHART: TENDÊNCIA TEMPORAL =====
function renderizarChartTemporal(ss) {
    const datasMap = {};
    
    ss.forEach(s => {
        const data = (s.criado_em?.split(' ')[0] || s.criado_em?.split('T')[0]);
        if (!data) return;
        if (!datasMap[data]) datasMap[data] = { recebidas: 0, concluidas: 0 };
        datasMap[data].recebidas++;
        if (s.status === 'respondida') datasMap[data].concluidas++;
    });
    
    const datasOrdenadas = Object.keys(datasMap).sort();
    const labels = datasOrdenadas.map(d => {
        const [y, m, dia] = d.split('-');
        return `${dia}/${m}`;
    });
    
    const ctx = document.getElementById('chartTemporal');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'SS\'s Recebidas',
                    data: datasOrdenadas.map(d => datasMap[d].recebidas),
                    borderColor: CORES.blue,
                    backgroundColor: CORES.blue + '33',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'SS\'s Concluídas',
                    data: datasOrdenadas.map(d => datasMap[d].concluidas),
                    borderColor: CORES.green,
                    backgroundColor: CORES.green + '33',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// ===== CHART: PERFORMANCE REGIONAL =====
function renderizarChartRegional(ss) {
    const regionais = {};
    
    ss.forEach(s => {
        const r = s.regional || 'Não informado';
        regionais[r] = (regionais[r] || 0) + 1;
    });
    
    const sorted = Object.entries(regionais)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    const ctx = document.getElementById('chartRegional');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(r => r[0]),
            datasets: [{
                label: 'Quantidade de SS\'s',
                data: sorted.map(r => r[1]),
                backgroundColor: CORES.green
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { beginAtZero: true }
            }
        }
    });
}

// ===== CHART: STATUS =====
function renderizarChartStatus(ss) {
    const status = {
        'Pendente': ss.filter(s => s.status === 'pendente').length,
        'Vencida': ss.filter(s => s.status === 'vencida').length,
        'Respondida': ss.filter(s => s.status === 'respondida').length
    };
    
    const ctx = document.getElementById('chartStatus');
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(status),
            datasets: [{
                data: Object.values(status),
                backgroundColor: [CORES.yellow, CORES.red, CORES.green]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 15 }
                }
            }
        }
    });
}

// ===== RANKING DE USUÁRIOS =====
function renderizarRanking(ss, usuarios) {
    const stats = {};
    
    usuarios.forEach(u => {
        stats[u.id] = {
            nome: u.nome,
            fila: u.fila,
            total: 0,
            concluidas: 0
        };
    });
    
    ss.forEach(s => {
        if (stats[s.responsavel_id]) {
            stats[s.responsavel_id].total++;
            if (s.status === 'respondida') {
                stats[s.responsavel_id].concluidas++;
            }
        }
    });
    
    const ranking = Object.values(stats)
        .filter(s => s.total > 0)
        .map(s => ({
            ...s,
            taxa: s.total > 0 ? ((s.concluidas / s.total) * 100).toFixed(1) : 0,
            mediaDia: (s.total / Math.max(1, new Set(ss.map(x => x.criado_em?.split(' ')[0])).size)).toFixed(1)
        }))
        .sort((a, b) => b.total - a.total);
    
    const tbody = document.getElementById('rankingBody');
    tbody.innerHTML = ranking.map((r, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1);
        const taxaClasse = r.taxa >= 80 ? 'taxa-excelente' : r.taxa >= 60 ? 'taxa-bom' : r.taxa >= 40 ? 'taxa-regular' : 'taxa-baixo';
        const filaTexto = formatarFila(r.fila);
        
        return `
            <tr>
                <td class="pos-medal">${medal}</td>
                <td class="user-name">${r.nome}</td>
                <td>${filaTexto}</td>
                <td>${r.total}</td>
                <td>${r.concluidas}</td>
                <td><span class="taxa-badge ${taxaClasse}">${r.taxa}%</span></td>
                <td>${r.mediaDia}</td>
            </tr>
        `;
    }).join('');
}

function formatarFila(fila) {
    const filas = {
        'revisao_serv_rapido': 'Rev. + Rápido',
        'servico_medio': 'Médio',
        'servico_complexo': 'Complexo',
        'especiais': 'Especiais'
    };
    return filas[fila] || fila;
}

// ===== TOP PLACAS =====
function renderizarPlacas(ss) {
    const placas = {};
    
    ss.forEach(s => {
        const p = s.placa || 'Não informado';
        placas[p] = (placas[p] || 0) + 1;
    });
    
    const sorted = Object.entries(placas)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    const html = sorted.map(([placa, count]) => `
        <div class="placa-item">
            <span class="placa-nome">${placa}</span>
            <div class="placa-count">
                <span>${count} SS's</span>
                <span class="placa-badge">${((count / ss.length) * 100).toFixed(1)}%</span>
            </div>
        </div>
    `).join('');
    
    document.getElementById('placasList').innerHTML = html;
}

// ===== CHART: CONTATO COM SUCESSO =====
function renderizarChartContato(contatos) {
    const distribuicao = {
        'Resolvido': 0,
        'Sem sucesso': 0,
        'Fora de atuação': 0,
        'Sem contato': 0
    };
    
    contatos.forEach(c => {
        const tipo = c.sucesso_contato || 'Sem contato';
        if (distribuicao[tipo] !== undefined) {
            distribuicao[tipo]++;
        }
    });
    
    const ctx = document.getElementById('chartContato');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(distribuicao),
            datasets: [{
                label: 'Quantidade',
                data: Object.values(distribuicao),
                backgroundColor: Object.keys(distribuicao).map(k => CORES.contato[k])
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}
