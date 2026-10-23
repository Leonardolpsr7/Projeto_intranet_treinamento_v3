from flask import Blueprint, request, jsonify, session
from src.models.user import User, db
from src.models.suggestion import Suggestion
from datetime import datetime
from functools import wraps
import random
import string

suggestion_bp = Blueprint('suggestion', __name__)

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

def generate_protocol_number():
    """Gera um número de protocolo único"""
    year = datetime.now().year
    random_part = ''.join(random.choices(string.digits, k=6))
    protocol = f"PROT{year}{random_part}"
    
    # Verificar se já existe
    while Suggestion.query.filter_by(protocol_number=protocol).first():
        random_part = ''.join(random.choices(string.digits, k=6))
        protocol = f"PROT{year}{random_part}"
    
    return protocol

@suggestion_bp.route('/suggestions', methods=['POST'])
@login_required
def create_suggestion():
    try:
        data = request.get_json()
        
        # Validações
        required_fields = ['question', 'suggestion_text']
        for field in required_fields:
            if not data.get(field, '').strip():
                return jsonify({'error': f'Campo {field} é obrigatório'}), 400
        
        # Criar nova sugestão
        suggestion = Suggestion(
            protocol_number=generate_protocol_number(),
            user_id=session['user_id'],
            question=data['question'].strip(),
            answer_found=data.get('answer_found', '').strip() or None,
            suggestion_text=data['suggestion_text'].strip(),
            status='pendente'
        )
        
        db.session.add(suggestion)
        db.session.commit()
        
        return jsonify({
            'message': 'Sugestão enviada com sucesso',
            'protocol_number': suggestion.protocol_number,
            'suggestion': suggestion.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@suggestion_bp.route('/suggestions', methods=['GET'])
@login_required
def list_user_suggestions():
    try:
        # Usuários comuns só veem suas próprias sugestões
        suggestions = Suggestion.query.filter_by(user_id=session['user_id']).order_by(Suggestion.created_at.desc()).all()
        
        return jsonify({
            'suggestions': [suggestion.to_dict() for suggestion in suggestions]
        })
        
    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@suggestion_bp.route('/suggestions/<protocol_number>', methods=['GET'])
@login_required
def get_suggestion_by_protocol(protocol_number):
    try:
        suggestion = Suggestion.query.filter_by(protocol_number=protocol_number).first()
        
        if not suggestion:
            return jsonify({'error': 'Protocolo não encontrado'}), 404
        
        # Verificar se o usuário pode ver esta sugestão
        user = User.query.get(session['user_id'])
        if not user.is_admin and suggestion.user_id != session['user_id']:
            return jsonify({'error': 'Acesso negado'}), 403
        
        return jsonify({'suggestion': suggestion.to_dict()})
        
    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

# Rotas administrativas
@suggestion_bp.route('/admin/suggestions', methods=['GET'])
@admin_required
def list_all_suggestions():
    try:
        status_filter = request.args.get('status')
        
        query = Suggestion.query
        if status_filter:
            query = query.filter_by(status=status_filter)
        
        suggestions = query.order_by(Suggestion.created_at.desc()).all()
        
        return jsonify({
            'suggestions': [suggestion.to_dict() for suggestion in suggestions]
        })
        
    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@suggestion_bp.route('/admin/suggestions/<int:suggestion_id>', methods=['PUT'])
@admin_required
def update_suggestion_status(suggestion_id):
    try:
        suggestion = Suggestion.query.get(suggestion_id)
        if not suggestion:
            return jsonify({'error': 'Sugestão não encontrada'}), 404
        
        data = request.get_json()
        
        # Atualizar status
        if 'status' in data:
            valid_statuses = ['pendente', 'analisando', 'aprovado', 'rejeitado']
            if data['status'] not in valid_statuses:
                return jsonify({'error': 'Status inválido'}), 400
            suggestion.status = data['status']
        
        # Atualizar resposta do admin
        if 'admin_response' in data:
            suggestion.admin_response = data['admin_response'].strip() if data['admin_response'] else None
        
        suggestion.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'Sugestão atualizada com sucesso',
            'suggestion': suggestion.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@suggestion_bp.route('/admin/suggestions/<int:suggestion_id>', methods=['DELETE'])
@admin_required
def delete_suggestion(suggestion_id):
    try:
        suggestion = Suggestion.query.get(suggestion_id)
        if not suggestion:
            return jsonify({'error': 'Sugestão não encontrada'}), 404
        
        db.session.delete(suggestion)
        db.session.commit()
        
        return jsonify({'message': 'Sugestão deletada com sucesso'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

@suggestion_bp.route('/admin/suggestions/stats', methods=['GET'])
@admin_required
def get_suggestions_stats():
    try:
        total = Suggestion.query.count()
        pendentes = Suggestion.query.filter_by(status='pendente').count()
        analisando = Suggestion.query.filter_by(status='analisando').count()
        aprovadas = Suggestion.query.filter_by(status='aprovado').count()
        rejeitadas = Suggestion.query.filter_by(status='rejeitado').count()
        
        return jsonify({
            'stats': {
                'total': total,
                'pendentes': pendentes,
                'analisando': analisando,
                'aprovadas': aprovadas,
                'rejeitadas': rejeitadas
            }
        })
        
    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

