from functools import wraps
from flask import jsonify, session
from src.models.user import User, AdminCategory


def current_user():
    """Retorna o usuário da sessão atual ou None."""
    if 'user_id' not in session:
        return None
    return User.query.get(session['user_id'])


def role_level(role_name):
    """Retorna o nível numérico de uma categoria de administrador (0 se não existir)."""
    if not role_name:
        return 0
    cat = AdminCategory.query.filter_by(name=role_name).first()
    return cat.level if cat else 0


def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Login necessário'}), 401
        return f(*args, **kwargs)
    return decorated


def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        u = current_user()
        if not u or not u.is_admin:
            return jsonify({'error': 'Acesso negado - privilégios de administrador necessários'}), 403
        return f(*args, **kwargs)
    return decorated


def master_required(f):
    """Master ou superior (nível >= nível de master)."""
    @wraps(f)
    def decorated(*args, **kwargs):
        u = current_user()
        if not u or not u.is_admin or role_level(u.admin_role) < role_level('master'):
            return jsonify({'error': 'Acesso negado - apenas administradores master podem realizar esta ação'}), 403
        return f(*args, **kwargs)
    return decorated


def supermaster_required(f):
    """Apenas o Super Master."""
    @wraps(f)
    def decorated(*args, **kwargs):
        u = current_user()
        if not u or not u.is_admin or u.admin_role != 'supermaster':
            return jsonify({'error': 'Acesso negado - apenas o administrador Super Master pode realizar esta ação'}), 403
        return f(*args, **kwargs)
    return decorated
