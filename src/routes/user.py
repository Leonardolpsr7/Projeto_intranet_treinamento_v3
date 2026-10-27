from flask import Blueprint, request, jsonify, session
from src.models.user import User, db, AdminCategory
from datetime import datetime, timedelta
from functools import wraps
from flask import current_app
from src.auth import role_level

user_bp = Blueprint('user', __name__)

def login_required(f):
    """Decorator para verificar se o usuário está logado"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Login necessário'}), 401
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    """Decorator para verificar se o usuário é admin"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Login necessário'}), 401
        
        user = User.query.get(session['user_id'])
        if not user or not user.is_admin:
            return jsonify({'error': 'Acesso negado - privilégios de administrador necessários'}), 403
        return f(*args, **kwargs)
    return decorated_function

def master_required(f):
    """Decorator para verificar se o usuário é admin master"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Login necessário'}), 401
        
        user = User.query.get(session['user_id'])
        if not user or not user.is_admin or user.admin_role != 'master':
            return jsonify({'error': 'Acesso negado - apenas administradores master podem realizar esta ação'}), 403
        return f(*args, **kwargs)
    return decorated_function

def validate_password_strength(password):
    """Valida a força da senha"""
    if len(password) < 8:
        return False, 'Senha deve ter no mínimo 8 caracteres'
    if not any(char.isupper() for char in password):
        return False, 'Senha deve conter pelo menos uma letra maiúscula'
    if not any(char.isdigit() for char in password):
        return False, 'Senha deve conter pelo menos um número'
    return True, 'Senha válida'

@user_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        if not username or not password:
            return jsonify({'error': 'Usuário e senha são obrigatórios'}), 400
        
        user = User.query.filter_by(username=username).first()
        
        if not user or not user.check_password(password):
            return jsonify({'error': 'Usuário ou senha inválidos'}), 401
        
        if not user.is_active:
            return jsonify({'error': 'Usuário inativo'}), 401
        
        # Atualizar último login
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        # Criar sessão
        session['user_id'] = user.id
        session['username'] = user.username
        session['is_admin'] = user.is_admin
        session['admin_role'] = user.admin_role
        
        return jsonify({
            'message': 'Login realizado com sucesso',
            'user': user.to_dict()
        })
        
    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@user_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    session.clear()
    return jsonify({'message': 'Logout realizado com sucesso'})

@user_bp.route('/profile', methods=['GET'])
@login_required
def get_profile():
    try:
        user = User.query.get(session['user_id'])
        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404
        
        return jsonify({'user': user.to_dict()})
        
    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@user_bp.route('/check-session', methods=['GET'])
def check_session():
    if 'user_id' in session:
        user = User.query.get(session['user_id'])
        if user and user.is_active:
            return jsonify({
                'logged_in': True,
                'user': user.to_dict()
            })
    
    return jsonify({'logged_in': False})

# Rotas administrativas
@user_bp.route('/admin/users', methods=['GET'])
@admin_required
def list_users():
    try:
        users = User.query.all()
        return jsonify({
            'users': [user.to_dict() for user in users]
        })
        
    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@user_bp.route('/admin/users', methods=['POST'])
@admin_required
def create_user():
    try:
        data = request.get_json()
        
        # Validações
        required_fields = ['username', 'email', 'password', 'full_name']
        for field in required_fields:
            if not data.get(field, '').strip():
                return jsonify({'error': f'Campo {field} é obrigatório'}), 400
        
        # Verificar se usuário já existe
        if User.query.filter_by(username=data['username']).first():
            return jsonify({'error': 'Nome de usuário já existe'}), 400
        
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email já está em uso'}), 400
        
        # Validar força da senha
        is_strong, msg = validate_password_strength(data['password'])
        if not is_strong:
            return jsonify({'error': msg}), 400
        
        # Definir admin_role baseado em is_admin e na hierarquia de categorias
        admin_role = 'user'
        if data.get('is_admin', False):
            admin_role = (data.get('admin_role') or 'supervisor').strip()
            cat = AdminCategory.query.filter_by(name=admin_role).first()
            if not cat:
                admin_role = 'supervisor'
                cat = AdminCategory.query.filter_by(name='supervisor').first()
            acting = User.query.get(session['user_id'])
            acting_level = role_level(acting.admin_role) if acting and acting.is_admin else 0
            if admin_role == 'supermaster':
                return jsonify({'error': 'Não é possível criar um administrador Super Master'}), 403
            if cat and cat.level > acting_level:
                return jsonify({'error': 'Não é possível atribuir uma categoria superior à sua'}), 403
        
        # Criar novo usuário
        user = User(
            username=data['username'].strip(),
            email=data['email'].strip(),
            full_name=data['full_name'].strip(),
            is_admin=data.get('is_admin', False),
            admin_role=admin_role,
            is_active=data.get('is_active', True)
        )
        user.set_password(data['password'])
        
        db.session.add(user)
        db.session.commit()
        
        return jsonify({
            'message': 'Usuário criado com sucesso',
            'user': user.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@user_bp.route('/admin/users/<int:user_id>', methods=['PUT'])
@admin_required
def update_user(user_id):
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404
        
        data = request.get_json()
        
        # Atualizar campos
        if 'username' in data and data['username'].strip():
            # Verificar se username já existe (exceto o próprio usuário)
            existing = User.query.filter(User.username == data['username'], User.id != user_id).first()
            if existing:
                return jsonify({'error': 'Nome de usuário já existe'}), 400
            user.username = data['username'].strip()
        
        if 'email' in data and data['email'].strip():
            # Verificar se email já existe (exceto o próprio usuário)
            existing = User.query.filter(User.email == data['email'], User.id != user_id).first()
            if existing:
                return jsonify({'error': 'Email já está em uso'}), 400
            user.email = data['email'].strip()
        
        if 'full_name' in data and data['full_name'].strip():
            user.full_name = data['full_name'].strip()
        
        if 'password' in data and data['password']:
            is_strong, msg = validate_password_strength(data['password'])
            if not is_strong:
                return jsonify({'error': msg}), 400
            user.set_password(data['password'])
        
        if 'is_admin' in data:
            user.is_admin = bool(data['is_admin'])
            if not user.is_admin:
                user.admin_role = 'user'

        if user.is_admin and 'admin_role' in data and data['admin_role']:
            new_role = data['admin_role'].strip()
            cat = AdminCategory.query.filter_by(name=new_role).first()
            if not cat:
                new_role = 'supervisor'
                cat = AdminCategory.query.filter_by(name='supervisor').first()
            acting = User.query.get(session['user_id'])
            acting_level = role_level(acting.admin_role) if acting and acting.is_admin else 0
            if new_role == 'supermaster':
                return jsonify({'error': 'Não é possível atribuir a categoria Super Master'}), 403
            if cat and cat.level > acting_level:
                return jsonify({'error': 'Não é possível atribuir uma categoria superior à sua'}), 403
            user.admin_role = new_role
        elif user.is_admin and user.admin_role not in [c.name for c in AdminCategory.query.all()]:
            user.admin_role = 'supervisor'
        
        if 'is_active' in data:
            user.is_active = bool(data['is_active'])
        
        db.session.commit()
        
        return jsonify({
            'message': 'Usuário atualizado com sucesso',
            'user': user.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@user_bp.route('/admin/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'Usuário não encontrado'}), 404
        
        # Não permitir deletar o próprio usuário
        if user.id == session['user_id']:
            return jsonify({'error': 'Não é possível deletar seu próprio usuário'}), 400
        
        db.session.delete(user)
        db.session.commit()
        
        return jsonify({'message': 'Usuário deletado com sucesso'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

