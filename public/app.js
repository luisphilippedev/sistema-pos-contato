// Configuração da API - detecta automaticamente se é local ou produção
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000/api' 
  : `${window.location.origin}/api`;
let token = localStorage.getItem('token');
let usuarioLogado = null;

// ===== UTILITÁRIOS =====

function headers() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

function mostrarErro(mensagem) {
    alert(mensagem);
}

function mostrarSucesso(mensagem) {
    alert(mensagem);
}

function abrirModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function fecharModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function formatarFila(fila) {
    const filas = {
        'pos_complexo': 'Pós Complexo',
        'pos_rapidos_medios': 'Pós Rápidos e Médios',
        'pos_especiais': 'Pós Especiais'
    };
    return filas[fila] || fila;
}

// ===== AUTENTICAÇÃO =====

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;
    
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Erro ao fazer login');
        }
        
        token = data.token;
        usuarioLogado = data.usuario;
        localStorage.setItem('token', token);
        localStorage.setItem('usuario', JSON.stringify(usuarioLogado));
        
        inicializarSistema();
    } catch (error) {
        document.getElementById('loginError').textContent = error.message;
    }
});

document.getElementById('btnLogout').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    location.reload();
});

// ===== INICIALIZAÇÃO =====

function inicializarSistema() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainScreen').style.display = 'block';
    
    // Atualizar informações do usuário
    document.getElementById('userName').textContent = usuarioLogado.nome;
    document.getElementById('userRole').textContent = usuarioLogado.cargo;
    
    // Atualizar iniciais no avatar
    const iniciais = usuarioLogado.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    document.getElementById('userInitials').textContent = iniciais;
    
    // Mostrar botões de liderança
    if (usuarioLogado.perfil === 'lideranca') {
        document.getElementById('btnRedistribuir').style.display = 'flex';
        document.getElementById('btnUsuarios').style.display = 'flex';
        document.getElementById('btnPopularDados').style.display = 'flex';
    }
    
    // Carregar dados
    carregarMetaDiaria();
    carregarFilaAtribuida();
    carregarSSProcessadas();
}

// ===== META DIÁRIA =====

async function carregarMetaDiaria() {
    try {
        const response = await fetch(`${API_URL}/minha-meta`, {
            headers: headers()
        });
        
        const data = await response.json();
        
        const realizados = data.contatos_realizados || 0;
        const meta = data.meta || 50;
        const percentual = (realizados / meta) * 100;
        
        // Atualizar texto
        document.getElementById('progressText').textContent = `${realizados}/${meta}`;
        
        // Atualizar círculo de progresso
        const circulo = document.getElementById('progressCircle');
        const circunferencia = 2 * Math.PI * 54; // raio = 54
        const offset = circunferencia - (percentual / 100) * circunferencia;
        circulo.style.strokeDashoffset = offset;
        
    } catch (error) {
        console.error('Erro ao carregar meta:', error);
    }
}

// ===== FILA ATRIBUÍDA =====

async function carregarFilaAtribuida() {
    try {
        const response = await fetch(`${API_URL}/minha-fila`, {
            headers: headers()
        });
        
        const data = await response.json();
        
        document.getElementById('filaNome').textContent = formatarFila(data.fila);
        document.getElementById('filaCount').textContent = data.total_ss || 0;
        
    } catch (error) {
        console.error('Erro ao carregar fila:', error);
    }
}

// ===== SS'S PROCESSADAS =====

async function carregarSSProcessadas() {
    try {
        const response = await fetch(`${API_URL}/ss-processadas`, {
            headers: headers()
        });
        
        const data = await response.json();
        
        const tbody = document.getElementById('tableBody');
        tbody.innerHTML = '';
        
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11" style="text-align: center; padding: 40px; color: #999;">Nenhuma SS processada ainda</td></tr>';
            return;
        }
        
        data.forEach(ss => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${ss.id}</td>
                <td>${ss.numero_ss || '-'}</td>
                <td>${ss.placa || '-'}</td>
                <td>${ss.humor_cliente || '-'}</td>
                <td>${ss.cluster || '-'}</td>
                <td>${ss.teve_compra_peca || '-'}</td>
                <td>${ss.regional || '-'}</td>
                <td>${ss.servico_principal || '-'}</td>
                <td>${ss.regiao || '-'}</td>
                <td>${ss.responsavel_nome || '-'}</td>
                <td>${ss.detalhes || '-'}</td>
            `;
            tbody.appendChild(tr);
        });
        
    } catch (error) {
        console.error('Erro ao carregar SS processadas:', error);
    }
}

// ===== BUSCA DE SS =====

document.getElementById('btnBuscar').addEventListener('click', async () => {
    const numero_ss = document.getElementById('searchSS').value;
    const placa = document.getElementById('searchPlaca').value;
    
    if (!numero_ss && !placa) {
        carregarSSProcessadas();
        return;
    }
    
    try {
        const params = new URLSearchParams();
        if (numero_ss) params.append('numero_ss', numero_ss);
        if (placa) params.append('placa', placa);
        
        const response = await fetch(`${API_URL}/ss/buscar?${params}`, {
            headers: headers()
        });
        
        const data = await response.json();
        
        const tbody = document.getElementById('tableBody');
        tbody.innerHTML = '';
        
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11" style="text-align: center; padding: 40px; color: #999;">Nenhuma SS encontrada</td></tr>';
            return;
        }
        
        data.forEach(ss => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${ss.id}</td>
                <td>${ss.numero_ss || '-'}</td>
                <td>${ss.placa || '-'}</td>
                <td>${ss.humor_cliente || '-'}</td>
                <td>${ss.cluster || '-'}</td>
                <td>${ss.teve_compra_peca || '-'}</td>
                <td>${ss.regional || '-'}</td>
                <td>${ss.servico_principal || '-'}</td>
                <td>${ss.regiao || '-'}</td>
                <td>${ss.responsavel_nome || '-'}</td>
                <td>${ss.detalhes || '-'}</td>
            `;
            tbody.appendChild(tr);
        });
        
    } catch (error) {
        mostrarErro('Erro ao buscar SS');
    }
});

