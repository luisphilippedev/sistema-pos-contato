const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api'
    : 'https://sistema-pos-contato-2.onrender.com/api';

const token = localStorage.getItem('token');
if (!token) {
    window.location.href = 'login.html';
}

let periodo = 'mes';
let filaFiltro = '';
let dadosDashboard = null;
let chartFilaInstance = null;
let chartRegionalInstance = null;

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
    
    document.getElementById('filtroFila').addEventListener('change', async (e) => {
        filaFiltro = e.target.value;
        renderizarDashboard();
    });

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
    const ssFiltradas = filtrarPorFila(ss);
    const contatosFiltrados = filtrarContatosPorFila(contatos, ssFiltradas);

    atualizarPeriodoAtual();
    renderizarKPIs(ssFiltradas, contatosFiltrados);
    renderizarChartFila(ssFiltradas);
    renderizarChartRegional(ssFiltradas);
    renderizarRanking(ssFiltradas, usuarios);
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
    
    // Quantidade de input e médias
    const datas = ss.map(s => s.criado_em).filter(Boolean);
    const diasUnicos = new Set(datas.map(d => (d.split(' ')[0] || d.split('T')[0]))).size;
    const mesesUnicos = new Set(datas.map(d => {
        const [y, m] = (d.split(' ')[0] || d.split('T')[0]).split('-');
        return `${y}-${m}`;
    })).size;
    const mediaDia = diasUnicos > 0 ? (total / diasUnicos).toFixed(1) : 0;
    const mediaMes = mesesUnicos > 0 ? (total / mesesUnicos).toFixed(1) : 0;
    
    // Taxa de sucesso
    const contatosSucesso = contatos.filter(c => c.sucesso_contato === 'Resolvido').length;
    const taxaSucesso = contatos.length > 0 ? ((contatosSucesso / contatos.length) * 100).toFixed(1) : 0;
    
    document.getElementById('kpiTotalSS').textContent = total.toLocaleString('pt-BR');
    document.getElementById('kpiConcluidas').textContent = concluidas.toLocaleString('pt-BR');
    document.getElementById('kpiEmAnalise').textContent = emAnalise.toLocaleString('pt-BR');
    document.getElementById('kpiVencidas').textContent = vencidas.toLocaleString('pt-BR');
    document.getElementById('kpiInputTotal').textContent = total.toLocaleString('pt-BR');
    document.getElementById('kpiMediaInputDia').textContent = mediaDia;
    document.getElementById('kpiMediaInputMes').textContent = mediaMes;
    document.getElementById('kpiTaxaSucesso').textContent = `${taxaSucesso}%`;
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
    
    const pendentes = ss.filter(s => s.status === 'pendente');
    pendentes.forEach(s => {
        const fila = s.fila || s.cluster;
        if (dados[fila] !== undefined) dados[fila]++;
    });

    const ctx = document.getElementById('chartFila');
    if (chartFilaInstance) {
        chartFilaInstance.destroy();
    }
    chartFilaInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.values(filas),
            datasets: [{
                data: Object.values(dados),
                backgroundColor: CORES.filas,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
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
    if (chartRegionalInstance) {
        chartRegionalInstance.destroy();
    }
    chartRegionalInstance = new Chart(ctx, {
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

// ===== RANKING DE USUÁRIOS =====
function renderizarRanking(ss, usuarios) {
    const stats = {};
    
    usuarios.forEach(u => {
        stats[u.id] = {
            nome: u.nome,
            fila: u.fila,
            total: 0,
            concluidas: 0,
            emAnalise: 0,
            vencidas: 0
        };
    });
    
    ss.forEach(s => {
        if (stats[s.responsavel_id]) {
            stats[s.responsavel_id].total++;
            if (s.status === 'respondida') {
                stats[s.responsavel_id].concluidas++;
            }
            if (s.status === 'pendente') {
                stats[s.responsavel_id].emAnalise++;
            }
            if (s.status === 'vencida') {
                stats[s.responsavel_id].vencidas++;
            }
        }
    });
    
    const ranking = Object.values(stats)
        .filter(s => s.total > 0)
        .sort((a, b) => b.total - a.total);
    
    const tbody = document.getElementById('rankingBody');
    tbody.innerHTML = ranking.map((r, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1);
        const filaTexto = formatarFila(r.fila);
        
        return `
            <tr>
                <td class="pos-medal">${medal}</td>
                <td class="user-name">${r.nome}</td>
                <td>${filaTexto}</td>
                <td>${r.total}</td>
                <td>${r.concluidas}</td>
                <td>${r.emAnalise}</td>
                <td>${r.vencidas}</td>
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

// ===== FILTROS =====
function filtrarPorFila(ss) {
    if (!filaFiltro) return ss;
    return ss.filter(s => (s.fila || s.cluster) === filaFiltro);
}

function filtrarContatosPorFila(contatos, ssFiltradas) {
    const ids = new Set(ssFiltradas.map(s => s.id));
    return contatos.filter(c => ids.has(c.ss_id));
}
