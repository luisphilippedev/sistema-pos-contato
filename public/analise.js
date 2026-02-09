// Configuração da API
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000/api' 
  : `${window.location.origin}/api`;

let token = localStorage.getItem('token');
let usuarioLogado = null;
let ssAtual = null;

// ===== INICIALIZAÇÃO =====

window.addEventListener('DOMContentLoaded', () => {
    token = localStorage.getItem('token');
    const usuarioStr = localStorage.getItem('usuario');
    
    if (!token || !usuarioStr) {
        window.location.href = '/';
        return;
    }
    
    usuarioLogado = JSON.parse(usuarioStr);
    inicializarAnalise();
});

async function inicializarAnalise() {
    await carregarUsuarioAtual();

    // Carregar informações do usuário
    document.getElementById('userNameAnalise').textContent = usuarioLogado.nome;
    
    // Status do usuário
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('userStatusText');
    statusDot.classList.remove('online', 'ausente', 'offline');
    
    if (usuarioLogado.status === 'online') {
        statusDot.classList.add('online');
        statusText.textContent = 'Online';
    } else if (usuarioLogado.status === 'offline') {
        statusDot.classList.add('offline');
        statusText.textContent = 'Offline';
    } else {
        statusDot.classList.add('ausente');
        statusText.textContent = 'Ausente';
    }
    
    // Fila
    document.getElementById('filaAnalise').textContent = formatarFila(usuarioLogado.fila);
    
    // Carregar SS's
    await carregarSSsUsuario();
    
    // Setup form validation
    setupFormValidation();
    
    // Setup filtros
    setupFiltros();
}

async function carregarUsuarioAtual() {
    try {
        const response = await fetch(`${API_URL}/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) return;
        const data = await response.json();
        usuarioLogado = data;
        localStorage.setItem('usuario', JSON.stringify(usuarioLogado));
    } catch (error) {
        console.error('Erro ao carregar usuário:', error);
    }
}

// ===== FILTROS E ORDENAÇÃO =====

function setupFiltros() {
    ['filtroSS', 'filtroPlaca', 'filtroDataSaida', 'filtroCluster', 'filtroRegional', 'filtroServico', 'filtroDataPesquisa', 'filtroContatoSucesso'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const eventType = el.tagName === 'SELECT' ? 'change' : 'input';
        el.addEventListener(eventType, aplicarFiltrosEOrdenacao);
    });
}

function aplicarFiltrosEOrdenacao() {
    let listaFiltrada = [...ssListaOriginal];
    
    // Aplicar filtros
    const filtroSS = document.getElementById('filtroSS')?.value.toLowerCase();
    const filtroPlaca = document.getElementById('filtroPlaca')?.value.toLowerCase();
    const filtroDataSaida = document.getElementById('filtroDataSaida')?.value;
    const filtroCluster = document.getElementById('filtroCluster')?.value.toLowerCase();
    const filtroRegional = document.getElementById('filtroRegional')?.value.toLowerCase();
    const filtroServico = document.getElementById('filtroServico')?.value.toLowerCase();
    const filtroDataPesquisa = document.getElementById('filtroDataPesquisa')?.value;
    const filtroContatoSucesso = document.getElementById('filtroContatoSucesso')?.value.toLowerCase();
    
    if (filtroSS) {
        listaFiltrada = listaFiltrada.filter(ss => (ss.numero_ss || '').toLowerCase().includes(filtroSS));
    }
    if (filtroPlaca) {
        listaFiltrada = listaFiltrada.filter(ss => (ss.placa || '').toLowerCase().includes(filtroPlaca));
    }
    if (filtroDataSaida) {
        listaFiltrada = listaFiltrada.filter(ss => ss.data_saida && ss.data_saida.startsWith(filtroDataSaida));
    }
    if (filtroCluster) {
        listaFiltrada = listaFiltrada.filter(ss => (ss.cluster || '').toLowerCase().includes(filtroCluster));
    }
    if (filtroRegional) {
        listaFiltrada = listaFiltrada.filter(ss => (ss.regional || '').toLowerCase().includes(filtroRegional));
    }
    if (filtroServico) {
        listaFiltrada = listaFiltrada.filter(ss => (ss.servico_principal || '').toLowerCase().includes(filtroServico));
    }
    if (filtroDataPesquisa) {
        listaFiltrada = listaFiltrada.filter(ss => {
            const data = parseDateFlexible(ss.data_envio_pesquisa);
            if (!data) return false;
            const yyyy = data.getFullYear();
            const mm = String(data.getMonth() + 1).padStart(2, '0');
            const dd = String(data.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}` === filtroDataPesquisa;
        });
    }
    if (filtroContatoSucesso) {
        listaFiltrada = listaFiltrada.filter(ss => (ss.ultimo_sucesso_contato || '').toLowerCase() === filtroContatoSucesso);
    }
    
    // Ordenar por prazo
    listaFiltrada.sort((a, b) => {
        const prazoA = calcularDiasRestantes(a.data_envio_pesquisa);
        const prazoB = calcularDiasRestantes(b.data_envio_pesquisa);
        return ordenacaoAtual === 'asc' ? prazoA - prazoB : prazoB - prazoA;
    });
    
    renderizarTabela(listaFiltrada);
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

