#!/bin/bash

# Script para instalar el pre-commit hook de validación de ramas
# Uso: ./scripts/install-git-hooks.sh

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Rutas
HOOKS_DIR=".git/hooks"
PRECOMMIT_HOOK="$HOOKS_DIR/pre-commit"
TEMPLATE_FILE="scripts/pre-commit-hook-template"

echo -e "${BLUE}Instalando Git hooks para validación de ramas...${NC}"

# Verificar que estamos en un repositorio Git
if [ ! -d ".git" ]; then
    echo -e "${RED}Error: No estás en la raíz de un repositorio Git${NC}"
    exit 1
fi

# Verificar que el template existe
if [ ! -f "$TEMPLATE_FILE" ]; then
    echo -e "${RED}Error: Template no encontrado: $TEMPLATE_FILE${NC}"
    exit 1
fi

# Crear directorio de hooks si no existe
if [ ! -d "$HOOKS_DIR" ]; then
    echo -e "${YELLOW}Creando directorio de hooks...${NC}"
    mkdir -p "$HOOKS_DIR"
fi

# Verificar si ya existe un pre-commit hook
if [ -f "$PRECOMMIT_HOOK" ]; then
    echo -e "${YELLOW}⚠️  Ya existe un pre-commit hook${NC}"
    echo -e "${BLUE}¿Deseas sobrescribirlo? (y/N):${NC}"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Instalación cancelada${NC}"
        exit 0
    fi
    
    # Hacer backup del hook existente
    backup_file="${PRECOMMIT_HOOK}.backup.$(date +%Y%m%d_%H%M%S)"
    echo -e "${YELLOW}Creando backup: $backup_file${NC}"
    cp "$PRECOMMIT_HOOK" "$backup_file"
fi

# Copiar el template
echo -e "${BLUE}Instalando pre-commit hook...${NC}"
cp "$TEMPLATE_FILE" "$PRECOMMIT_HOOK"

# Dar permisos de ejecución
chmod +x "$PRECOMMIT_HOOK"

echo -e "${GREEN}✅ Pre-commit hook instalado exitosamente${NC}"
echo ""
echo -e "${YELLOW}El hook validará la nomenclatura de ramas en cada commit.${NC}"
echo -e "${YELLOW}Para omitir la validación usa: git commit --no-verify${NC}"
echo ""
echo -e "${BLUE}Para desinstalar el hook:${NC}"
echo -e "${BLUE}  rm $PRECOMMIT_HOOK${NC}"