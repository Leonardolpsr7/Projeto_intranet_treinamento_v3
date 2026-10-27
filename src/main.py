import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory
from flask_cors import CORS
from src.models.user import db
from src.models.suggestion import Suggestion
from src.models.training import Training
from src.routes.user import user_bp
from src.routes.excel_search import excel_bp
from src.routes.suggestion import suggestion_bp
from src.routes.knowledge_base import knowledge_bp
from src.routes.training import training_bp
from src.routes.admin_category import admin_category_bp

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))
CORS(app, supports_credentials=True)  # Habilita CORS com suporte a credenciais
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-key-change-in-production')

# Configurações de sessão
app.config['SESSION_COOKIE_SECURE'] = False  # True em produção com HTTPS
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

app.register_blueprint(user_bp, url_prefix='/api')
app.register_blueprint(excel_bp, url_prefix='/api')
app.register_blueprint(suggestion_bp, url_prefix='/api')
app.register_blueprint(knowledge_bp, url_prefix='/api')
app.register_blueprint(training_bp, url_prefix='/api')
app.register_blueprint(admin_category_bp, url_prefix='/api')

# Configuração do banco de dados
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(os.path.dirname(__file__), 'database', 'app.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

# Criar tabelas
with app.app_context():
    db.create_all()

    from src.models.user import User, AdminCategory

    # Migração: adiciona colunas de direcionamento à tabela suggestion, se faltarem
    from sqlalchemy import inspect, text
    inspector = inspect(db.engine)
    suggestion_cols = [c['name'] for c in inspector.get_columns('suggestion')]
    if 'assigned_category' not in suggestion_cols:
        db.session.execute(text("ALTER TABLE suggestion ADD COLUMN assigned_category VARCHAR(50)"))
    if 'assigned_admin_id' not in suggestion_cols:
        db.session.execute(text("ALTER TABLE suggestion ADD COLUMN assigned_admin_id INTEGER"))
    db.session.commit()

    # Criar categorias de administrador padrão
    if AdminCategory.query.count() == 0:
        db.session.add_all([
            AdminCategory(name='supervisor', level=1, description='Supervisor - acesso administrativo básico', is_system=True),
            AdminCategory(name='master', level=2, description='Master - acesso total ao sistema', is_system=True),
            AdminCategory(name='supermaster', level=3, description='Super Master - gerencia categorias e direciona sugestões', is_system=True),
        ])
        db.session.commit()

    # Criar usuário admin padrão (Super Master) se não existir
    admin_user = User.query.filter_by(username='admin').first()
    if not admin_user:
        admin_user = User(
            username='admin',
            email='admin@intranet.com',
            full_name='Administrador do Sistema',
            is_admin=True,
            admin_role='supermaster',
            is_active=True
        )
        admin_user.set_password('admin123')
        db.session.add(admin_user)
        db.session.commit()
    elif admin_user.admin_role == 'master':
        # Promover o admin master padrão a Super Master
        admin_user.admin_role = 'supermaster'
        db.session.commit()

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    static_folder_path = app.static_folder
    if static_folder_path is None:
            return "Static folder not configured", 404

    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            return "index.html not found", 404


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
