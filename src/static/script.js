// Estado da aplicação
let currentUser = null;
let currentSection = 'search';
// Cache da base de conhecimento (mantém sempre carregada)
let knowledgeCache = null;
let knowledgeLoaded = false;

// Elementos DOM
const loginScreen = document.getElementById('loginScreen');
const mainApp = document.getElementById('mainApp');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const userWelcome = document.getElementById('userWelcome');
const logoutBtn = document.getElementById('logoutBtn');

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    checkSession();
    setupEventListeners();
});

// Verificar sessão existente
async function checkSession() {
    try {
        const response = await fetch('/api/check-session', {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.logged_in) {
            currentUser = data.user;
            showMainApp();
        } else {
            showLoginScreen();
        }
    } catch (error) {
        console.error('Erro ao verificar sessão:', error);
        showLoginScreen();
    }
}

// Mostrar tela de login
function showLoginScreen() {
    loginScreen.style.display = 'flex';
    mainApp.style.display = 'none';
}

// Mostrar aplicação principal
function showMainApp() {
    loginScreen.style.display = 'none';
    mainApp.style.display = 'block';
    
    if (currentUser) {
        userWelcome.textContent = `Bem-vindo, ${currentUser.full_name}`;
        
        // Mostrar/ocultar seções administrativas
        const adminElements = document.querySelectorAll('.admin-only');
        adminElements.forEach(el => {
            el.style.display = currentUser.is_admin ? 'block' : 'none';
        });
        
        // Mostrar/ocultar seções apenas para master (master ou superior)
        const masterElements = document.querySelectorAll('.master-only');
        masterElements.forEach(el => {
            el.style.display = (currentUser.is_admin && (currentUser.admin_role === 'master' || currentUser.admin_role === 'supermaster')) ? 'block' : 'none';
        });
        // Mostrar/ocultar seções apenas para super master
        const supermasterElements = document.querySelectorAll('.supermaster-only');
        supermasterElements.forEach(el => {
            el.style.display = (currentUser.is_admin && currentUser.admin_role === 'supermaster') ? 'block' : 'none';
        });
        if (currentUser.is_admin && currentUser.admin_role === 'supermaster') {
            populateCategoryFilter();
        }
    }
    
    // Carregar seção atual
    showSection(currentSection);
}

// Configurar event listeners
function setupEventListeners() {
    // Login
    loginForm.addEventListener('submit', handleLogin);
    
    // Logout
    logoutBtn.addEventListener('click', handleLogout);
    
    // Navegação
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const section = e.target.dataset.section;
            showSection(section);
        });
    });
    
    // Busca
    document.getElementById('buscar').addEventListener('click', performSearch);
    document.getElementById('pergunta').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    
    // Limpar resultados quando o campo de pergunta for apagado
    document.getElementById('pergunta').addEventListener('input', (e) => {
        if (e.target.value.trim() === '') {
            hideElement(document.getElementById('responseSection'));
            hideElement(document.getElementById('errorMessage'));
        }
    });
    
    // Formulário de sugestão
    document.getElementById('newSuggestionForm').addEventListener('submit', handleNewSuggestion);
    
    // Administração
    setupAdminEventListeners();
    
    // Treinamento
    setupTrainingEventListeners();
    
    // Modais
    setupModalEventListeners();
}

// Login
async function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(loginForm);
    const loginData = {
        username: formData.get('username'),
        password: formData.get('password')
    };
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(loginData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = data.user;
            showMainApp();
            loginForm.reset();
            hideError(loginError);
        } else {
            showError(loginError, data.error);
        }
    } catch (error) {
        console.error('Erro no login:', error);
        showError(loginError, 'Erro de conexão. Tente novamente.');
    }
}

// Logout
async function handleLogout() {
    try {
        await fetch('/api/logout', {
            method: 'POST',
            credentials: 'include'
        });
        
        currentUser = null;
        // Limpa o cache da base de conhecimento ao sair
        knowledgeCache = null;
        knowledgeLoaded = false;
        showLoginScreen();
    } catch (error) {
        console.error('Erro no logout:', error);
    }
}

// Navegação entre seções
function showSection(sectionName) {
    // Atualizar navegação
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.section === sectionName) {
            btn.classList.add('active');
        }
    });
    
    // Mostrar seção
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(sectionName + 'Section');
    if (targetSection) {
        targetSection.classList.add('active');
        currentSection = sectionName;
        
        // Carregar dados da seção
        if (sectionName === 'suggestions') {
            loadUserSuggestions();
        } else if (sectionName === 'training') {
            loadTrainings();
        } else if (sectionName === 'admin') {
            loadAdminData();
        }
    }
}

