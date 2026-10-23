# Intranet Corporativa - Sistema Melhorado

## 🚀 Melhorias Implementadas

Este sistema foi completamente melhorado com as seguintes funcionalidades:

### ✅ Sistema de Autenticação
- **Login/Logout seguro** com hash de senhas
- **Controle de sessões** com cookies seguros
- **Níveis de permissão** (usuário comum e administrador)
- **Usuário admin padrão** criado automaticamente

### ✅ Sistema de Sugestões com Protocolos
- **Geração automática de protocolos** únicos (formato: PROT2025XXXXXX)
- **Caixa de sugestões** integrada ao sistema de busca
- **Status de acompanhamento** (pendente, analisando, aprovado, rejeitado)
- **Resposta do administrador** para cada sugestão

### ✅ Portal de Administração
- **CRUD completo de usuários** (criar, editar, excluir)
- **Gerenciamento de sugestões** com filtros por status
- **Interface administrativa** intuitiva e responsiva
- **Controle de permissões** e status de usuários

### ✅ Interface Moderna
- **Design responsivo** para desktop e mobile
- **Navegação por abas** entre funcionalidades
- **Modais interativos** para formulários
- **Feedback visual** com loading e mensagens de erro/sucesso

## 🔧 Instalação e Configuração

### Pré-requisitos
- Python 3.11+
- Pip (gerenciador de pacotes Python)

### Instalação
1. **Instalar dependências:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Executar o sistema:**
   ```bash
   python src/main.py
   ```

3. **Acessar no navegador:**
   ```
   http://localhost:5000
   ```

## 👤 Credenciais Padrão

**Administrador:**
- **Usuário:** admin
- **Senha:** admin123

> ⚠️ **IMPORTANTE:** Altere a senha padrão após o primeiro login!

## 📋 Funcionalidades Detalhadas

### 1. Sistema de Login
- Tela de login moderna e segura
- Validação de credenciais
- Controle de sessão automático
- Redirecionamento baseado em permissões

### 2. Busca Inteligente
- **Busca por similaridade** no arquivo Excel
- **Sugestão automática** quando resposta não é satisfatória
- **Formulário de melhoria** integrado
- **Geração de protocolo** para acompanhamento

### 3. Gerenciamento de Sugestões
- **Visualização de sugestões** do usuário logado
- **Status em tempo real** das solicitações
- **Histórico completo** com datas e protocolos
- **Resposta do administrador** quando disponível

### 4. Painel Administrativo
- **Gerenciar usuários:**
  - Criar novos usuários
  - Editar informações existentes
  - Ativar/desativar contas
  - Definir permissões de administrador
  
- **Gerenciar sugestões:**
  - Visualizar todas as sugestões
  - Filtrar por status
  - Atualizar status das solicitações
  - Responder às sugestões dos usuários

## 🗂️ Estrutura do Projeto

```
intranet_excel/
├── src/
│   ├── database/
│   │   └── app.db                 # Banco SQLite
│   ├── models/
│   │   ├── user.py               # Modelo de usuário
│   │   └── suggestion.py         # Modelo de sugestões
│   ├── routes/
│   │   ├── user.py               # Rotas de autenticação e usuários
│   │   ├── excel_search.py       # Rotas de busca
│   │   └── suggestion.py         # Rotas de sugestões
│   ├── static/
│   │   ├── index.html            # Interface principal
│   │   ├── styles.css            # Estilos modernos
│   │   └── script.js             # JavaScript interativo
│   └── main.py                   # Aplicação principal
├── dados.xlsx                    # Base de conhecimento
├── requirements.txt              # Dependências Python
└── README_MELHORADO.md          # Esta documentação
```

## 🔒 Segurança

### Medidas Implementadas:
- **Hash de senhas** com Werkzeug
- **Sessões seguras** com cookies HTTPOnly
- **Validação de entrada** em todos os formulários
- **Controle de acesso** baseado em roles
- **Proteção CSRF** com tokens de sessão

### Recomendações de Produção:
1. Alterar a `SECRET_KEY` no arquivo `main.py`
2. Usar HTTPS em produção
3. Configurar backup automático do banco de dados
4. Implementar logs de auditoria
5. Configurar rate limiting para APIs

## 📊 Banco de Dados

### Tabelas Criadas:
- **user:** Usuários do sistema
- **suggestion:** Sugestões e protocolos

### Campos Principais:
- **User:** id, username, email, password_hash, full_name, is_admin, is_active, created_at, last_login
- **Suggestion:** id, protocol_number, user_id, question, answer_found, suggestion_text, status, created_at, updated_at, admin_response

## 🎯 Como Usar

### Para Usuários Comuns:
1. **Fazer login** com suas credenciais
2. **Buscar informações** na base de conhecimento
3. **Enviar sugestões** quando necessário
4. **Acompanhar protocolos** na seção "Minhas Sugestões"

### Para Administradores:
1. **Gerenciar usuários** no painel administrativo
2. **Responder sugestões** dos usuários
3. **Atualizar status** das solicitações
4. **Criar novos usuários** conforme necessário

## 🔄 Fluxo de Sugestões

1. **Usuário faz pergunta** → Sistema busca no Excel
2. **Resposta não satisfatória** → Formulário de sugestão aparece
3. **Usuário envia sugestão** → Protocolo é gerado automaticamente
4. **Administrador analisa** → Atualiza status e responde
5. **Usuário acompanha** → Visualiza resposta na seção "Minhas Sugestões"

## 🛠️ Personalização

### Modificar Base de Conhecimento:
- Edite o arquivo `dados.xlsx` com novas perguntas e respostas
- O sistema automaticamente utilizará as novas informações

### Alterar Aparência:
- Modifique o arquivo `src/static/styles.css`
- Cores, fontes e layout podem ser personalizados

### Adicionar Funcionalidades:
- Crie novas rotas em `src/routes/`
- Adicione novos modelos em `src/models/`
- Atualize o frontend em `src/static/`

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique os logs do servidor
2. Consulte a documentação técnica
3. Entre em contato com o administrador do sistema

---

**Sistema desenvolvido com Flask, SQLAlchemy e tecnologias web modernas.**

