from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from .user import db

class Suggestion(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    protocol_number = db.Column(db.String(50), unique=True, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    question = db.Column(db.Text, nullable=False)
    answer_found = db.Column(db.Text, nullable=True)
    suggestion_text = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default='pendente')  # pendente, analisando, aprovado, rejeitado
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    admin_response = db.Column(db.Text, nullable=True)
    
    # Relacionamento com User
    user = db.relationship('User', backref=db.backref('suggestions', lazy=True))

    def __repr__(self):
        return f'<Suggestion {self.protocol_number}>'

    def generate_protocol_number(self):
        """Gera um número de protocolo único"""
        import random
        import string
        year = datetime.now().year
        random_part = ''.join(random.choices(string.digits, k=6))
        return f"PROT{year}{random_part}"

    def to_dict(self):
        return {
            'id': self.id,
            'protocol_number': self.protocol_number,
            'user_id': self.user_id,
            'username': self.user.username if self.user else None,
            'question': self.question,
            'answer_found': self.answer_found,
            'suggestion_text': self.suggestion_text,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'admin_response': self.admin_response
        }