// Busca
async function performSearch() {
    const pergunta = document.getElementById('pergunta').value.trim();
    
    if (!pergunta) {
        showError(document.getElementById('errorMessage'), 'Por favor, digite uma pergunta.');
        return;
    }
    
    showLoading();
    hideError(document.getElementById('errorMessage'));
    hideElement(document.getElementById('responseSection'));
    
    try {
        const response = await fetch('/api/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ pergunta })
        });
        
        const data = await response.json();
        
        hideLoading();
        
        if (response.ok) {
            showSearchResult(data, pergunta);
        } else {
            showError(document.getElementById('errorMessage'), data.error);
        }
    } catch (error) {
        hideLoading();
        console.error('Erro na busca:', error);
        showError(document.getElementById('errorMessage'), 'Erro de conexão. Tente novamente.');
    }
}

// Mostrar resultado da busca
function showSearchResult(data, pergunta) {
    const responseSection = document.getElementById('responseSection');
    const resposta = document.getElementById('resposta');
    const metadata = document.getElementById('metadata');
    const suggestionForm = document.getElementById('suggestionForm');
    const scriptBox = document.getElementById('scriptBox');
    const scriptContent = document.getElementById('scriptContent');
    
    resposta.textContent = data.resposta;

    // Exibir Script, se existir
    if (data.script) {
        scriptContent.textContent = data.script;
        showElement(scriptBox);
    } else {
        hideElement(scriptBox);
    }
    
    if (data.pergunta_encontrada) {
        metadata.innerHTML = `
            <strong>Pergunta encontrada:</strong> ${data.pergunta_encontrada}<br>
            <strong>Similaridade:</strong> ${Math.round(data.score * 100)}%
        `;
    } else {
        metadata.textContent = `Similaridade: ${Math.round(data.score * 100)}%`;
    }
    // Mostrar formulário de sugestão se necessário
    if (data.show_suggestion_form) {
        document.getElementById('suggestionQuestion').value = pergunta;
        document.getElementById('suggestionAnswer').value = data.resposta;
        showElement(suggestionForm);
    } else {
        hideElement(suggestionForm);
    }
    
    showElement(responseSection);
}

// Nova sugestão
async function handleNewSuggestion(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const suggestionData = {
        question: formData.get('question'),
        answer_found: formData.get('answer_found'),
        suggestion_text: formData.get('suggestion_text')
    };
    
    try {
        const response = await fetch('/api/suggestions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(suggestionData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert(`Sugestão enviada com sucesso! Protocolo: ${data.protocol_number}`);
            e.target.reset();
            hideElement(document.getElementById('suggestionForm'));
        } else {
            alert('Erro ao enviar sugestão: ' + data.error);
        }
    } catch (error) {
        console.error('Erro ao enviar sugestão:', error);
        alert('Erro de conexão. Tente novamente.');
    }
}

// Carregar sugestões do usuário
async function loadUserSuggestions() {
    const suggestionsList = document.getElementById('suggestionsList');
    const loading = document.getElementById('suggestionsLoading');
    
    showElement(loading);
    
    try {
        const response = await fetch('/api/suggestions', {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        hideElement(loading);
        
        if (response.ok) {
            displayUserSuggestions(data.suggestions);
        } else {
            suggestionsList.innerHTML = `<div class="error-message">${data.error}</div>`;
        }
    } catch (error) {
        hideElement(loading);
        console.error('Erro ao carregar sugestões:', error);
        suggestionsList.innerHTML = '<div class="error-message">Erro ao carregar sugestões.</div>';
    }
}

// Exibir sugestões do usuário
function displayUserSuggestions(suggestions) {
    const suggestionsList = document.getElementById('suggestionsList');
    
    if (suggestions.length === 0) {
        suggestionsList.innerHTML = '<div class="text-center">Nenhuma sugestão encontrada.</div>';
        return;
    }
    
    suggestionsList.innerHTML = suggestions.map(suggestion => `
        <div class="suggestion-item">
            <div class="suggestion-header">
                <span class="protocol-number">Protocolo: ${suggestion.protocol_number}</span>
                <span class="status-badge status-${suggestion.status}">${suggestion.status}</span>
            </div>
            <div class="suggestion-content">
                <p><strong>Pergunta:</strong> ${suggestion.question}</p>
                <p><strong>Sugestão:</strong> ${suggestion.suggestion_text}</p>
                ${suggestion.admin_response ? `<p><strong>Resposta do Admin:</strong> ${suggestion.admin_response}</p>` : ''}
                <p><small>Criado em: ${new Date(suggestion.created_at).toLocaleString('pt-BR')}</small></p>
            </div>
        </div>
    `).join('');
}

// Configurar event listeners da administração
function setupAdminEventListeners() {
    // Abas da administração
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.target.dataset.tab;
            showAdminTab(tab);
        });
    });
    
    // Adicionar usuário
    document.getElementById('addUserBtn').addEventListener('click', () => {
        openUserModal();
    });
    
    // Filtro de sugestões
    document.getElementById('statusFilter').addEventListener('change', (e) => {
        const cat = document.getElementById('assignedCategoryFilter');
        loadAdminSuggestions(e.target.value, cat ? cat.value : '');
    });
    
    // Adicionar conhecimento
    document.getElementById('addKnowledgeBtn').addEventListener('click', () => {
        openKnowledgeModal();
    });

    // Adicionar várias perguntas (lote)
    const bulkKnowledgeBtn = document.getElementById('bulkKnowledgeBtn');
    if (bulkKnowledgeBtn) {
        bulkKnowledgeBtn.addEventListener('click', () => {
            openBulkKnowledgeModal();
        });
    }

    // Adicionar categoria de administrador (Super Master)
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', () => openCategoryModal());
    }

    // Filtro de categoria nas sugestões (Super Master)
    const assignedCategoryFilter = document.getElementById('assignedCategoryFilter');
    if (assignedCategoryFilter) {
        assignedCategoryFilter.addEventListener('change', () => {
            loadAdminSuggestions(document.getElementById('statusFilter').value, assignedCategoryFilter.value);
        });
    }
}