// ===== REDISTRIBUIR SS'S =====

document.getElementById('btnRedistribuir')?.addEventListener('click', async () => {
    abrirModal('modalRedistribuir');
    await carregarSSParaRedistribuir();
    await carregarUsuariosDestino();
});

async function carregarSSParaRedistribuir() {
    try {
        const response = await fetch(`${API_URL}/ss/para-redistribuir`, {
            headers: headers()
        });
        
        const data = await response.json();
        
        const tbody = document.getElementById('redistribuirTableBody');
        tbody.innerHTML = '';
        
        data.forEach(ss => {
            const statusBadge = ss.responsavel_status === 'ausente' ? 
                '<span style="color: #d32f2f; font-weight: 600;">Ausente</span>' : 
                '<span style="color: #2d5f3f; font-weight: 600;">Online</span>';
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input type="checkbox" class="ss-checkbox" data-ss-id="${ss.id}"></td>
                <td>${ss.numero_ss || '-'}</td>
                <td>${ss.placa || '-'}</td>
                <td>${ss.responsavel_nome || 'Não atribuída'}</td>
                <td>${statusBadge}</td>
                <td>${formatarFila(ss.fila)}</td>
                <td>
                    <button class="btn-primary btn-sm" onclick="redistribuirUnica(${ss.id})">
                        Redistribuir
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
    } catch (error) {
        console.error('Erro ao carregar SS para redistribuir:', error);
    }
}

async function carregarUsuariosDestino() {
    try {
        const response = await fetch(`${API_URL}/usuarios`, {
            headers: headers()
        });
        
        const data = await response.json();
        
        const select = document.getElementById('usuarioDestino');
        select.innerHTML = '<option value="">Selecione o usuário de destino</option>';
        
        // Filtrar apenas usuários online
        const usuariosOnline = data.filter(u => u.status === 'online');
        
        usuariosOnline.forEach(usuario => {
            const option = document.createElement('option');
            option.value = usuario.id;
            option.textContent = `${usuario.nome} - ${formatarFila(usuario.fila)}`;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
    }
}

// Selecionar todas as SS's
document.getElementById('selectAll').addEventListener('change', (e) => {
    const checkboxes = document.querySelectorAll('.ss-checkbox');
    checkboxes.forEach(cb => cb.checked = e.target.checked);
});

// Redistribuir em lote
document.getElementById('btnRedistribuirLote').addEventListener('click', async () => {
    const usuarioDestino = document.getElementById('usuarioDestino').value;
    
    if (!usuarioDestino) {
        mostrarErro('Selecione um usuário de destino');
        return;
    }
    
    const checkboxes = document.querySelectorAll('.ss-checkbox:checked');
    const ss_ids = Array.from(checkboxes).map(cb => parseInt(cb.dataset.ssId));
    
    if (ss_ids.length === 0) {
        mostrarErro('Selecione pelo menos uma SS');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/ss/redistribuir`, {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify({ ss_ids, usuario_destino_id: parseInt(usuarioDestino) })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error);
        }
        
        mostrarSucesso(`${ss_ids.length} SS(s) redistribuída(s) com sucesso!`);
        fecharModal('modalRedistribuir');
        
    } catch (error) {
        mostrarErro(error.message);
    }
});

// Redistribuir SS única
async function redistribuirUnica(ssId) {
    const usuarioDestino = prompt('Digite o ID do usuário de destino:');
    
    if (!usuarioDestino) return;
    
    try {
        const response = await fetch(`${API_URL}/ss/redistribuir`, {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify({ 
                ss_ids: [ssId], 
                usuario_destino_id: parseInt(usuarioDestino) 
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error);
        }
        
        mostrarSucesso('SS redistribuída com sucesso!');
        carregarSSParaRedistribuir();
        
    } catch (error) {
        mostrarErro(error.message);
    }
}

// ===== GERENCIAR USUÁRIOS =====

document.getElementById('btnUsuarios')?.addEventListener('click', async () => {
    abrirModal('modalUsuarios');
    await carregarUsuarios();
});

async function carregarUsuarios() {
    try {
        const response = await fetch(`${API_URL}/usuarios`, {
            headers: headers()
        });
        
        const data = await response.json();
        
        const tbody = document.getElementById('usuariosTableBody');
        tbody.innerHTML = '';
        
        data.forEach(usuario => {
            const statusBadge = usuario.status === 'online' ? 
                '<span style="color: #2d5f3f; font-weight: 600;">Online</span>' : 
                '<span style="color: #d32f2f; font-weight: 600;">Ausente</span>';
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${usuario.nome}</td>
                <td>${usuario.email}</td>
                <td>${usuario.cargo}</td>
                <td>${usuario.perfil === 'lideranca' ? 'Liderança' : 'Analista'}</td>
                <td>${statusBadge}</td>
                <td>${formatarFila(usuario.fila)}</td>
                <td>
                    <button class="btn-primary btn-sm" onclick="editarUsuario(${usuario.id})">
                        Editar
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
    }
}

// Novo usuário
document.getElementById('btnNovoUsuario').addEventListener('click', () => {
    document.getElementById('usuarioFormTitle').textContent = 'Novo Usuário';
    document.getElementById('usuarioForm').reset();
    document.getElementById('usuarioId').value = '';
    document.getElementById('senhaGroup').style.display = 'block';
    document.getElementById('usuarioSenha').required = true;
    abrirModal('modalUsuarioForm');
});

// Editar usuário
async function editarUsuario(id) {
    try {
        const response = await fetch(`${API_URL}/usuarios`, {
            headers: headers()
        });
        
        const usuarios = await response.json();
        const usuario = usuarios.find(u => u.id === id);
        
        if (!usuario) {
            mostrarErro('Usuário não encontrado');
            return;
        }
        
        document.getElementById('usuarioFormTitle').textContent = 'Editar Usuário';
        document.getElementById('usuarioId').value = usuario.id;
        document.getElementById('usuarioNome').value = usuario.nome;
        document.getElementById('usuarioEmail').value = usuario.email;
        document.getElementById('usuarioCargo').value = usuario.cargo;
        document.getElementById('usuarioPerfil').value = usuario.perfil;
        document.getElementById('usuarioStatus').value = usuario.status;
        document.getElementById('usuarioFila').value = usuario.fila;
        
        document.getElementById('senhaGroup').style.display = 'none';
        document.getElementById('usuarioSenha').required = false;
        
        abrirModal('modalUsuarioForm');
        
    } catch (error) {
        mostrarErro('Erro ao carregar dados do usuário');
    }
}

// Salvar usuário
document.getElementById('usuarioForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('usuarioId').value;
    const nome = document.getElementById('usuarioNome').value;
    const email = document.getElementById('usuarioEmail').value;
    const senha = document.getElementById('usuarioSenha').value;
    const cargo = document.getElementById('usuarioCargo').value;
    const perfil = document.getElementById('usuarioPerfil').value;
    const status = document.getElementById('usuarioStatus').value;
    const fila = document.getElementById('usuarioFila').value;
    
    try {
        let response;
        
        if (id) {
            // Editar
            response = await fetch(`${API_URL}/usuarios/${id}`, {
                method: 'PUT',
                headers: headers(),
                body: JSON.stringify({ nome, cargo, perfil, status, fila, meta_diaria: 50 })
            });
        } else {
            // Criar
            response = await fetch(`${API_URL}/usuarios`, {
                method: 'POST',
                headers: headers(),
                body: JSON.stringify({ nome, email, senha, cargo, perfil, fila })
            });
        }
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error);
        }
        
        mostrarSucesso('Usuário salvo com sucesso!');
        fecharModal('modalUsuarioForm');
        await carregarUsuarios();
        
    } catch (error) {
        mostrarErro(error.message);
    }
});

// ===== INICIAR ANÁLISE =====

document.getElementById('btnIniciarAnalise').addEventListener('click', () => {
    window.location.href = '/analise.html';
});

// ===== POPULAR DADOS DE TESTE =====

document.getElementById('btnPopularDados')?.addEventListener('click', async () => {
    if (!confirm('Isso vai criar 50 SS\'s de teste no banco de dados. Deseja continuar?')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/popular-dados-teste`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Erro ao popular dados');
        }
        
        mostrarSucesso(`✅ ${data.inseridos} SS's criadas com sucesso!\n\nAcesse "Iniciar Análise" para visualizar.`);
        
        // Recarregar dados
        carregarFilaAtribuida();
        
    } catch (error) {
        mostrarErro('Erro ao popular dados: ' + error.message);
    }
});

// ===== VERIFICAR LOGIN AO CARREGAR =====

window.addEventListener('DOMContentLoaded', () => {
    token = localStorage.getItem('token');
    const usuarioStr = localStorage.getItem('usuario');
    
    if (token && usuarioStr) {
        usuarioLogado = JSON.parse(usuarioStr);
        inicializarSistema();
    }
});

// Atualizar dados a cada 30 segundos
setInterval(() => {
    if (usuarioLogado) {
        carregarMetaDiaria();
        carregarFilaAtribuida();
        carregarSSProcessadas();
    }
}, 30000);
