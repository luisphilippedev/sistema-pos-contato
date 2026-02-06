// Configuração da API
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000/api' 
  : `${window.location.origin}/api`;

let usuarioLogado = null;
let arquivoSelecionado = null;
let logAtual = null;

// ===== INICIALIZAÇÃO =====

window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const usuarioStr = localStorage.getItem('usuario');
    
    if (!token || !usuarioStr) {
        window.location.href = '/';
        return;
    }
    
    usuarioLogado = JSON.parse(usuarioStr);
    document.getElementById('userNameImport').textContent = usuarioLogado.nome;
    
    carregarLogs();
    setupDragDrop();
    setupFileInput();
});

// ===== DRAG & DROP =====

function setupDragDrop() {
    const uploadArea = document.getElementById('uploadArea');
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });
}

function setupFileInput() {
    document.getElementById('fileInput').addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });
}

function handleFile(file) {
    if (!file.name.endsWith('.xlsx')) {
        alert('⚠️ Apenas arquivos .xlsx são permitidos!');
        return;
    }
    
    arquivoSelecionado = file;
    
    // Atualizar UI
    document.getElementById('uploadArea').style.display = 'none';
    document.getElementById('fileInfo').style.display = 'block';
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = formatarTamanho(file.size);
    document.getElementById('btnImportar').disabled = false;
}

function removerArquivo() {
    arquivoSelecionado = null;
    document.getElementById('uploadArea').style.display = 'block';
    document.getElementById('fileInfo').style.display = 'none';
    document.getElementById('fileInput').value = '';
    document.getElementById('btnImportar').disabled = true;
}

function formatarTamanho(bytes) {
    if (bytes < 1024) return bytes + ' bytes';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// ===== MODAIS =====

function abrirImportacaoManual() {
    document.getElementById('modalImportManual').classList.add('active');
}

function fecharImportacaoManual() {
    document.getElementById('modalImportManual').classList.remove('active');
    removerArquivo();
}

function fecharLog() {
    document.getElementById('modalLog').classList.remove('active');
}

// ===== IMPORTAÇÃO =====

async function executarImportacao() {
    if (!arquivoSelecionado) return;
    
    const formData = new FormData();
    formData.append('file', arquivoSelecionado);
    
    // Mostrar progresso
    document.getElementById('progressContainer').style.display = 'block';
    document.getElementById('btnImportar').disabled = true;
    document.getElementById('btnCancelar').disabled = true;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/importar-xlsx`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Erro ao importar arquivo');
        }
        
        // Atualizar progresso
        document.getElementById('progressFill').style.width = '100%';
        document.getElementById('progressText').textContent = 'Importação concluída!';
        
        // Mostrar resultado
        alert(`✅ Importação concluída!\n\nTotal: ${data.total}\nSucesso: ${data.sucesso}\nErros: ${data.erros}`);
        
        // Fechar modal e recarregar logs
        setTimeout(() => {
            fecharImportacaoManual();
            carregarLogs();
        }, 1500);
        
    } catch (error) {
        alert('❌ Erro: ' + error.message);
        document.getElementById('progressContainer').style.display = 'none';
        document.getElementById('btnImportar').disabled = false;
        document.getElementById('btnCancelar').disabled = false;
    }
}

// ===== LOGS =====

async function carregarLogs() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/logs-importacao`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const logs = await response.json();
        renderizarLogs(logs);
        
    } catch (error) {
        console.error('Erro ao carregar logs:', error);
        document.getElementById('logsTableBody').innerHTML = `
            <tr><td colspan="8" style="text-align: center; padding: 40px; color: #c62828;">
                Erro ao carregar logs
            </td></tr>
        `;
    }
}

