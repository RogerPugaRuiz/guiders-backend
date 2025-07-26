#!/bin/bash

# Script para validar nombres de ramas según estándares
# Uso: ./scripts/validate-branch.sh [nombre-rama]

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para mostrar ayuda
show_help() {
    echo -e "${BLUE}Uso: ./scripts/validate-branch.sh [nombre-rama]${NC}"
    echo ""
    echo -e "${YELLOW}Descripción:${NC}"
    echo "  Valida que el nombre de una rama cumpla con los estándares del proyecto"
    echo "  Si no se proporciona nombre, valida la rama actual"
    echo ""
    echo -e "${YELLOW}Ejemplos:${NC}"
    echo "  ./scripts/validate-branch.sh                    # Valida rama actual"
    echo "  ./scripts/validate-branch.sh add/userAuth       # Valida rama específica"
    echo "  ./scripts/validate-branch.sh fix/loginError     # Valida rama específica"
    echo ""
    echo -e "${YELLOW}Estándares:${NC}"
    echo "  - Formato: tipo/nombre"
    echo "  - Tipos: add, fix, refactor, delete, docs, hotfix"
    echo "  - Nombre en lowerCamelCase"
    echo "  - Máximo 30 caracteres total"
    echo "  - Solo letras y números"
}

# Función para obtener rama actual
get_current_branch() {
    git rev-parse --abbrev-ref HEAD 2>/dev/null
}

# Función para validar si es rama permanente
is_permanent_branch() {
    local branch=$1
    case $branch in
        master|develop|staging|UAT)
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# Función para validar tipo
validate_type() {
    local type=$1
    case $type in
        add|fix|refactor|delete|docs|hotfix)
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# Función para validar formato lowerCamelCase
validate_camel_case() {
    local name=$1
    
    # Verificar que no esté vacío
    if [ -z "$name" ]; then
        return 1
    fi
    
    # Verificar formato lowerCamelCase
    if [[ $name =~ ^[a-z][a-zA-Z0-9]*$ ]]; then
        return 0
    else
        return 1
    fi
}

# Función principal de validación
validate_branch_name() {
    local branch_name=$1
    local errors=()
    local warnings=()
    
    echo -e "${BLUE}Validando rama: ${YELLOW}'$branch_name'${NC}"
    echo ""
    
    # Verificar si es rama permanente
    if is_permanent_branch "$branch_name"; then
        echo -e "${GREEN}✓ Rama permanente válida${NC}"
        return 0
    fi
    
    # Verificar longitud total
    local length=${#branch_name}
    if [ $length -gt 30 ]; then
        errors+=("Longitud excede 30 caracteres ($length)")
    else
        echo -e "${GREEN}✓ Longitud válida ($length/30 caracteres)${NC}"
    fi
    
    # Verificar formato tipo/nombre
    if [[ $branch_name =~ ^([^/]+)/(.+)$ ]]; then
        local type="${BASH_REMATCH[1]}"
        local name="${BASH_REMATCH[2]}"
        
        echo -e "${BLUE}  Tipo: ${YELLOW}'$type'${NC}"
        echo -e "${BLUE}  Nombre: ${YELLOW}'$name'${NC}"
        
        # Validar tipo
        if validate_type "$type"; then
            echo -e "${GREEN}✓ Tipo válido${NC}"
        else
            errors+=("Tipo '$type' no válido. Tipos válidos: add, fix, refactor, delete, docs, hotfix")
        fi
        
        # Validar nombre en lowerCamelCase
        if validate_camel_case "$name"; then
            echo -e "${GREEN}✓ Nombre en formato lowerCamelCase válido${NC}"
        else
            errors+=("Nombre '$name' debe estar en lowerCamelCase (primera letra minúscula, solo letras y números)")
        fi
        
        # Verificar caracteres especiales
        if [[ $name =~ [^a-zA-Z0-9] ]]; then
            errors+=("Nombre contiene caracteres especiales. Solo se permiten letras y números")
        fi
        
        # Advertencias adicionales
        if [ ${#name} -lt 3 ]; then
            warnings+=("Nombre muy corto. Considera usar un nombre más descriptivo")
        fi
        
        if [[ $name =~ ^(test|temp|tmp)$ ]]; then
            warnings+=("Nombre genérico. Considera usar un nombre más específico")
        fi
        
    else
        errors+=("Formato incorrecto. Debe ser 'tipo/nombre'")
    fi
    
    # Mostrar resultados
    echo ""
    
    if [ ${#warnings[@]} -gt 0 ]; then
        echo -e "${YELLOW}⚠ Advertencias:${NC}"
        for warning in "${warnings[@]}"; do
            echo -e "${YELLOW}  - $warning${NC}"
        done
        echo ""
    fi
    
    if [ ${#errors[@]} -gt 0 ]; then
        echo -e "${RED}✗ Errores encontrados:${NC}"
        for error in "${errors[@]}"; do
            echo -e "${RED}  - $error${NC}"
        done
        echo ""
        echo -e "${YELLOW}Para más información sobre estándares de ramas:${NC}"
        echo -e "${BLUE}  docs/git-branch-standards.md${NC}"
        return 1
    else
        echo -e "${GREEN}✓ Rama válida según estándares del proyecto${NC}"
        if [ ${#warnings[@]} -gt 0 ]; then
            echo -e "${YELLOW}  (con advertencias menores)${NC}"
        fi
        return 0
    fi
}

# Función principal
main() {
    # Mostrar ayuda si se solicita
    if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
        show_help
        exit 0
    fi
    
    # Verificar que estamos en un repositorio Git
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        echo -e "${RED}Error: No estás en un repositorio Git${NC}"
        exit 1
    fi
    
    # Determinar qué rama validar
    local branch_to_validate
    
    if [ $# -eq 0 ]; then
        # No se proporcionó rama, usar la actual
        branch_to_validate=$(get_current_branch)
        if [ -z "$branch_to_validate" ]; then
            echo -e "${RED}Error: No se pudo determinar la rama actual${NC}"
            exit 1
        fi
        echo -e "${BLUE}Validando rama actual...${NC}"
    else
        # Se proporcionó una rama específica
        branch_to_validate="$1"
    fi
    
    # Validar la rama
    validate_branch_name "$branch_to_validate"
}

# Ejecutar función principal
main "$@"