// Mostrar aba da administração
function showAdminTab(tabName) {
    // Atualizar abas
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });
    
    // Mostrar conteúdo
    document.querySelectorAll('.admin-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const targetContent = document.getElementById(tabName + 'Tab');
    if (targetContent) {
        targetContent.classList.add('active');
        
        // Carregar dados
if (tabName === 'users') {
            loadUsers();
        } else if (tabName === 'suggestions') {
            loadAdminSuggestions();
        } else if (tabName === 'knowledge') {
            loadKnowledge();
        } else if (tabName === 'training') {
            loadAdminTrainings();
        } else if (tabName === 'categories') {
            loadCategories();
        } else if (tabName === 'mysuggestions') {
            loadMyAdminSuggestions();
        }
    }
}

// Carregar sugestões do próprio usuário (dentro do painel de administração)
async function loadMyAdminSuggestions() {
    const list = document.getElementById('myAdminSuggestionsList');
    const loading = document.getElementById('myAdminSuggestionsLoading');
    if (!list) return;

    showElement(loading);

    try {
        const response = await fetch('/api/suggestions', {
            credentials: 'include'
        });

        const data = await response.json();

        hideElement(loading);

        if (response.ok) {
            displayMyAdminSuggestions(data.suggestions);
        } else {
            list.innerHTML = `<div class="error-message">${data.error}</div>`;
        }
    } catch (error) {
        hideElement(loading);
        console.error('Erro ao carregar minhas sugestões:', error);
        list.innerHTML = '<div class="error-message">Erro ao carregar sugestões.</div>';
    }
}

// Exibir sugestões do próprio usuário no painel de administração
function displayMyAdminSuggestions(suggestions) {
    const list = document.getElementById('myAdminSuggestionsList');

    if (suggestions.length === 0) {
        list.innerHTML = '<div class="text-center">Nenhuma sugestão encontrada.</div>';
        return;
    }

    list.innerHTML = suggestions.map(suggestion => `
        <div class="suggestion-item">
            <div class="suggestion-header">
                <span class="protocol-number">Protocolo: ${suggestion.protocol_number}</span>
                <span class="status-badge status-${suggestion.status}">${suggestion.status}</span>
            </div>
            <div class="suggestion-content">
                <p><strong>Pergunta:</strong> ${suggestion.question}</p>
                <p><strong>Sugestão:</strong> ${suggestion.suggestion_text}</p>
                ${suggestion.admin_response ? `<p><strong>Resposta do Admin:</strong> ${suggestion.admin_response}</p>` : ''}
                <p><small>Criado em: ${new Date(suggestion.created_at).toLocaleString('pt-BR')}</small></p>
            </div>
        </div>
    `).join('');
}

// Carregar dados da administração
function loadAdminData() {
    if (currentUser && currentUser.is_admin) {
        showAdminTab('users');
    }
}

