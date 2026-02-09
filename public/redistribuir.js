const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api'
    : 'https://sistema-pos-contato-2.onrender.com/api';

const token = localStorage.getItem('token');
if (!token) {
    window.location.href = 'login.html';
}

let ssLista = [];
let ssListaFiltrada = [];
let usuariosOnline = [];
let ssSelecionadas = new Set();

// ===== CARREGAR DADOS =====

async function carregarSSParaRedistribuir() {
    try {
        const response = await fetch(`${API_URL}/ss/para-redistribuir`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            console.error('Erro na resposta:', response.status, error);
            
            if (response.status === 403) {
                mostrarErro('Acesso restrito. Apenas usuários com perfil de liderança podem acessar esta página.');
                setTimeout(() => window.location.href = 'index.html', 3000);
                return;
            }
            
            const msg = error.error || 'Erro ao carregar SS. Verifique sua conexão.';
            mostrarErro(msg);
            return;
        }
        
        esconderErro();
        const dados = await response.json();
        console.log('SS\'s carregadas:', dados.length);
        ssLista = dados;
        aplicarFiltros();
    } catch (error) {
        console.error('Erro ao carregar SS:', error);
        mostrarErro('Erro ao carregar SS. Verifique sua conexão.');
    }
}

function mostrarErro(mensagem) {
    const el = document.getElementById('erroRedistribuir');
    if (!el) return;
    el.textContent = mensagem;
    el.style.display = 'block';
}

function esconderErro() {
    const el = document.getElementById('erroRedistribuir');
    if (!el) return;
    el.textContent = '';
    el.style.display = 'none';
}

async function carregarUsuarios() {
    try {
        const response = await fetch(`${API_URL}/usuarios`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const usuarios = await response.json();
        usuariosOnline = usuarios.filter(u => u.status === 'online' || u.status === 'ausente');
        
        // Preencher apenas filtro
        const filtroUsuario = document.getElementById('filtroUsuario');
        
        usuarios.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.id;
            opt.textContent = `${u.nome} - ${formatarFila(u.fila)}`;
            filtroUsuario.appendChild(opt);
        });
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
    }
}

function formatarFila(fila) {
    const filas = {
        'revisao_serv_rapido': 'Revisão + Serv. Rápido',
        'servico_complexo': 'Serviço Complexo',
        'servico_medio': 'Serviço Médio',
        'especiais': 'Especiais'
    };
    return filas[fila] || fila;
}

// ===== FILTROS =====

function aplicarFiltros() {
    const filtroFila = document.getElementById('filtroFila').value;
    const filtroUsuario = document.getElementById('filtroUsuario').value;
    const filtroSS = document.getElementById('filtroSS').value.toLowerCase();
    const filtroRegional = document.getElementById('filtroRegional').value.toLowerCase();
    const filtroPlaca = document.getElementById('filtroPlaca').value.toLowerCase();

    ssListaFiltrada = ssLista.filter(ss => {
        if (filtroFila && (ss.fila || ss.cluster) !== filtroFila) return false;
        if (filtroUsuario && String(ss.responsavel_id) !== filtroUsuario) return false;
        if (filtroSS && !(ss.numero_ss || '').toLowerCase().includes(filtroSS)) return false;
        if (filtroRegional && !(ss.regional || '').toLowerCase().includes(filtroRegional)) return false;
        if (filtroPlaca && !(ss.placa || '').toLowerCase().includes(filtroPlaca)) return false;
        return true;
    });

    renderizar();
}

