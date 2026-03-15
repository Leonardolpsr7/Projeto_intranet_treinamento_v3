# Projeto_intranet_treinamento_v3
Intranet Corporativa - Sistema de Gestão de Conhecimento e Treinamento

📝 Descrição do Projeto

Este projeto é uma Intranet Corporativa desenvolvida para otimizar a gestão de conhecimento, treinamento e comunicação interna. Ele oferece um sistema robusto de autenticação, uma base de conhecimento pesquisável (alimentada por um arquivo Excel), um módulo de sugestões com acompanhamento de protocolos e um portal administrativo completo para gerenciamento de usuários, sugestões e conteúdos de treinamento. O sistema é construído com Flask para o backend e uma interface web moderna e responsiva.


🚀 Funcionalidades Principais


🔐 Sistema de Autenticação e Autorização

• Login/Logout Seguro: Autenticação de usuários com hash de senhas (Werkzeug) e controle de sessões via cookies seguros.

• Controle de Sessões: Utiliza cookies HTTPOnly e SameSite para maior segurança.

• Níveis de Permissão: Diferenciação entre usuários comuns e administradores (is_admin, admin_role).

• Usuário Admin Padrão: Criação automática de um usuário administrador (admin/admin123) na inicialização do banco de dados.



📚 Base de Conhecimento Dinâmica

• Busca Inteligente: Permite a busca por similaridade em um arquivo Excel (dados.xlsx) que funciona como base de conhecimento.

• Gerenciamento via API: Administradores podem adicionar, editar e remover perguntas, respostas e scripts diretamente via API, com persistência no arquivo dados.xlsx de forma segura (com backup).

• Sugestão Automática: Caso a busca não retorne resultados satisfatórios, o sistema oferece a opção de enviar uma sugestão.



💡 Sistema de Sugestões com Protocolos

• Geração Automática de Protocolos: Cada sugestão enviada recebe um número de protocolo único (ex: PROT2025XXXXXX).

• Acompanhamento de Status: Usuários podem acompanhar o status de suas sugestões (pendente, analisando, aprovado, rejeitado).

• Resposta do Administrador: Administradores podem responder às sugestões, e as respostas são visíveis para os usuários.



🎓 Módulo de Treinamento

• Upload de Materiais: Administradores master podem fazer upload de arquivos de treinamento (PDFs, vídeos como MP4, WebM, OGG).

• Listagem de Treinamentos: Usuários logados podem visualizar os treinamentos disponíveis.

• Remoção de Treinamentos: Administradores master podem remover treinamentos e seus arquivos associados.

• Serviço de Arquivos Seguro: Os arquivos de treinamento são servidos de forma segura, exigindo login e validando o caminho do arquivo.



⚙️ Portal Administrativo

• CRUD de Usuários: Gerenciamento completo de usuários (criação, edição, exclusão, ativação/desativação, definição de permissões).

• Gerenciamento de Sugestões: Visualização, filtragem por status, atualização de status e resposta às sugestões dos usuários.

• Gerenciamento da Base de Conhecimento: Adição, edição e remoção de itens da base de conhecimento (perguntas/respostas/scripts).

• Gerenciamento de Treinamentos: Upload e remoção de materiais de treinamento.



🎨 Interface do Usuário (Frontend)

• Design Responsivo: Adapta-se a diferentes tamanhos de tela (desktop e mobile).

• Navegação por Abas: Organização das funcionalidades para uma experiência intuitiva.

• Modais Interativos: Utilização de modais para formulários e interações.

• Feedback Visual: Mensagens de sucesso/erro e indicadores de carregamento.



🛠️ Tecnologias Utilizadas

• Backend: Python 3.11+

• Flask: Microframework web para o desenvolvimento da API e servidor.

• Flask-SQLAlchemy: ORM para interação com o banco de dados SQLite (app.db).

• Flask-CORS: Habilita o Cross-Origin Resource Sharing.

• Werkzeug: Utilizado para hashing de senhas e funcionalidades de segurança.

• Pandas: Manipulação de dados, especialmente para leitura e escrita do arquivo dados.xlsx.

• OpenPyXL: Biblioteca para leitura/escrita de arquivos .xlsx.



• Frontend: HTML5, CSS3, JavaScript

• Vanilla JS: Para interatividade e lógica do lado do cliente.

• CSS Customizado: Para estilização moderna e responsiva.

• Banco de Dados: SQLite (app.db)


⚙️ Instalação e Configuração

Pré-requisitos

• Python 3.11 ou superior

• Pip (gerenciador de pacotes Python)

Passos para Instalação

1. Clone o repositório (ou descompacte o arquivo ZIP):

Bash


# Se for um repositório Git
git clone <URL_DO_REPOSITORIO>
cd intranet_excel
# Se for um arquivo ZIP, você já deve estar no diretório 'intranet_excel'





2. Crie e ative um ambiente virtual (recomendado):

Bash


python3 -m venv venv
source venv/bin/activate  # No Linux/macOS
# venv\Scripts\activate  # No Windows





3. Instale as dependências:

Bash


pip install -r requirements.txt





4. Configure as variáveis de ambiente:
Crie um arquivo .env na raiz do projeto (intranet_excel/) baseado no .env.example e defina a SECRET_KEY. Em produção, utilize uma chave forte e secreta.

Plain Text


SECRET_KEY='sua_chave_secreta_aqui'





5. Execute a aplicação:

Bash


python src/main.py





6. Acesse a Intranet no navegador:
Abra seu navegador e acesse http://localhost:5000.



