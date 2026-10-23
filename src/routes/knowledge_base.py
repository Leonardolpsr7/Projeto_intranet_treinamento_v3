from flask import Blueprint, request, jsonify, session
import pandas as pd
import os
from functools import wraps
from src.models.user import User
import shutil
import time

knowledge_bp = Blueprint('knowledge', __name__)

def login_required(f):
    """Decorator para verificar se o usuário está logado"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Login necessário'}), 401
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

def get_excel_path():
    """Retorna o caminho do arquivo Excel"""
    return os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'dados.xlsx')

def save_excel_safely(df, excel_path):
    """Salva o DataFrame no Excel de forma segura, com backup e tratamento de erros."""
    backup_path = f"{excel_path}.bak"
    # Usar .xlsx para que o pandas identifique o motor correto automaticamente
    temp_path = f"{excel_path}.temp.xlsx"

    try:
        # 1. Criar backup do arquivo original, se existir
        if os.path.exists(excel_path):
            shutil.copy2(excel_path, backup_path)

        # 2. Salvar para um arquivo temporário (especificando motor para maior segurança)
        df.to_excel(temp_path, index=False, engine='openpyxl')

        # 3. Tentar substituir o arquivo original pelo temporário
        # No Windows, shutil.move pode falhar se o arquivo de destino estiver aberto
        # Por isso, usamos try/except específico aqui
        try:
            if os.path.exists(excel_path):
                os.remove(excel_path)
            shutil.move(temp_path, excel_path)
        except PermissionError:
            raise PermissionError(f"O arquivo '{os.path.basename(excel_path)}' está aberto em outro programa. Feche-o e tente novamente.")

        # 4. Remover backup antigo após sucesso
        if os.path.exists(backup_path):
            os.remove(backup_path)

    except Exception as e:
        # Limpeza do arquivo temporário se ele ainda existir
        if os.path.exists(temp_path):
            try: os.remove(temp_path)
            except: pass
        raise e

@knowledge_bp.route('/knowledge-base', methods=['GET'])
@login_required
def list_knowledge():
    """Lista todas as perguntas, respostas e scripts"""
    try:
        excel_path = get_excel_path()
        df = pd.read_excel(excel_path)
        
        # Converter para lista de dicionários
        knowledge_list = []
        for index, row in df.iterrows():
            knowledge_list.append({
                'id': int(index),
                'pergunta': str(row['Pergunta']) if 'Pergunta' in row else '',
                'resposta': str(row['Resposta']) if 'Resposta' in row else '',
                'script': str(row['Script']) if 'Script' in row else ''
            })
        
        return jsonify({
            'knowledge': knowledge_list,
            'total': len(knowledge_list)
        })
        
    except Exception as e:
        return jsonify({'error': f'Erro ao carregar base de conhecimento: {str(e)}'}), 500

@knowledge_bp.route('/knowledge-base', methods=['POST'])
@master_required
def add_knowledge():
    """Adiciona uma nova pergunta, resposta e script (apenas master)"""
    try:
        data = request.get_json()
        
        # Validações
        if not data.get('pergunta', '').strip():
            return jsonify({'error': 'Pergunta é obrigatória'}), 400
        
        if not data.get('resposta', '').strip():
            return jsonify({'error': 'Resposta é obrigatória'}), 400
        
        excel_path = get_excel_path()
        df = pd.read_excel(excel_path)
        
        # Verificar se a pergunta já existe
        pergunta_normalizada = data['pergunta'].strip().lower()
        for index, row in df.iterrows():
            if pd.isna(row['Pergunta']):
                continue
            if str(row['Pergunta']).strip().lower() == pergunta_normalizada:
                return jsonify({'error': 'Esta pergunta já existe na base de conhecimento'}), 400
        
        # Adicionar nova linha
        new_row = pd.DataFrame({
            'Pergunta': [data['pergunta'].strip()],
            'Resposta': [data['resposta'].strip()],
            'Script': [data.get('script', '').strip()]
        })
        
        df = pd.concat([df, new_row], ignore_index=True)
        
        # Salvar no Excel de forma segura
        save_excel_safely(df, excel_path)
        
        return jsonify({
            'message': 'Pergunta adicionada com sucesso',
            'id': len(df) - 1
        }), 201
        
    except Exception as e:
        return jsonify({'error': f'Erro ao adicionar pergunta: {str(e)}'}), 500

@knowledge_bp.route('/knowledge-base/<int:knowledge_id>', methods=['PUT'])
@master_required
def update_knowledge(knowledge_id):
    """Atualiza uma pergunta, resposta e script existente (apenas master)"""
    try:
        data = request.get_json()
        
        excel_path = get_excel_path()
        df = pd.read_excel(excel_path)
        
        # Verificar se o ID existe
        if knowledge_id < 0 or knowledge_id >= len(df):
            return jsonify({'error': 'Pergunta não encontrada'}), 404
        
        # Atualizar campos
        if 'pergunta' in data and data['pergunta'].strip():
            df.at[knowledge_id, 'Pergunta'] = data['pergunta'].strip()
        
        if 'resposta' in data and data['resposta'].strip():
            df.at[knowledge_id, 'Resposta'] = data['resposta'].strip()
        
        if 'script' in data:
            df.at[knowledge_id, 'Script'] = data['script'].strip()
        
        # Salvar no Excel de forma segura
        save_excel_safely(df, excel_path)
        
        return jsonify({
            'message': 'Pergunta atualizada com sucesso'
        })
        
    except Exception as e:
        return jsonify({'error': f'Erro ao atualizar pergunta: {str(e)}'}), 500

@knowledge_bp.route('/knowledge-base/<int:knowledge_id>', methods=['DELETE'])
@master_required
def delete_knowledge(knowledge_id):
    """Remove uma pergunta, resposta e script (apenas master)"""
    try:
        excel_path = get_excel_path()
        df = pd.read_excel(excel_path)
        
        # Verificar se o ID existe
        if knowledge_id < 0 or knowledge_id >= len(df):
            return jsonify({'error': 'Pergunta não encontrada'}), 404
        
        # Remover linha
        df = df.drop(knowledge_id).reset_index(drop=True)
        
        # Salvar no Excel de forma segura
        save_excel_safely(df, excel_path)
        
        return jsonify({
            'message': 'Pergunta removida com sucesso'
        })
        
    except Exception as e:
        return jsonify({'error': f'Erro ao remover pergunta: {str(e)}'}), 500