function renderizar() {
    const tbody = document.getElementById('redistribuirBody');
    tbody.innerHTML = '';

    if (ssListaFiltrada.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center; padding: 24px; color: #777;">
                    Nenhuma SS em análise encontrada
                </td>
            </tr>
        `;
        atualizarContador();
        return;
    }

    ssListaFiltrada.forEach(ss => {
        const statusClass = ss.responsavel_status === 'online' ? 'status-online' :
                            ss.responsavel_status === 'ausente' ? 'status-ausente' : 'status-offline';
        const statusEmoji = ss.responsavel_status === 'online' ? '🟢' :
                            ss.responsavel_status === 'ausente' ? '🟠' : '⚫';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="checkbox" class="checkbox-ss" data-id="${ss.id}" ${ssSelecionadas.has(ss.id) ? 'checked' : ''}></td>
            <td>${ss.numero_ss || '-'}</td>
            <td><strong>${ss.placa || '-'}</strong></td>
            <td>${ss.regional || '-'}</td>
            <td>${formatarFila(ss.fila || ss.cluster)}</td>
            <td>${ss.responsavel_nome || '-'}</td>
            <td><span class="status-pill ${statusClass}">${statusEmoji} ${ss.responsavel_status || 'offline'}</span></td>
            <td>${formatarData(ss.data_saida)}</td>
        `;
        tbody.appendChild(tr);
    });

    atualizarContador();
}

function excelSerialToDate(value) {
    const serial = Number(value);
    if (!Number.isFinite(serial)) return null;
    const ms = (serial - 25569) * 86400 * 1000;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date;
}

function parseDateFlexible(value) {
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
}

function formatarData(dataStr) {
    if (!dataStr) return '-';
    const data = parseDateFlexible(dataStr);
    if (!data) return '-';
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    const hora = String(data.getHours()).padStart(2, '0');
    const min = String(data.getMinutes()).padStart(2, '0');
    const seg = String(data.getSeconds()).padStart(2, '0');
    return `${dia}/${mes}/${ano}  ${hora}:${min}:${seg}`;
}

function atualizarContador() {
    document.getElementById('contadorSelecionadas').textContent = `${ssSelecionadas.size} selecionadas`;
}

// ===== SELEÇÃO =====

document.getElementById('redistribuirBody')?.addEventListener('change', (e) => {
    if (e.target.classList.contains('checkbox-ss')) {
        const id = Number(e.target.dataset.id);
        if (e.target.checked) {
            ssSelecionadas.add(id);
        } else {
            ssSelecionadas.delete(id);
        }
        atualizarContador();
    }
});

document.getElementById('selecionarTodos')?.addEventListener('change', (e) => {
    const checkboxes = document.querySelectorAll('.checkbox-ss');
    checkboxes.forEach(cb => {
        cb.checked = e.target.checked;
        const id = Number(cb.dataset.id);
        if (e.target.checked) {
            ssSelecionadas.add(id);
        } else {
            ssSelecionadas.delete(id);
        }
    });
    atualizarContador();
});

// ===== REDISTRIBUIÇÃO =====

document.getElementById('btnRedistribuirAuto')?.addEventListener('click', async () => {
    if (ssSelecionadas.size === 0) {
        alert('Selecione ao menos uma SS');
        return;
    }

    if (!confirm(`Redistribuir ${ssSelecionadas.size} SS(s) automaticamente entre usuários online?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/ss/redistribuir-automatico`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ ss_ids: Array.from(ssSelecionadas) })
        });

        if (!response.ok) {
            const error = await response.json();
            alert(error.error || 'Erro ao redistribuir');
            return;
        }

        alert('Redistribuição automática concluída!');
        ssSelecionadas.clear();
        await carregarSSParaRedistribuir();
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao redistribuir');
    }
});



// ===== EVENTOS DE FILTRO =====

['filtroFila', 'filtroUsuario', 'filtroSS', 'filtroRegional', 'filtroPlaca'].forEach(id => {
    const el = document.getElementById(id);
    const eventType = el.tagName === 'SELECT' ? 'change' : 'input';
    el.addEventListener(eventType, aplicarFiltros);
});

// ===== INICIALIZAÇÃO =====

document.addEventListener('DOMContentLoaded', async () => {
    await carregarUsuarios();
    await carregarSSParaRedistribuir();
});
