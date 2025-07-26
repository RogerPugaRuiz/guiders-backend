#!/bin/bash

# Script para crear ramas con nomenclatura estándar
# Uso: ./scripts/create-branch.sh <tipo> <nombre>

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para mostrar ayuda
show_help() {
    echo -e "${BLUE}Uso: ./scripts/create-branch.sh <tipo> <nombre>${NC}"
    echo ""
    echo -e "${YELLOW}Tipos disponibles:${NC}"
    echo "  add      - Nuevas funcionalidades"
    echo "  fix      - Corrección de bugs"
    echo "  refactor - Mejoras y refactorización"
    echo "  delete   - Eliminación de código"
    echo "  docs     - Cambios en documentación"
    echo "  hotfix   - Cambios directos a producción"
    echo ""
    echo -e "${YELLOW}Ejemplos:${NC}"
    echo "  ./scripts/create-branch.sh add userAuthentication"
    echo "  ./scripts/create-branch.sh fix loginValidation"
    echo "  ./scripts/create-branch.sh docs apiDocumentation"
    echo ""
    echo -e "${YELLOW}Reglas:${NC}"
    echo "  - Nombre en lowerCamelCase"
    echo "  - Máximo 30 caracteres total (tipo/nombre)"
    echo "  - Solo letras y números"
}

# Función para validar tipo
validate_type() {
    local type=$1
    case $type in
        add|fix|refactor|delete|docs|hotfix)
            return 0
            ;;
        *)
            echo -e "${RED}Error: Tipo '$type' no válido${NC}"
            echo -e "${YELLOW}Tipos válidos: add, fix, refactor, delete, docs, hotfix${NC}"
            return 1
            ;;
    esac
}

# Función para validar nombre
validate_name() {
    local name=$1
    
    # Verificar que no esté vacío
    if [ -z "$name" ]; then
        echo -e "${RED}Error: El nombre no puede estar vacío${NC}"
        return 1
    fi
    
    # Verificar formato lowerCamelCase (primera letra minúscula, resto camelCase)
    if ! [[ $name =~ ^[a-z][a-zA-Z0-9]*$ ]]; then
        echo -e "${RED}Error: El nombre debe estar en lowerCamelCase (solo letras y números, comenzando con minúscula)${NC}"
        echo -e "${YELLOW}Ejemplos válidos: userAuth, apiEndpoint, chatHistory${NC}"
        return 1
    fi
    
    return 0
}

# Función para validar longitud total
validate_length() {
    local branch_name=$1
    local length=${#branch_name}
    
    if [ $length -gt 30 ]; then
        echo -e "${RED}Error: El nombre de la rama '$branch_name' excede los 30 caracteres ($length)${NC}"
        echo -e "${YELLOW}Intenta un nombre más corto${NC}"
        return 1
    fi
    
    return 0
}

# Función para crear la rama
create_branch() {
    local branch_name=$1
    local base_branch="develop"
    
    # Para hotfixes, usar master como base
    if [[ $branch_name == hotfix/* ]]; then
        base_branch="master"
    fi
    
    echo -e "${BLUE}Creando rama '$branch_name' desde '$base_branch'...${NC}"
    
    # Verificar que estamos en un repositorio git
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        echo -e "${RED}Error: No estás en un repositorio Git${NC}"
        return 1
    fi
    
    # Verificar que la rama base existe
    if ! git show-ref --verify --quiet refs/heads/$base_branch; then
        if ! git show-ref --verify --quiet refs/remotes/origin/$base_branch; then
            echo -e "${RED}Error: La rama base '$base_branch' no existe${NC}"
            return 1
        fi
    fi
    
    # Actualizar la rama base
    echo -e "${YELLOW}Actualizando rama base '$base_branch'...${NC}"
    git checkout $base_branch
    git pull origin $base_branch
    
    # Verificar que la rama no exista ya
    if git show-ref --verify --quiet refs/heads/$branch_name; then
        echo -e "${RED}Error: La rama '$branch_name' ya existe${NC}"
        return 1
    fi
    
    # Crear y cambiar a la nueva rama
    git checkout -b $branch_name
    
    echo -e "${GREEN}✓ Rama '$branch_name' creada exitosamente${NC}"
    echo -e "${YELLOW}Para subir la rama al repositorio remoto:${NC}"
    echo -e "${BLUE}  git push -u origin $branch_name${NC}"
}

# Función principal
main() {
    # Verificar argumentos
    if [ $# -eq 0 ] || [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
        show_help
        exit 0
    fi
    
    if [ $# -ne 2 ]; then
        echo -e "${RED}Error: Se requieren exactamente 2 argumentos${NC}"
        show_help
        exit 1
    fi
    
    local type=$1
    local name=$2
    local branch_name="${type}/${name}"
    
    echo -e "${BLUE}Validando nombre de rama '${branch_name}'...${NC}"
    
    # Validaciones
    validate_type "$type" || exit 1
    validate_name "$name" || exit 1
    validate_length "$branch_name" || exit 1
    
    echo -e "${GREEN}✓ Nombre de rama válido${NC}"
    
    # Crear la rama
    create_branch "$branch_name"
}

# Ejecutar función principal
main "$@"