function renderizarLogs(logs) {
    const tbody = document.getElementById('logsTableBody');
    
    if (logs.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="8" style="text-align: center; padding: 40px; color: #999;">
                Nenhuma importação realizada ainda
            </td></tr>
        `;
        return;
    }
    
    tbody.innerHTML = '';
    
    logs.forEach(log => {
        const tr = document.createElement('tr');
        const tipoBadge = log.tipo === 'manual' ? 
            '<span class="tipo-badge manual">Manual</span>' : 
            '<span class="tipo-badge automatico">Automático</span>';
        
        tr.innerHTML = `
            <td><strong>#${log.id}</strong></td>
            <td>${formatarDataHora(log.criado_em)}</td>
            <td>${tipoBadge}</td>
            <td>${log.total_ss}</td>
            <td><span class="stat-number success">${log.sucesso}</span></td>
            <td><span class="stat-number error">${log.erros}</span></td>
            <td>${log.usuario_nome || '-'}</td>
            <td>
                <button class="btn-visualizar-log" onclick="visualizarLog(${log.id})">
                    👁️ Ver Detalhes
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function visualizarLog(logId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/logs-importacao/${logId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const log = await response.json();
        logAtual = log;
        
        // Preencher sumário
        document.getElementById('logId').textContent = log.id;
        document.getElementById('logTotal').textContent = log.total_ss;
        document.getElementById('logSucesso').textContent = log.sucesso;
        document.getElementById('logErro').textContent = log.erros;
        document.getElementById('logData').textContent = formatarDataHora(log.criado_em);
        
        // Carregar detalhes
        carregarDetalhesLog(logId);
        
        document.getElementById('modalLog').classList.add('active');
        
    } catch (error) {
        alert('Erro ao carregar log: ' + error.message);
    }
}

async function carregarDetalhesLog(logId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/logs-importacao/${logId}/detalhes`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const detalhes = await response.json();
        renderizarDetalhesLog(detalhes);
        
        // Setup filtros
        setupFiltrosLog(detalhes);
        
    } catch (error) {
        console.error('Erro ao carregar detalhes:', error);
    }
}

function renderizarDetalhesLog(detalhes) {
    const tbody = document.getElementById('logDetailsBody');
    
    if (detalhes.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="6" style="text-align: center; padding: 20px;">
                Nenhum detalhe disponível
            </td></tr>
        `;
        return;
    }
    
    tbody.innerHTML = '';
    
    detalhes.forEach(item => {
        const statusIcon = item.status === 'sucesso' 
            ? '<div class="status-icon success">✓</div>'
            : '<div class="status-icon error">✗</div>';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${statusIcon}</td>
            <td>${item.numero_ss || '-'}</td>
            <td>${item.placa || '-'}</td>
            <td>${item.cluster || '-'}</td>
            <td>${item.responsavel || '-'}</td>
            <td>${item.mensagem || '-'}</td>
        `;
        tbody.appendChild(tr);
    });
}

function setupFiltrosLog(detalhesOriginais) {
    let detalhesFiltrados = [...detalhesOriginais];
    
    const aplicarFiltros = () => {
        const filtroSS = document.getElementById('filtroSS').value.toLowerCase();
        const filtroStatus = document.getElementById('filtroStatus').value;
        const filtroCluster = document.getElementById('filtroCluster').value.toLowerCase();
        
        detalhesFiltrados = detalhesOriginais.filter(item => {
            const matchSS = !filtroSS || (item.numero_ss || '').toLowerCase().includes(filtroSS);
            const matchStatus = !filtroStatus || item.status === filtroStatus;
            const matchCluster = !filtroCluster || (item.cluster || '').toLowerCase().includes(filtroCluster);
            
            return matchSS && matchStatus && matchCluster;
        });
        
        renderizarDetalhesLog(detalhesFiltrados);
    };
    
    document.getElementById('filtroSS').addEventListener('input', aplicarFiltros);
    document.getElementById('filtroStatus').addEventListener('change', aplicarFiltros);
    document.getElementById('filtroCluster').addEventListener('input', aplicarFiltros);
}

// ===== UTILITÁRIOS =====

function formatarDataHora(dataStr) {
    if (!dataStr) return '-';
    const data = new Date(dataStr);
    return data.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Fechar modais ao clicar fora
document.getElementById('modalImportManual')?.addEventListener('click', (e) => {
    if (e.target.id === 'modalImportManual') {
        fecharImportacaoManual();
    }
});

document.getElementById('modalLog')?.addEventListener('click', (e) => {
    if (e.target.id === 'modalLog') {
        fecharLog();
    }
});
