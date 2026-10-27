// ========== Categorias de Administrador e Direcionamento de Sugestões ==========

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ----- Categorias -----

async function loadCategories() {
    const list = document.getElementById('categoriesList');
    const loading = document.getElementById('categoriesLoading');
    showElement(loading);
    try {
        const res = await fetch('/api/admin/categories', { credentials: 'include' });
        const data = await res.json();
        hideElement(loading);
        if (res.ok) {
            displayCategories(data.categories);
        } else {
            list.innerHTML = `<div class="error-message">${data.error}</div>`;
        }
    } catch (e) {
        hideElement(loading);
        list.innerHTML = '<div class="error-message">Erro ao carregar categorias.</div>';
    }
}

function displayCategories(categories) {
    const list = document.getElementById('categoriesList');
    if (!categories.length) {
        list.innerHTML = '<div class="text-center">Nenhuma categoria cadastrada.</div>';
        return;
    }
    list.innerHTML = categories.map(c => `
        <div class="user-item">
            <div class="user-header">
                <div>
                    <strong>${capitalize(c.name)}</strong>
                    <span class="status-badge status-aprovado">Nível ${c.level}</span>
                    ${c.is_system ? '<span class="status-badge status-analisando">Sistema</span>' : ''}
                    ${c.users_count ? `<span class="status-badge status-pendente">${c.users_count} usuário(s)</span>` : ''}
                </div>
            </div>
            <div class="user-content">
                ${c.description ? `<p>${c.description}</p>` : ''}
            </div>
            <div class="action-buttons">
                ${!c.is_system ? `<button class="delete-btn" onclick="deleteCategory(${c.id})">Excluir</button>` : ''}
            </div>
        </div>
    `).join('');
}

function openCategoryModal() {
    const modal = document.getElementById('categoryModal');
    document.getElementById('categoryForm').reset();
    document.getElementById('categoryId').value = '';
    showElement(modal);
}

function closeCategoryModal() {
    hideElement(document.getElementById('categoryModal'));
}

async function handleCategoryForm(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = {
        name: formData.get('name'),
        level: parseInt(formData.get('level'), 10),
        description: formData.get('description')
    };
    try {
        const res = await fetch('/api/admin/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
            closeCategoryModal();
            loadCategories();
            alert(data.message);
        } else {
            alert('Erro: ' + data.error);
        }
    } catch (err) {
        alert('Erro de conexão. Tente novamente.');
    }
}

async function deleteCategory(id) {
    if (!confirm('Excluir esta categoria? Usuários vinculados voltarão a usuários comuns.')) return;
    try {
        const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE', credentials: 'include' });
        const data = await res.json();
        if (res.ok) {
            loadCategories();
            alert(data.message);
        } else {
            alert('Erro: ' + data.error);
        }
    } catch (err) {
        alert('Erro de conexão. Tente novamente.');
    }
}

// ----- Popula selects -----

async function populateAdminRoleSelect(selected) {
    const select = document.getElementById('userAdminRole');
    if (!select) return;
    try {
        const res = await fetch('/api/admin/categories', { credentials: 'include' });
        const data = await res.json();
        if (!res.ok) return;
        const myCat = data.categories.find(c => c.name === (currentUser ? currentUser.admin_role : ''));
        const myLevel = myCat ? myCat.level : 0;
        select.innerHTML = data.categories
            .filter(c => c.name !== 'supermaster' && c.level <= myLevel)
            .map(c => `<option value="${c.name}">${capitalize(c.name)} (nível ${c.level})</option>`)
            .join('');
        if (selected) select.value = selected;
        if (!select.value) select.value = 'supervisor';
    } catch (e) { /* ignore */ }
}

async function populateCategoryFilter() {
    const sel = document.getElementById('assignedCategoryFilter');
    if (!sel) return;
    try {
        const res = await fetch('/api/admin/categories', { credentials: 'include' });
        const data = await res.json();
        if (res.ok) {
            sel.innerHTML = '<option value="">Todas as categorias</option>' +
                data.categories
                    .filter(c => c.name !== 'supermaster')
                    .map(c => `<option value="${c.name}">${capitalize(c.name)}</option>`)
                    .join('');
        }
    } catch (e) { /* ignore */ }
}

// ----- Direcionar sugestão -----

async function assignSuggestion(id) {
    const modal = document.getElementById('assignSuggestionModal');
    document.getElementById('assignSuggestionId').value = id;
    const catSel = document.getElementById('assignCategory');
    const adminSel = document.getElementById('assignAdmin');
    adminSel.innerHTML = '<option value="">— Qualquer um da categoria —</option>';
    catSel.innerHTML = '';
    try {
        const res = await fetch('/api/admin/categories', { credentials: 'include' });
        const data = await res.json();
        if (res.ok) {
            catSel.innerHTML = data.categories
                .filter(c => c.name !== 'supermaster')
                .map(c => `<option value="${c.name}">${capitalize(c.name)}</option>`)
                .join('');
        }
    } catch (e) { /* ignore */ }
    catSel.onchange = () => updateAssignAdmins(catSel.value);
    showElement(modal);
}

async function updateAssignAdmins(category) {
    const adminSel = document.getElementById('assignAdmin');
    adminSel.innerHTML = '<option value="">— Qualquer um da categoria —</option>';
    if (!category) return;
    try {
        const res = await fetch('/api/admin/users', { credentials: 'include' });
        const data = await res.json();
        if (res.ok) {
            const admins = data.users.filter(u => u.is_admin && u.admin_role === category && u.is_active);
            admins.forEach(u => {
                adminSel.insertAdjacentHTML('beforeend', `<option value="${u.id}">${u.full_name} (${u.username})</option>`);
            });
        }
    } catch (e) { /* ignore */ }
}

function closeAssignModal() {
    hideElement(document.getElementById('assignSuggestionModal'));
}

async function handleAssignSuggestion(e) {
    e.preventDefault();
    const id = document.getElementById('assignSuggestionId').value;
    const category = document.getElementById('assignCategory').value;
    const adminId = document.getElementById('assignAdmin').value;
    if (!category) { alert('Selecione uma categoria.'); return; }
    try {
        const res = await fetch(`/api/admin/suggestions/${id}/assign`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ assigned_category: category, assigned_admin_id: adminId || null })
        });
        const data = await res.json();
        if (res.ok) {
            closeAssignModal();
            const cat = document.getElementById('assignedCategoryFilter');
            loadAdminSuggestions(document.getElementById('statusFilter').value, cat ? cat.value : '');
            alert(data.message);
        } else {
            alert('Erro: ' + data.error);
        }
    } catch (err) {
        alert('Erro de conexão. Tente novamente.');
    }
}

async function deleteAdminSuggestion(id) {
    if (!confirm('Tem certeza que deseja excluir esta sugestão?')) return;
    try {
        const res = await fetch(`/api/admin/suggestions/${id}`, { method: 'DELETE', credentials: 'include' });
        const data = await res.json();
        if (res.ok) {
            const cat = document.getElementById('assignedCategoryFilter');
            loadAdminSuggestions(document.getElementById('statusFilter').value, cat ? cat.value : '');
            alert(data.message);
        } else {
            alert('Erro: ' + data.error);
        }
    } catch (err) {
        alert('Erro de conexão. Tente novamente.');
    }
}
