from flask import Blueprint, request, jsonify, session
from src.models.user import User, AdminCategory, db
from src.auth import admin_required, supermaster_required, role_level

admin_category_bp = Blueprint('admin_category', __name__)


@admin_category_bp.route('/admin/categories', methods=['GET'])
@admin_required
def list_categories():
    """Lista todas as categorias de administrador (qualquer admin)."""
    try:
        cats = AdminCategory.query.order_by(AdminCategory.level.desc()).all()
        result = []
        for c in cats:
            d = c.to_dict()
            d['users_count'] = User.query.filter_by(admin_role=c.name).count()
            result.append(d)
        return jsonify({'categories': result})
    except Exception as e:
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500


@admin_category_bp.route('/admin/categories', methods=['POST'])
@supermaster_required
def create_category():
    """Cria uma nova categoria de administrador (apenas Super Master).
    O nível deve ser igual ou inferior ao das demais categorias (ou seja, < nível do Super Master).
    """
    try:
        data = request.get_json() or {}
        name = (data.get('name') or '').strip().lower()
        if not name:
            return jsonify({'error': 'Nome da categoria é obrigatório'}), 400
        if AdminCategory.query.filter_by(name=name).first():
            return jsonify({'error': 'Esta categoria já existe'}), 400

        try:
            level = int(data.get('level', 1))
        except (TypeError, ValueError):
            return jsonify({'error': 'Nível inválido'}), 400

        sm_level = role_level('supermaster')
        if level < 1:
            return jsonify({'error': 'Nível deve ser no mínimo 1'}), 400
        if level >= sm_level:
            return jsonify({'error': 'Nível deve ser inferior ao do Super Master'}), 400

        cat = AdminCategory(
            name=name,
            level=level,
            description=(data.get('description') or '').strip(),
            is_system=False
        )
        db.session.add(cat)
        db.session.commit()

        return jsonify({'message': 'Categoria criada com sucesso', 'category': cat.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500


@admin_category_bp.route('/admin/categories/<int:cat_id>', methods=['DELETE'])
@supermaster_required
def delete_category(cat_id):
    """Exclui uma categoria de administrador (apenas Super Master).
    Categorias de sistema não podem ser excluídas. Usuários vinculados voltam a usuários comuns.
    """
    try:
        cat = AdminCategory.query.get(cat_id)
        if not cat:
            return jsonify({'error': 'Categoria não encontrada'}), 404
        if cat.is_system:
            return jsonify({'error': 'Categorias do sistema não podem ser excluídas'}), 400

        users = User.query.filter_by(admin_role=cat.name).all()
        for u in users:
            u.is_admin = False
            u.admin_role = 'user'

        db.session.delete(cat)
        db.session.commit()
        return jsonify({'message': 'Categoria excluída com sucesso'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500