function calcularDiasRestantes(dataEnvioPesquisa) {
    if (!dataEnvioPesquisa) return 9999; // Sem data = vai pro final
    const prazoMaximo = 4 * 24 * 60 * 60 * 1000; // 4 dias em ms
    const dataEnvio = parseDateFlexible(dataEnvioPesquisa);
    if (!dataEnvio) return 9999;
    const dataLimite = new Date(dataEnvio.getTime() + prazoMaximo);
    const agora = new Date();
    const diff = dataLimite - agora;
    return diff / (1000 * 60 * 60); // retorna horas restantes
}

function toggleOrdenacao() {
    ordenacaoAtual = ordenacaoAtual === 'asc' ? 'desc' : 'asc';
    document.getElementById('sortIcon').textContent = ordenacaoAtual === 'asc' ? '🔽' : '🔼';
    aplicarFiltrosEOrdenacao();
}

let ssListaOriginal = [];
let ordenacaoAtual = 'asc'; // mais próximo de vencer primeiro

function formatarFila(fila) {
    const filas = {
        'revisao_serv_rapido': 'Revisão + Serv. Rápido',
        'servico_complexo': 'Serviço Complexo',
        'servico_medio': 'Serviço Médio',
        'especiais': 'Especiais'
    };
    return filas[fila] || fila;
}

// ===== CARREGAR SS's =====

