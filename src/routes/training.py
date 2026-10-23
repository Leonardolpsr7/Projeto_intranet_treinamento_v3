import os
from flask import Blueprint, request, jsonify, session, send_from_directory
from werkzeug.utils import secure_filename
from src.models.user import User, db
from src.models.training import Training
from functools import wraps

training_bp = Blueprint('training', __name__)

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'uploads', 'training')
ALLOWED_EXTENSIONS = {'pdf', 'mp4', 'webm', 'ogg'}

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Login necessário'}), 401
        return f(*args, **kwargs)
    return decorated_function

def master_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Login necessário'}), 401
        user = User.query.get(session['user_id'])
        if not user or not user.is_admin or user.admin_role != 'master':
            return jsonify({'error': 'Acesso negado - apenas administradores master podem realizar esta ação'}), 403
        return f(*args, **kwargs)
    return decorated_function

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@training_bp.route('/trainings', methods=['GET'])
@login_required
def list_trainings():
    trainings = Training.query.order_by(Training.created_at.desc()).all()
    return jsonify({'trainings': [t.to_dict() for t in trainings]})

@training_bp.route('/trainings', methods=['POST'])
@master_required
def add_training():
    if 'file' not in request.files:
        return jsonify({'error': 'Nenhum arquivo enviado'}), 400
    
    file = request.files['file']
    title = request.form.get('title')
    description = request.form.get('description')
    
    if not title:
        return jsonify({'error': 'Título é obrigatório'}), 400
    
    if file.filename == '':
        return jsonify({'error': 'Nenhum arquivo selecionado'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        # Adicionar timestamp para evitar conflitos de nome
        import time
        filename = f"{int(time.time())}_{filename}"
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        file.save(file_path)
        
        file_ext = filename.rsplit('.', 1)[1].lower()
        file_type = 'pdf' if file_ext == 'pdf' else 'video'
        
        new_training = Training(
            title=title,
            description=description,
            file_path=filename,
            file_type=file_type
        )
        db.session.add(new_training)
        db.session.commit()
        
        return jsonify({'message': 'Treinamento adicionado com sucesso', 'training': new_training.to_dict()}), 201
    
    return jsonify({'error': 'Tipo de arquivo não permitido'}), 400

@training_bp.route('/trainings/<int:training_id>', methods=['DELETE'])
@master_required
def delete_training(training_id):
    training = Training.query.get_or_404(training_id)
    
    # Remover arquivo físico
    file_path = os.path.join(UPLOAD_FOLDER, training.file_path)
    if os.path.exists(file_path):
        os.remove(file_path)
        
    db.session.delete(training)
    db.session.commit()
    
    return jsonify({'message': 'Treinamento removido com sucesso'})

@training_bp.route('/uploads/training/<filename>')
@login_required
def serve_training_file(filename):
    """Serve arquivo de treinamento com validação de segurança"""
    # Validar que o arquivo existe no banco de dados
    training = Training.query.filter_by(file_path=filename).first()
    if not training:
        return jsonify({'error': 'Arquivo não encontrado'}), 404
    
    # Validar que o caminho não contém traversal
    if '..' in filename or filename.startswith('/'):
        return jsonify({'error': 'Acesso negado'}), 403
    
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    if not os.path.exists(file_path):
        return jsonify({'error': 'Arquivo não encontrado'}), 404
    
    return send_from_directory(UPLOAD_FOLDER, filename)
