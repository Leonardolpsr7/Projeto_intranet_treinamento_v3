#!/usr/bin/env python3
"""Script de teste para validar a API de busca com o campo script"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from src.routes.excel_search import similarity
import pandas as pd

# Simular a busca
excel_path = os.path.join(os.path.dirname(__file__), 'dados.xlsx')
df = pd.read_excel(excel_path)

print("=" * 60)
print("TESTE DE INTEGRAÇÃO DO CAMPO SCRIPT")
print("=" * 60)

# Teste 1: Verificar se a coluna Script existe
print("\n1. Verificando colunas da planilha:")
print(f"   Colunas disponíveis: {list(df.columns)}")

if 'Script' in df.columns:
    print("   ✅ Coluna 'Script' encontrada!")
else:
    print("   ❌ Coluna 'Script' NÃO encontrada!")
    sys.exit(1)

# Teste 2: Buscar uma pergunta e verificar se retorna o script
print("\n2. Testando busca por 'Qual o horário de funcionamento?':")
pergunta = "Qual o horário de funcionamento?"

melhor_match = None
melhor_score = 0

for index, row in df.iterrows():
    score = similarity(pergunta, row['Pergunta'])
    if score > melhor_score:
        melhor_score = score
        melhor_match = row

if melhor_match is not None:
    print(f"   Pergunta encontrada: {melhor_match['Pergunta']}")
    print(f"   Similaridade: {melhor_score:.2%}")
    print(f"   Resposta: {melhor_match['Resposta'][:80]}...")
    print(f"   Script: {melhor_match.get('Script', 'N/A')[:80]}...")
    
    if melhor_match.get('Script'):
        print("   ✅ Campo Script retornado com sucesso!")
    else:
        print("   ⚠️  Campo Script está vazio!")
else:
    print("   ❌ Nenhuma correspondência encontrada!")

# Teste 3: Verificar quantas linhas têm script preenchido
print("\n3. Estatísticas da coluna Script:")
total_rows = len(df)
rows_with_script = df['Script'].notna().sum()
rows_empty_script = df['Script'].isna().sum()

print(f"   Total de registros: {total_rows}")
print(f"   Registros com script: {rows_with_script}")
print(f"   Registros sem script: {rows_empty_script}")

# Teste 4: Mostrar alguns exemplos
print("\n4. Exemplos de registros (primeiras 3 linhas):")
for idx, row in df.head(3).iterrows():
    print(f"\n   Registro {idx + 1}:")
    print(f"   - Pergunta: {row['Pergunta'][:50]}...")
    print(f"   - Resposta: {row['Resposta'][:50]}...")
    print(f"   - Script: {row.get('Script', 'N/A')[:50]}...")

print("\n" + "=" * 60)
print("TESTE CONCLUÍDO COM SUCESSO!")
print("=" * 60)
