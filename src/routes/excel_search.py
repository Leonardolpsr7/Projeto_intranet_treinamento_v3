from flask import Blueprint, request, jsonify, session
import pandas as pd
import os
from difflib import SequenceMatcher
from src.models.user import User, db
from src.models.suggestion import Suggestion
from functools import wraps

excel_bp = Blueprint('excel', __name__)

def login_required(f):
    """Decorator para verificar se o usuário está logado"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Login necessário'}), 401
        return f(*args, **kwargs)
    return decorated_function

def similarity(a, b):
    """Calcula a similaridade entre duas strings"""
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

@excel_bp.route('/search', methods=['POST'])
@login_required
def search_excel():
    try:
        data = request.get_json()
        pergunta = data.get('pergunta', '').strip()
        
        if not pergunta:
            return jsonify({'error': 'Pergunta não pode estar vazia'}), 400
        
        # Caminho para a planilha Excel
        excel_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'dados.xlsx')
        
        # Lê a planilha Excel
        df = pd.read_excel(excel_path)
        
        # Busca por similaridade
        melhor_match = None
        melhor_score = 0
        
        for index, row in df.iterrows():
            score = similarity(pergunta, row['Pergunta'])
            if score > melhor_score:
                melhor_score = score
                melhor_match = row
        
        # Se a similaridade for muito baixa, retorna mensagem padrão
        if melhor_score < 0.3:
            return jsonify({
                'resposta': 'Desculpe, não encontrei uma resposta para sua pergunta. Por favor, procure o seu supervisor para mais orientações.',
                'score': melhor_score,
                'show_suggestion_form': True
            })
        
        return jsonify({
            'resposta': melhor_match['Resposta'],
            'script': melhor_match.get('Script', ''),  # Adiciona o campo script
            'pergunta_encontrada': melhor_match['Pergunta'],
            'score': melhor_score,
            'show_suggestion_form': melhor_score < 0.7  # Mostrar formulário se a resposta não for muito precisa
        })
        
    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500