// Carregar usuários
async function loadUsers() {
    const usersList = document.getElementById('usersList');
    const loading = document.getElementById('usersLoading');
    
    showElement(loading);
    
    try {
        const response = await fetch('/api/admin/users', {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        hideElement(loading);
        
        if (response.ok) {
            displayUsers(data.users);
        } else {
            usersList.innerHTML = `<div class="error-message">${data.error}</div>`;
        }
    } catch (error) {
        hideElement(loading);
        console.error('Erro ao carregar usuários:', error);
        usersList.innerHTML = '<div class="error-message">Erro ao carregar usuários.</div>';
    }
}

// Exibir usuários
function displayUsers(users) {
    const usersList = document.getElementById('usersList');
    
    usersList.innerHTML = users.map(user => `
        <div class="user-item">
            <div class="user-header">
                <div>
                    <strong>${user.full_name}</strong> (${user.username})
                    ${user.is_admin ? `<span class="status-badge status-aprovado">Admin ${capitalize(user.admin_role)}</span>` : ''}
                    ${!user.is_active ? '<span class="status-badge status-rejeitado">Inativo</span>' : ''}
                </div>
            </div>
            <div class="user-content">
                <p><strong>Email:</strong> ${user.email}</p>
                <p><small>Criado em: ${new Date(user.created_at).toLocaleString('pt-BR')}</small></p>
                ${user.last_login ? `<p><small>Último login: ${new Date(user.last_login).toLocaleString('pt-BR')}</small></p>` : ''}
            </div>
            <div class="action-buttons">
                <button class="edit-btn" onclick="editUser(${user.id})">Editar</button>
                <button class="delete-btn" onclick="deleteUser(${user.id})" ${user.id === currentUser.id ? 'disabled' : ''}>Excluir</button>
            </div>
        </div>
    `).join('');
}

// Carregar sugestões (admin)
async function loadAdminSuggestions(status = '', category = '') {
    const suggestionsList = document.getElementById('adminSuggestionsList');
    const loading = document.getElementById('adminSuggestionsLoading');
    
    showElement(loading);
    
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (category) params.set('assigned_category', category);
    const url = '/api/admin/suggestions' + (params.toString() ? '?' + params.toString() : '');
    
    try {
        const response = await fetch(url, {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        hideElement(loading);
        
        if (response.ok) {
            displayAdminSuggestions(data.suggestions);
        } else {
            suggestionsList.innerHTML = `<div class="error-message">${data.error}</div>`;
        }
    } catch (error) {
        hideElement(loading);
        console.error('Erro ao carregar sugestões:', error);
        suggestionsList.innerHTML = '<div class="error-message">Erro ao carregar sugestões.</div>';
    }
}

// Exibir sugestões (admin)
function displayAdminSuggestions(suggestions) {
    const suggestionsList = document.getElementById('adminSuggestionsList');
    
    if (suggestions.length === 0) {
        suggestionsList.innerHTML = '<div class="text-center">Nenhuma sugestão encontrada.</div>';
        return;
    }
    
    const isSuper = currentUser && currentUser.is_admin && currentUser.admin_role === 'supermaster';
    suggestionsList.innerHTML = suggestions.map(suggestion => `
        <div class="admin-suggestion-item">
            <div class="suggestion-header">
                <span class="protocol-number">Protocolo: ${suggestion.protocol_number}</span>
                <span class="status-badge status-${suggestion.status}">${suggestion.status}</span>
                ${suggestion.assigned_category ? `<span class="status-badge status-analisando">Direcionada: ${capitalize(suggestion.assigned_category)}${suggestion.assigned_admin ? ' · ' + suggestion.assigned_admin : ''}</span>` : ''}
            </div>
            <div class="suggestion-content">
                <p><strong>Usuário:</strong> ${suggestion.username}</p>
                <p><strong>Pergunta:</strong> ${suggestion.question}</p>
                <p><strong>Sugestão:</strong> ${suggestion.suggestion_text}</p>
                ${suggestion.answer_found ? `<p><strong>Resposta encontrada:</strong> ${suggestion.answer_found}</p>` : ''}
                ${suggestion.admin_response ? `<p><strong>Resposta do Admin:</strong> ${suggestion.admin_response}</p>` : ''}
                <p><small>Criado em: ${new Date(suggestion.created_at).toLocaleString('pt-BR')}</small></p>
            </div>
            <div class="action-buttons">
                <button class="manage-btn" onclick="manageSuggestion(${suggestion.id})">Gerenciar</button>
                ${isSuper ? `<button class="edit-btn" onclick="assignSuggestion(${suggestion.id})">Direcionar</button>` : ''}
                ${isSuper ? `<button class="delete-btn" onclick="deleteAdminSuggestion(${suggestion.id})">Excluir</button>` : ''}
            </div>
        </div>
    `).join('');
}

// Configurar event listeners dos modais
function setupModalEventListeners() {
    // Modal de usuário
    document.getElementById('closeUserModal').addEventListener('click', closeUserModal);
    document.getElementById('cancelUserBtn').addEventListener('click', closeUserModal);
    document.getElementById('userForm').addEventListener('submit', handleUserForm);
    
    // Modal de sugestão
    document.getElementById('closeSuggestionModal').addEventListener('click', closeSuggestionModal);
    document.getElementById('cancelSuggestionBtn').addEventListener('click', closeSuggestionModal);
    document.getElementById('suggestionManageForm').addEventListener('submit', handleSuggestionForm);
    
    // Fechar modal clicando fora
    document.getElementById('userModal').addEventListener('click', (e) => {
        if (e.target.id === 'userModal') closeUserModal();
    });
    
    document.getElementById('suggestionModal').addEventListener('click', (e) => {
        if (e.target.id === 'suggestionModal') closeSuggestionModal();
    });
    
    // Modal de conhecimento
    document.getElementById('closeKnowledgeModal').addEventListener('click', closeKnowledgeModal);
    document.getElementById('cancelKnowledgeBtn').addEventListener('click', closeKnowledgeModal);
    document.getElementById('knowledgeForm').addEventListener('submit', handleKnowledgeForm);
    
    document.getElementById('knowledgeModal').addEventListener('click', (e) => {
        if (e.target.id === 'knowledgeModal') closeKnowledgeModal();
    });

    // Modal de base de conhecimento em lote
    document.getElementById('closeBulkKnowledgeModal').addEventListener('click', closeBulkKnowledgeModal);
    document.getElementById('cancelBulkKnowledgeBtn').addEventListener('click', closeBulkKnowledgeModal);
    document.getElementById('bulkKnowledgeForm').addEventListener('submit', handleBulkKnowledge);
    document.getElementById('bulkKnowledgeModal').addEventListener('click', (e) => {
        if (e.target.id === 'bulkKnowledgeModal') closeBulkKnowledgeModal();
    });

    // Modal de categoria de administrador
    document.getElementById('closeCategoryModal').addEventListener('click', closeCategoryModal);
    document.getElementById('cancelCategoryBtn').addEventListener('click', closeCategoryModal);
    document.getElementById('categoryForm').addEventListener('submit', handleCategoryForm);
    document.getElementById('categoryModal').addEventListener('click', (e) => {
        if (e.target.id === 'categoryModal') closeCategoryModal();
    });

    // Modal de direcionar sugestão
    document.getElementById('closeAssignModal').addEventListener('click', closeAssignModal);
    document.getElementById('cancelAssignBtn').addEventListener('click', closeAssignModal);
    document.getElementById('assignSuggestionForm').addEventListener('submit', handleAssignSuggestion);
    document.getElementById('assignSuggestionModal').addEventListener('click', (e) => {
        if (e.target.id === 'assignSuggestionModal') closeAssignModal();
    });
    
    // Controle de exibição do campo admin_role
    document.getElementById('userIsAdmin').addEventListener('change', (e) => {
        const adminRoleGroup = document.getElementById('adminRoleGroup');
        adminRoleGroup.style.display = e.target.checked ? 'block' : 'none';
    });
}

// Funções de usuário
async function openUserModal(user = null) {
    const modal = document.getElementById('userModal');
    const form = document.getElementById('userForm');
    const title = document.getElementById('userModalTitle');
    const passwordHelp = document.getElementById('passwordHelp');
    
    const adminRoleGroup = document.getElementById('adminRoleGroup');
    
    await populateAdminRoleSelect(user ? user.admin_role : 'supervisor');
    
    if (user) {
        title.textContent = 'Editar Usuário';
        document.getElementById('userId').value = user.id;
        document.getElementById('userUsername').value = user.username;
        document.getElementById('userEmail').value = user.email;
        document.getElementById('userFullName').value = user.full_name;
        document.getElementById('userPassword').value = '';
        document.getElementById('userIsAdmin').checked = user.is_admin;
        document.getElementById('userAdminRole').value = user.admin_role || 'supervisor';
        document.getElementById('userIsActive').checked = user.is_active;
        adminRoleGroup.style.display = user.is_admin ? 'block' : 'none';
        passwordHelp.style.display = 'block';
    } else {
        title.textContent = 'Adicionar Usuário';
        form.reset();
        document.getElementById('userId').value = '';
        document.getElementById('userIsActive').checked = true;
        document.getElementById('userAdminRole').value = 'supervisor';
        adminRoleGroup.style.display = 'none';
        passwordHelp.style.display = 'none';
    }
    
    showElement(modal);
}

function closeUserModal() {
    hideElement(document.getElementById('userModal'));
}

async function handleUserForm(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const userId = formData.get('id');
    const userData = {
        username: formData.get('username'),
        email: formData.get('email'),
        full_name: formData.get('full_name'),
        password: formData.get('password'),
        is_admin: formData.has('is_admin'),
        admin_role: formData.get('admin_role'),
        is_active: formData.has('is_active')
    };
    
    // Remover senha vazia ao editar
    if (userId && !userData.password) {
        delete userData.password;
    }
    
    const url = userId ? `/api/admin/users/${userId}` : '/api/admin/users';
    const method = userId ? 'PUT' : 'POST';
    
    try {
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeUserModal();
            loadUsers();
            alert(data.message);
        } else {
            alert('Erro: ' + data.error);
        }
    } catch (error) {
        console.error('Erro ao salvar usuário:', error);
        alert('Erro de conexão. Tente novamente.');
    }
}

async function editUser(userId) {
    try {
        const response = await fetch(`/api/admin/users`, {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            const user = data.users.find(u => u.id === userId);
            if (user) {
                openUserModal(user);
            }
        }
    } catch (error) {
        console.error('Erro ao carregar usuário:', error);
    }
}

async function deleteUser(userId) {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            loadUsers();
            alert(data.message);
        } else {
            alert('Erro: ' + data.error);
        }
    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        alert('Erro de conexão. Tente novamente.');
    }
}

// Funções de sugestão
async function manageSuggestion(suggestionId) {
    try {
        const response = await fetch('/api/admin/suggestions', {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            const suggestion = data.suggestions.find(s => s.id === suggestionId);
            if (suggestion) {
                openSuggestionModal(suggestion);
            }
        }
    } catch (error) {
        console.error('Erro ao carregar sugestão:', error);
    }
}

function openSuggestionModal(suggestion) {
    const modal = document.getElementById('suggestionModal');
    const details = document.getElementById('suggestionDetails');
    
    details.innerHTML = `
        <div class="mb-20">
            <p><strong>Protocolo:</strong> ${suggestion.protocol_number}</p>
            <p><strong>Usuário:</strong> ${suggestion.username}</p>
            <p><strong>Pergunta:</strong> ${suggestion.question}</p>
            <p><strong>Sugestão:</strong> ${suggestion.suggestion_text}</p>
            ${suggestion.answer_found ? `<p><strong>Resposta encontrada:</strong> ${suggestion.answer_found}</p>` : ''}
            <p><strong>Criado em:</strong> ${new Date(suggestion.created_at).toLocaleString('pt-BR')}</p>
        </div>
    `;
    
    document.getElementById('manageSuggestionId').value = suggestion.id;
    document.getElementById('suggestionStatus').value = suggestion.status;
    document.getElementById('adminResponse').value = suggestion.admin_response || '';
    
    showElement(modal);
}

function closeSuggestionModal() {
    hideElement(document.getElementById('suggestionModal'));
}

async function handleSuggestionForm(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const suggestionId = formData.get('id');
    const updateData = {
        status: formData.get('status'),
        admin_response: formData.get('admin_response')
    };
    
    try {
        const response = await fetch(`/api/admin/suggestions/${suggestionId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(updateData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeSuggestionModal();
            loadAdminSuggestions();
            alert(data.message);
        } else {
            alert('Erro: ' + data.error);
        }
    } catch (error) {
        console.error('Erro ao atualizar sugestão:', error);
        alert('Erro de conexão. Tente novamente.');
    }
}

// Funções de Treinamento
function setupTrainingEventListeners() {
    const addTrainingBtn = document.getElementById('addTrainingBtn');
    if (addTrainingBtn) {
        addTrainingBtn.addEventListener('click', () => {
            document.getElementById('trainingForm').reset();
            showElement(document.getElementById('trainingModal'));
        });
    }
    
    const closeTrainingModal = document.getElementById('closeTrainingModal');
    if (closeTrainingModal) {
        closeTrainingModal.addEventListener('click', () => {
            hideElement(document.getElementById('trainingModal'));
        });
    }
    
    const cancelTrainingBtn = document.getElementById('cancelTrainingBtn');
    if (cancelTrainingBtn) {
        cancelTrainingBtn.addEventListener('click', () => {
            hideElement(document.getElementById('trainingModal'));
        });
    }
    
    const trainingForm = document.getElementById('trainingForm');
    if (trainingForm) {
        trainingForm.addEventListener('submit', handleTrainingForm);
    }
}

async function loadTrainings() {
    const trainingList = document.getElementById('trainingList');
    const loading = document.getElementById('trainingLoading');
    
    showElement(loading);
    
    try {
        const response = await fetch('/api/trainings', {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        hideElement(loading);
        
        if (response.ok) {
            displayTrainings(data.trainings);
        } else {
            trainingList.innerHTML = `<div class="error-message">${data.error}</div>`;
        }
    } catch (error) {
        hideElement(loading);
        console.error('Erro ao carregar treinamentos:', error);
        trainingList.innerHTML = '<div class="error-message">Erro ao carregar treinamentos.</div>';
    }
}

function displayTrainings(trainings) {
    const trainingList = document.getElementById('trainingList');
    
    if (trainings.length === 0) {
        trainingList.innerHTML = '<div class="text-center">Nenhum treinamento disponível no momento.</div>';
        return;
    }
    
    trainingList.innerHTML = trainings.map(t => `
        <div class="training-card">
            <h3>${t.title}</h3>
            <p>${t.description || 'Sem descrição.'}</p>
            <div class="training-meta">
                <span>Tipo: ${t.file_type.toUpperCase()}</span> | 
                <span>Data: ${t.created_at}</span>
            </div>
            <div class="training-actions">
                <a href="/api/uploads/training/${t.file_path}" target="_blank" class="view-btn">
                    ${t.file_type === 'video' ? '▶️ Assistir Vídeo' : '📄 Abrir PDF'}
                </a>
            </div>
        </div>
    `).join('');
}

async function loadAdminTrainings() {
    const adminTrainingList = document.getElementById('adminTrainingList');
    const loading = document.getElementById('adminTrainingLoading');
    
    showElement(loading);
    
    try {
        const response = await fetch('/api/trainings', {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        hideElement(loading);
        
        if (response.ok) {
            displayAdminTrainings(data.trainings);
        } else {
            adminTrainingList.innerHTML = `<div class="error-message">${data.error}</div>`;
        }
    } catch (error) {
        hideElement(loading);
        console.error('Erro ao carregar treinamentos (admin):', error);
        adminTrainingList.innerHTML = '<div class="error-message">Erro ao carregar treinamentos.</div>';
    }
}

function displayAdminTrainings(trainings) {
    const adminTrainingList = document.getElementById('adminTrainingList');
    
    if (trainings.length === 0) {
        adminTrainingList.innerHTML = '<div class="text-center">Nenhum treinamento cadastrado.</div>';
        return;
    }
    
    adminTrainingList.innerHTML = trainings.map(t => `
        <div class="admin-training-item">
            <div>
                <strong>${t.title}</strong> (${t.file_type})
                <br><small>${t.created_at}</small>
            </div>
            <div class="action-buttons">
                <button class="delete-btn" onclick="deleteTraining(${t.id})">Excluir</button>
            </div>
        </div>
    `).join('');
}

async function handleTrainingForm(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    
    try {
        const response = await fetch('/api/trainings', {
            method: 'POST',
            credentials: 'include',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            hideElement(document.getElementById('trainingModal'));
            loadAdminTrainings();
            alert(data.message);
        } else {
            alert('Erro: ' + data.error);
        }
    } catch (error) {
        console.error('Erro ao salvar treinamento:', error);
        alert('Erro de conexão. Tente novamente.');
    }
}

async function deleteTraining(id) {
    if (!confirm('Tem certeza que deseja excluir este treinamento?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/trainings/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            loadAdminTrainings();
            alert(data.message);
        } else {
            alert('Erro: ' + data.error);
        }
    } catch (error) {
        console.error('Erro ao excluir treinamento:', error);
        alert('Erro de conexão. Tente novamente.');
    }
}

// Funções utilitárias
function showElement(element) {
    if (element) element.style.display = 'block';
}

function hideElement(element) {
    if (element) element.style.display = 'none';
}

function showLoading() {
    showElement(document.getElementById('loading'));
}

function hideLoading() {
    hideElement(document.getElementById('loading'));
}

function showError(errorElement, message) {
    errorElement.textContent = message;
    showElement(errorElement);
}

function hideError(errorElement) {
    hideElement(errorElement);
}


// ========== Funções de Base de Conhecimento ==========

// Carregar base de conhecimento
async function loadKnowledge(force = false) {
    const knowledgeList = document.getElementById('knowledgeList');
    const loading = document.getElementById('knowledgeLoading');

    // Mantém a base sempre carregada: usa o cache e só busca novamente se forçado
    if (knowledgeLoaded && !force && knowledgeCache) {
        displayKnowledge(knowledgeCache);
        return;
    }

    showElement(loading);

    try {
        const response = await fetch('/api/knowledge-base', {
            credentials: 'include'
        });

        const data = await response.json();

        hideElement(loading);

        if (response.ok) {
            knowledgeCache = data.knowledge;
            knowledgeLoaded = true;
            displayKnowledge(knowledgeCache);
        } else {
            knowledgeList.innerHTML = `<div class="error-message">${data.error}</div>`;
        }
    } catch (error) {
        hideElement(loading);
        console.error('Erro ao carregar base de conhecimento:', error);
        knowledgeList.innerHTML = '<div class="error-message">Erro ao carregar base de conhecimento.</div>';
    }
}

// Exibir base de conhecimento
function displayKnowledge(knowledge) {
    const knowledgeList = document.getElementById('knowledgeList');
    
    if (knowledge.length === 0) {
        knowledgeList.innerHTML = '<div class="text-center">Nenhuma pergunta cadastrada.</div>';
        return;
    }
    
    knowledgeList.innerHTML = knowledge.map(item => `
        <div class="user-item">
            <div class="user-header">
                <div>
                    <strong>${item.pergunta}</strong>
                </div>
            </div>
            <div class="user-content">
                <p><strong>Resposta:</strong> ${item.resposta}</p>
                ${item.script ? `<p><strong>Script:</strong> ${item.script.substring(0, 100)}${item.script.length > 100 ? '...' : ''}</p>` : ''}
            </div>
            <div class="action-buttons">
                <button class="edit-btn" onclick="editKnowledge(${item.id})">Editar</button>
                <button class="delete-btn" onclick="deleteKnowledge(${item.id})">Excluir</button>
            </div>
        </div>
    `).join('');
}

// Abrir modal de conhecimento
function openKnowledgeModal(knowledge = null) {
    const modal = document.getElementById('knowledgeModal');
    const form = document.getElementById('knowledgeForm');
    const title = document.getElementById('knowledgeModalTitle');
    
    if (knowledge) {
        title.textContent = 'Editar Pergunta';
        document.getElementById('knowledgeId').value = knowledge.id;
        document.getElementById('knowledgePergunta').value = knowledge.pergunta;
        document.getElementById('knowledgeResposta').value = knowledge.resposta;
        document.getElementById('knowledgeScript').value = knowledge.script || '';
    } else {
        title.textContent = 'Adicionar Pergunta';
        form.reset();
        document.getElementById('knowledgeId').value = '';
    }
    
    showElement(modal);
}

// Fechar modal de conhecimento
function closeKnowledgeModal() {
    hideElement(document.getElementById('knowledgeModal'));
}

// Editar conhecimento
async function editKnowledge(knowledgeId) {
    try {
        const response = await fetch('/api/knowledge-base', {
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            const knowledge = data.knowledge.find(k => k.id === knowledgeId);
            if (knowledge) {
                openKnowledgeModal(knowledge);
            }
        }
    } catch (error) {
        console.error('Erro ao carregar conhecimento:', error);
        alert('Erro ao carregar conhecimento.');
    }
}

// Deletar conhecimento
async function deleteKnowledge(knowledgeId) {
    if (!confirm('Tem certeza que deseja excluir esta pergunta?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/knowledge-base/${knowledgeId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            loadKnowledge(true);
            alert(data.message);
        } else {
            alert('Erro: ' + data.error);
        }
    } catch (error) {
        console.error('Erro ao deletar conhecimento:', error);
        alert('Erro de conexão. Tente novamente.');
    }
}

// Manipular formulário de conhecimento
async function handleKnowledgeForm(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const knowledgeId = formData.get('id');
    const knowledgeData = {
        pergunta: formData.get('pergunta'),
        resposta: formData.get('resposta'),
        script: formData.get('script')
    };
    
    const url = knowledgeId ? `/api/knowledge-base/${knowledgeId}` : '/api/knowledge-base';
    const method = knowledgeId ? 'PUT' : 'POST';
    
    try {
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(knowledgeData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            closeKnowledgeModal();
            loadKnowledge(true);
            alert(data.message);
        } else {
            alert('Erro: ' + data.error);
        }
    } catch (error) {
        console.error('Erro ao salvar conhecimento:', error);
        alert('Erro de conexão. Tente novamente.');
    }
}

// ========== Base de Conhecimento em Lote ==========

function openBulkKnowledgeModal() {
    const modal = document.getElementById('bulkKnowledgeModal');
    document.getElementById('bulkKnowledgeForm').reset();
    showElement(modal);
}

function closeBulkKnowledgeModal() {
    hideElement(document.getElementById('bulkKnowledgeModal'));
}

async function handleBulkKnowledge(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = formData.get('data');
    if (!data || !data.trim()) {
        alert('Cole ao menos uma linha de dados.');
        return;
    }
    try {
        const response = await fetch('/api/knowledge-base/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ data })
        });
        const result = await response.json();
        if (response.ok) {
            closeBulkKnowledgeModal();
            loadKnowledge(true); // atualiza o cache da base
            alert(
                `${result.message}\n` +
                `Ignoradas (duplicadas): ${result.skipped_duplicates}\n` +
                `Inválidas: ${result.skipped_invalid}`
            );
        } else {
            alert('Erro: ' + result.error);
        }
    } catch (error) {
        console.error('Erro ao importar em lote:', error);
        alert('Erro de conexão. Tente novamente.');
    }
}