👤 Credenciais Padrão

Após a primeira execução, um usuário administrador padrão será criado:

• Usuário: admin

• Senha: admin123


⚠️ IMPORTANTE: Altere a senha padrão do usuário admin imediatamente após o primeiro login para garantir a segurança do sistema.



📂 Estrutura do Projeto

intranet_excel/
├── .env.example                  # Exemplo de arquivo de variáveis de ambiente
├── .gitignore                    # Arquivos e diretórios a serem ignorados pelo Git
├── dados.xlsx                    # Base de conhecimento principal (perguntas e respostas )
├── requirements.txt              # Dependências Python do projeto
├── src/
│   ├── database/                 # Contém o banco de dados SQLite (app.db)
│   │   └── app.db                # Banco de dados da aplicação
│   ├── models/                   # Definições dos modelos de dados (SQLAlchemy)
│   │   ├── suggestion.py         # Modelo para sugestões
│   │   ├── training.py           # Modelo para materiais de treinamento
│   │   └── user.py               # Modelo para usuários
│   ├── routes/                   # Definições das rotas da API (Blueprints do Flask)
│   │   ├── excel_search.py       # Rotas para busca no Excel
│   │   ├── knowledge_base.py     # Rotas para gerenciamento da base de conhecimento
│   │   ├── suggestion.py         # Rotas para o sistema de sugestões
│   │   ├── training.py           # Rotas para o módulo de treinamento
│   │   └── user.py               # Rotas para autenticação e gerenciamento de usuários
│   ├── static/                   # Arquivos estáticos do frontend
│   │   ├── index.html            # Página principal da interface do usuário
│   │   ├── styles.css            # Folha de estilos CSS
│   │   ├── script.js             # Lógica JavaScript do frontend
│   │   └── ...                   # Outros ativos estáticos (imagens, etc.)
│   └── main.py                   # Ponto de entrada da aplicação Flask
├── uploads/                      # Diretório para uploads de arquivos (ex: treinamentos)
│   └── training/                 # Arquivos de treinamento
├── test_api.py                   # Testes para a API (se houver)
├── test_server.py                # Testes para o servidor (se houver)
├── todo.md                       # Lista de tarefas ou melhorias futuras
└── README.md                     # Este arquivo de documentação

🔒 Segurança

Medidas Implementadas

• Hash de Senhas: Utiliza generate_password_hash e check_password_hash do Werkzeug.security.

• Sessões Seguras: Configuração de SESSION_COOKIE_SECURE, SESSION_COOKIE_HTTPONLY e SESSION_COOKIE_SAMESITE.

• Validação de Entrada: Implementada em rotas da API para prevenir injeções e outros ataques.

• Controle de Acesso Baseado em Roles: Decoradores @login_required e @master_required para proteger rotas.

• Upload Seguro de Arquivos: Uso de secure_filename e validação de extensões permitidas para uploads de treinamento.

Recomendações para Produção

1. Altere a SECRET_KEY: Defina uma chave secreta forte e única no arquivo .env.

2. Utilize HTTPS: Configure o servidor para usar HTTPS em ambiente de produção (SESSION_COOKIE_SECURE = True).

3. Backup do Banco de Dados: Implemente uma rotina de backup automático para o app.db.

4. Logs de Auditoria: Configure logs detalhados para monitorar atividades suspeitas.

5. Rate Limiting: Considere implementar rate limiting para as APIs para prevenir ataques de força bruta.

6. Variáveis de Ambiente: Não exponha credenciais ou chaves sensíveis diretamente no código; utilize variáveis de ambiente.


📊 Banco de Dados (SQLite)

O banco de dados app.db é inicializado automaticamente na primeira execução da aplicação e contém as seguintes tabelas:

user

Armazena informações dos usuários do sistema.

Campo
Tipo
Descrição
id
INTEGER
Chave primária, auto-incremento
username
TEXT
Nome de usuário único
email
TEXT
Endereço de e-mail único
password_hash
TEXT
Hash da senha do usuário
full_name
TEXT
Nome completo do usuário
is_admin
BOOLEAN
Indica se o usuário é administrador
admin_role
TEXT
Papel do administrador (ex: 'master')
is_active
BOOLEAN
Indica se a conta está ativa
created_at
DATETIME
Data e hora de criação da conta
last_login
DATETIME
Último acesso do usuário




suggestion

Armazena as sugestões enviadas pelos usuários.

Campo
Tipo
Descrição
id
INTEGER
Chave primária, auto-incremento
protocol_number
TEXT
Número de protocolo único para a sugestão
user_id
INTEGER
ID do usuário que enviou a sugestão (FK)
question
TEXT
Pergunta original do usuário
answer_found
BOOLEAN
Indica se uma resposta foi encontrada na busca
suggestion_text
TEXT
Texto da sugestão/melhoria proposta
status
TEXT
Status da sugestão (pendente, analisando, etc.)
created_at
DATETIME
Data e hora de envio da sugestão
updated_at
DATETIME
Última atualização da sugestão
admin_response
TEXT
Resposta do administrador à sugestão




training

Armazena informações sobre os materiais de treinamento.

Campo
Tipo
Descrição
id
INTEGER
Chave primária, auto-incremento
title
TEXT
Título do material de treinamento
description
TEXT
Descrição do material
file_path
TEXT
Nome do arquivo no sistema de arquivos
file_type
TEXT
Tipo do arquivo (ex: 'pdf', 'video')
created_at
DATETIME
Data e hora de upload



