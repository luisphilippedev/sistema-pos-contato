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
    // Carregar informações do usuário
    document.getElementById('userNameAnalise').textContent = usuarioLogado.nome;
    
    // Status do usuário
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('userStatusText');
    
    if (usuarioLogado.status === 'online') {
        statusDot.classList.add('online');
        statusText.textContent = 'Online';
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
}

function formatarFila(fila) {
    const filas = {
        'pos_complexo': 'Pós Complexo',
        'pos_rapidos_medios': 'Pós Rápidos e Médios',
        'pos_especiais': 'Pós Especiais'
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
        
        const ssList = await response.json();
        renderizarTabela(ssList);
        
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
                <td colspan="9" style="text-align: center; padding: 40px; color: #999;">
                    Nenhuma SS atribuída no momento
                </td>
            </tr>
        `;
        return;
    }
    
    ssList.forEach(ss => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${ss.numero_ss || '-'}</td>
            <td><strong>${ss.placa || '-'}</strong></td>
            <td>${formatarData(ss.data_saida)}</td>
            <td>${ss.cluster || '-'}</td>
            <td>${ss.regional || '-'}</td>
            <td>${ss.servico_principal || '-'}</td>
            <td>${formatarData(ss.data_envio_pesquisa)}</td>
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
    const data = new Date(dataStr);
    return data.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

function renderizarPrazo(dataEnvioPesquisa) {
    if (!dataEnvioPesquisa) {
        return '<span class="sem-prazo">Sem prazo definido</span>';
    }
    
    const dataEnvio = new Date(dataEnvioPesquisa);
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