async function carregarSSsUsuario() {
    try {
        const response = await fetch(`${API_URL}/minhas-ss`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        ssListaOriginal = await response.json();
        document.getElementById('ssCountAnalise').textContent = ssListaOriginal.length;
        aplicarFiltrosEOrdenacao();
        
    } catch (error) {
        console.error('Erro ao carregar SS:', error);
        alert('Erro ao carregar SS. Verifique sua conexão.');
    }
}

function renderizarTabela(ssList) {
    const tbody = document.getElementById('ssTableBody');
    tbody.innerHTML = '';
    
    if (ssList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="11" style="text-align: center; padding: 40px; color: #999;">
                    Nenhuma SS atribuída no momento
                </td>
            </tr>
        `;
        return;
    }
    
    ssList.forEach(ss => {
        const totalMonit = ss.total_monitoramentos || 0;
        const monitClass = totalMonit > 0 ? 'monit-feito' : 'monit-pendente';
        const monitText = totalMonit > 0 ? `✅ ${totalMonit}` : '⚠️ 0';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${ss.numero_ss || '-'}</td>
            <td><strong>${ss.placa || '-'}</strong></td>
            <td>${formatarData(ss.data_saida)}</td>
            <td>${ss.cluster || '-'}</td>
            <td>${ss.regional || '-'}</td>
            <td>${ss.servico_principal || '-'}</td>
            <td>${formatarData(ss.data_envio_pesquisa)}</td>
            <td>${renderizarContatoSucesso(ss.ultimo_sucesso_contato)}</td>
            <td class="${monitClass}">${monitText}</td>
            <td class="prazo-timer">${renderizarPrazo(ss.data_envio_pesquisa)}</td>
            <td>
                <button class="btn-monitorar" onclick="abrirMonitoramento(${ss.id})">
                    🔍 Monitorar
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
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

function renderizarContatoSucesso(status) {
    if (!status) return '<span class="contato-badge contato-neutral">—</span>';
    const valor = status.toLowerCase();
    if (valor === 'resolvido') return '<span class="contato-badge contato-ok">Resolvido</span>';
    if (valor === 'sem sucesso') return '<span class="contato-badge contato-warn">Sem sucesso</span>';
    if (valor === 'fora de atuação') return '<span class="contato-badge contato-info">Fora de atuação</span>';
    return `<span class="contato-badge contato-neutral">${status}</span>`;
}

function renderizarPrazo(dataEnvioPesquisa) {
    if (!dataEnvioPesquisa) {
        return '<span class="sem-prazo">Sem prazo definido</span>';
    }

    const dataEnvio = parseDateFlexible(dataEnvioPesquisa);
    if (!dataEnvio) {
        return '<span class="sem-prazo">Sem prazo definido</span>';
    }
    const agora = new Date();
    const prazoFinal = new Date(dataEnvio.getTime() + (4 * 24 * 60 * 60 * 1000)); // 4 dias
    
    const tempoDecorrido = agora - dataEnvio;
    const tempoTotal = prazoFinal - dataEnvio;
    const porcentagem = (tempoDecorrido / tempoTotal) * 100;
    
    const horasRestantes = Math.max(0, Math.floor((prazoFinal - agora) / (1000 * 60 * 60)));
    const diasRestantes = Math.floor(horasRestantes / 24);
    const horasResto = horasRestantes % 24;
    
    let cor = 'verde';
    if (porcentagem > 75) cor = 'vermelho';
    else if (porcentagem > 50) cor = 'amarelo';
    
    let textoRestante = '';
    if (horasRestantes <= 0) {
        textoRestante = 'Prazo expirado';
        cor = 'vermelho';
    } else if (diasRestantes > 0) {
        textoRestante = `${diasRestantes}d ${horasResto}h restantes`;
    } else {
        textoRestante = `${horasResto}h restantes`;
    }
    
    return `
        <div class="prazo-bar-container">
            <div class="prazo-bar ${cor}" style="width: ${Math.min(100, porcentagem)}%"></div>
        </div>
        <div class="prazo-text">${textoRestante}</div>
    `;
}

// ===== MONITORAMENTO =====

async function abrirMonitoramento(ssId) {
    try {
        const response = await fetch(`${API_URL}/ss/${ssId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        ssAtual = await response.json();
        
        // Preencher dados da placa
        document.getElementById('dadoSS').textContent = ssAtual.numero_ss || '-';
        document.getElementById('dadoPlaca').textContent = ssAtual.placa || '-';
        document.getElementById('dadoDataSaida').textContent = formatarData(ssAtual.data_saida);
        document.getElementById('dadoCluster').textContent = ssAtual.cluster || '-';
        document.getElementById('dadoCompraPeca').textContent = ssAtual.teve_compra_peca || '-';
        document.getElementById('dadoRegional').textContent = ssAtual.regional || '-';
        document.getElementById('dadoPosContato').textContent = ssAtual.pos_contato || '-';
        document.getElementById('dadoServicoPrincipal').textContent = ssAtual.servico_principal || '-';
        document.getElementById('dadoDataEnvioPesquisa').textContent = formatarData(ssAtual.data_envio_pesquisa);
        document.getElementById('dadoRamoFornec').textContent = ssAtual.ramo_fornec || '-';
        document.getElementById('dadoTelCliente').textContent = ssAtual.tel_cliente || '-';
        document.getElementById('dadoHumorCliente').textContent = ssAtual.humor_cliente || '-';
        
        // Carregar último monitoramento
        await carregarUltimoMonitoramento(ssId);
        
        // Resetar form
        document.getElementById('formRegistroContato').reset();
        document.getElementById('btnEnviarContato').disabled = true;
        
        // Abrir modal
        document.getElementById('modalMonitoramento').classList.add('active');
        
    } catch (error) {
        console.error('Erro ao carregar SS:', error);
        alert('Erro ao carregar dados da SS');
    }
}

async function carregarUltimoMonitoramento(ssId) {
    try {
        const response = await fetch(`${API_URL}/ss/${ssId}/contatos`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const contatos = await response.json();
        const container = document.getElementById('ultimoMonitoramento');
        
        if (contatos.length === 0) {
            container.innerHTML = '<p class="sem-registro">Registro de contato não realizado</p>';
            document.getElementById('btnHistorico').style.display = 'none';
        } else {
            const ultimo = contatos[0];
            container.innerHTML = `
                <div class="monitoramento-item">
                    <p><strong>Responsável:</strong> ${ultimo.responsavel_nome || 'N/A'}</p>
                    <p><strong>Data:</strong> ${formatarData(ultimo.criado_em)}</p>
                    <p><strong>Sucesso:</strong> ${ultimo.sucesso_contato}</p>
                    <p><strong>WhatsApp:</strong> ${ultimo.disparo_whatsapp}</p>
                    <p><strong>Percepção:</strong> ${ultimo.percepcao}</p>
                    <p><strong>Humor:</strong> ${ultimo.humor_contato}</p>
                    ${ultimo.observacoes ? `<p><strong>Obs:</strong> ${ultimo.observacoes}</p>` : ''}
                </div>
            `;
            
            // Mostrar botão histórico se houver mais de 1 contato
            if (contatos.length > 1) {
                document.getElementById('btnHistorico').style.display = 'block';
            } else {
                document.getElementById('btnHistorico').style.display = 'none';
            }
        }
        
    } catch (error) {
        console.error('Erro ao carregar contatos:', error);
    }
}

function fecharMonitoramento() {
    document.getElementById('modalMonitoramento').classList.remove('active');
    ssAtual = null;
}

// ===== HISTÓRICO =====

async function abrirHistorico() {
    if (!ssAtual) return;
    
    try {
        const response = await fetch(`${API_URL}/ss/${ssAtual.id}/contatos`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const contatos = await response.json();
        const lista = document.getElementById('historicoLista');
        lista.innerHTML = '';
        
        if (contatos.length === 0) {
            lista.innerHTML = '<p class="sem-registro">Nenhum contato registrado</p>';
        } else {
            contatos.forEach(contato => {
                const card = document.createElement('div');
                card.className = 'historico-card';
                card.innerHTML = `
                    <div class="historico-card-header">
                        <strong>Contato #${contato.id}</strong>
                        <small>${formatarData(contato.criado_em)}</small>
                    </div>
                    <div class="historico-card-body">
                        <p><strong>Responsável:</strong> ${contato.responsavel_nome || 'N/A'}</p>
                        <p><strong>Sucesso no contato:</strong> ${contato.sucesso_contato}</p>
                        <p><strong>Disparo WhatsApp:</strong> ${contato.disparo_whatsapp}</p>
                        <p><strong>Percepção:</strong> ${contato.percepcao}</p>
                        <p><strong>Humor:</strong> ${contato.humor_contato}</p>
                        ${contato.observacoes ? `<p><strong>Observações:</strong> ${contato.observacoes}</p>` : ''}
                    </div>
                `;
                lista.appendChild(card);
            });
        }
        
        document.getElementById('modalHistorico').classList.add('active');
        
    } catch (error) {
        console.error('Erro ao carregar histórico:', error);
    }
}

function fecharHistorico() {
    document.getElementById('modalHistorico').classList.remove('active');
}

// ===== REGISTRO DE CONTATO =====

function setupFormValidation() {
    const form = document.getElementById('formRegistroContato');
    const btnEnviar = document.getElementById('btnEnviarContato');
    const campos = ['sucessoContato', 'disparoWhatsapp', 'percepcao', 'humorContato'];
    
    campos.forEach(id => {
        document.getElementById(id).addEventListener('change', () => {
            validarForm(campos, btnEnviar);
        });
    });
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await enviarRegistroContato();
    });
}

function validarForm(campos, btnEnviar) {
    const todosPreenchidos = campos.every(id => {
        const valor = document.getElementById(id).value;
        return valor && valor !== '';
    });
    
    btnEnviar.disabled = !todosPreenchidos;
}

async function enviarRegistroContato() {
    if (!ssAtual) return;
    
    const dados = {
        ss_id: ssAtual.id,
        sucesso_contato: document.getElementById('sucessoContato').value,
        disparo_whatsapp: document.getElementById('disparoWhatsapp').value,
        percepcao: document.getElementById('percepcao').value,
        humor_contato: document.getElementById('humorContato').value,
        observacoes: document.getElementById('observacoes').value
    };
    
    try {
        const response = await fetch(`${API_URL}/ss/${ssAtual.id}/contato`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(dados)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Erro ao registrar contato');
        }
        
        alert('✅ Contato registrado com sucesso!');
        fecharMonitoramento();
        // Recarregar lista de SS's
        await carregarSSsUsuario();
        
        
    } catch (error) {
        alert('❌ ' + error.message);
    }
}

// ===== VOLTAR =====

document.getElementById('btnVoltar').addEventListener('click', () => {
    window.location.href = '/';
});

// Fechar modais ao clicar fora
document.getElementById('modalMonitoramento').addEventListener('click', (e) => {
    if (e.target.id === 'modalMonitoramento') {
        fecharMonitoramento();
    }
});

document.getElementById('modalHistorico').addEventListener('click', (e) => {
    if (e.target.id === 'modalHistorico') {
        fecharHistorico();
    }
});
