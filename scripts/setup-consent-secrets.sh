#!/bin/bash

################################################################################
# Script de Ayuda para Configurar GitHub Secrets de Versiones de Consentimiento
#
# Este script te guía para configurar los secrets necesarios en GitHub Actions
# para gestionar versiones de consentimiento por entorno.
#
# Uso:
#   ./scripts/setup-consent-secrets.sh
#
# Prerequisitos:
#   - GitHub CLI instalado (gh) - OPCIONAL
#   - Acceso de admin al repositorio
################################################################################

set -e

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Banner
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🔐 Configurador de Secrets para Versiones de Consentimiento"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verificar si gh está instalado
if command -v gh &> /dev/null; then
    GH_INSTALLED=true
    echo -e "${GREEN}✅ GitHub CLI detectado${NC}"
else
    GH_INSTALLED=false
    echo -e "${YELLOW}⚠️  GitHub CLI no instalado (usaremos método manual)${NC}"
fi

echo ""
echo "Este script te ayudará a configurar los secrets necesarios para"
echo "gestionar versiones de consentimiento en staging y producción."
echo ""

# Función para validar formato de versión
validate_version() {
    local version=$1
    if [[ $version =~ ^v?[0-9]+\.[0-9]+(\.[0-9]+)?(-[a-zA-Z0-9.-]+)?$ ]]; then
        # Normalizar (agregar 'v' si no lo tiene)
        if [[ ! $version =~ ^v ]]; then
            version="v$version"
        fi
        echo "$version"
        return 0
    else
        return 1
    fi
}

# Función para crear secret con gh CLI
create_secret_with_gh() {
    local secret_name=$1
    local secret_value=$2

    echo -e "${BLUE}🔄 Configurando secret: $secret_name${NC}"

    if gh secret set "$secret_name" -b"$secret_value" 2>/dev/null; then
        echo -e "${GREEN}✅ Secret $secret_name configurado exitosamente${NC}"
        return 0
    else
        echo -e "${RED}❌ Error al configurar secret $secret_name${NC}"
        return 1
    fi
}

# Función para crear variable con gh CLI
create_variable_with_gh() {
    local variable_name=$1
    local variable_value=$2

    echo -e "${BLUE}🔄 Configurando variable: $variable_name${NC}"

    if gh variable set "$variable_name" -b"$variable_value" 2>/dev/null; then
        echo -e "${GREEN}✅ Variable $variable_name configurada exitosamente${NC}"
        return 0
    else
        echo -e "${RED}❌ Error al configurar variable $variable_name${NC}"
        return 1
    fi
}

# Función para mostrar instrucciones manuales para secrets
show_manual_instructions() {
    local secret_name=$1
    local secret_value=$2

    echo ""
    echo -e "${YELLOW}📋 Configuración Manual para $secret_name:${NC}"
    echo ""
    echo "1. Ve a: https://github.com/[TU_USUARIO]/guiders-backend/settings/secrets/actions"
    echo "2. Haz clic en: [New repository secret]"
    echo "3. En 'Name', escribe: $secret_name"
    echo "4. En 'Secret', escribe: $secret_value"
    echo "5. Haz clic en: [Add secret]"
    echo ""
}

# Función para mostrar instrucciones manuales para variables
show_manual_variable_instructions() {
    local variable_name=$1
    local variable_value=$2

    echo ""
    echo -e "${YELLOW}📋 Configuración Manual para $variable_name:${NC}"
    echo ""
    echo "1. Ve a: https://github.com/[TU_USUARIO]/guiders-backend/settings/variables/actions"
    echo "2. Haz clic en: [New repository variable]"
    echo "3. En 'Name', escribe: $variable_name"
    echo "4. En 'Value', escribe: $variable_value"
    echo "5. Haz clic en: [Add variable]"
    echo ""
}

# Preguntar por las versiones
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Configuración de Versiones"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Versión para Staging
while true; do
    read -p "📝 Versión para STAGING [v1.4.0]: " STAGING_VERSION
    STAGING_VERSION=${STAGING_VERSION:-v1.4.0}

    if NORMALIZED_STAGING=$(validate_version "$STAGING_VERSION"); then
        STAGING_VERSION=$NORMALIZED_STAGING
        echo -e "${GREEN}✅ Versión válida: $STAGING_VERSION${NC}"
        break
    else
        echo -e "${RED}❌ Formato inválido. Usa: v1.4.0 o 1.4.0${NC}"
    fi
done

echo ""

# Versión para Producción
while true; do
    read -p "📝 Versión para PRODUCCIÓN [v1.4.0]: " PROD_VERSION
    PROD_VERSION=${PROD_VERSION:-v1.4.0}

    if NORMALIZED_PROD=$(validate_version "$PROD_VERSION"); then
        PROD_VERSION=$NORMALIZED_PROD
        echo -e "${GREEN}✅ Versión válida: $PROD_VERSION${NC}"
        break
    else
        echo -e "${RED}❌ Formato inválido. Usa: v1.4.0 o 1.4.0${NC}"
    fi
done

echo ""

# Preguntar por compatibilidad semver
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Configuración de Compatibilidad Semántica (SemVer)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "La compatibilidad semántica permite aceptar versiones de consentimiento"
echo "con MINOR y PATCH superiores a la versión configurada."
echo ""
echo "Ejemplo: Si configuras v1.4.0 y habilitas semver:"
echo "  ✅ v1.4.1, v1.5.0, v1.6.2 serán aceptadas"
echo "  ❌ v2.0.0, v0.9.0 serán rechazadas"
echo ""

read -p "¿Habilitar compatibilidad semántica? [Y/n]: " ENABLE_SEMVER
ENABLE_SEMVER=${ENABLE_SEMVER:-Y}

if [[ $ENABLE_SEMVER =~ ^[Yy]$ ]]; then
    SEMVER_VALUE="true"
    echo -e "${GREEN}✅ Compatibilidad semántica habilitada${NC}"
else
    SEMVER_VALUE="false"
    echo -e "${YELLOW}⚠️  Compatibilidad semántica deshabilitada (solo versión exacta)${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Resumen de Configuración"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "  ${BLUE}Staging:${NC}              $STAGING_VERSION"
echo -e "  ${BLUE}Producción:${NC}           $PROD_VERSION"
echo -e "  ${BLUE}Compatibilidad SemVer:${NC} $SEMVER_VALUE"
echo ""

# Confirmación
read -p "¿Proceder con esta configuración? [Y/n]: " CONFIRM
CONFIRM=${CONFIRM:-Y}

if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠️  Configuración cancelada${NC}"
    exit 0
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Configurando Secrets"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$GH_INSTALLED" = true ]; then
    echo "Usando GitHub CLI para configurar secrets y variables..."
    echo ""

    # Configurar staging
    if create_secret_with_gh "STAGING_CONSENT_VERSION" "$STAGING_VERSION"; then
        STAGING_SUCCESS=true
    else
        STAGING_SUCCESS=false
        show_manual_instructions "STAGING_CONSENT_VERSION" "$STAGING_VERSION"
    fi

    echo ""

    # Configurar producción
    if create_secret_with_gh "PROD_CONSENT_VERSION" "$PROD_VERSION"; then
        PROD_SUCCESS=true
    else
        PROD_SUCCESS=false
        show_manual_instructions "PROD_CONSENT_VERSION" "$PROD_VERSION"
    fi

    echo ""

    # Configurar variable de compatibilidad semver
    if create_variable_with_gh "ENABLE_SEMVER_COMPATIBILITY" "$SEMVER_VALUE"; then
        SEMVER_SUCCESS=true
    else
        SEMVER_SUCCESS=false
        show_manual_variable_instructions "ENABLE_SEMVER_COMPATIBILITY" "$SEMVER_VALUE"
    fi
else
    echo "Configuración manual requerida:"
    echo ""
    echo -e "${BLUE}Secrets a configurar:${NC}"
    show_manual_instructions "STAGING_CONSENT_VERSION" "$STAGING_VERSION"
    show_manual_instructions "PROD_CONSENT_VERSION" "$PROD_VERSION"
    echo ""
    echo -e "${BLUE}Variables a configurar:${NC}"
    show_manual_variable_instructions "ENABLE_SEMVER_COMPATIBILITY" "$SEMVER_VALUE"
    STAGING_SUCCESS=false
    PROD_SUCCESS=false
    SEMVER_SUCCESS=false
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Comandos de Verificación"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$GH_INSTALLED" = true ]; then
    echo "Para verificar que los secrets y variables fueron creados correctamente:"
    echo ""
    echo -e "${BLUE}# Listar todos los secrets${NC}"
    echo "gh secret list"
    echo ""
    echo -e "${BLUE}# Ver secret de staging (no muestra el valor)${NC}"
    echo "gh secret list | grep STAGING_CONSENT_VERSION"
    echo ""
    echo -e "${BLUE}# Ver secret de producción (no muestra el valor)${NC}"
    echo "gh secret list | grep PROD_CONSENT_VERSION"
    echo ""
    echo -e "${BLUE}# Listar todas las variables${NC}"
    echo "gh variable list"
    echo ""
    echo -e "${BLUE}# Ver variable de compatibilidad semver${NC}"
    echo "gh variable list | grep ENABLE_SEMVER_COMPATIBILITY"
else
    echo "Verifica en GitHub:"
    echo ""
    echo "1. Secrets - Ve a: https://github.com/[TU_USUARIO]/guiders-backend/settings/secrets/actions"
    echo "   Deberías ver:"
    echo "   - STAGING_CONSENT_VERSION"
    echo "   - PROD_CONSENT_VERSION"
    echo ""
    echo "2. Variables - Ve a: https://github.com/[TU_USUARIO]/guiders-backend/settings/variables/actions"
    echo "   Deberías ver:"
    echo "   - ENABLE_SEMVER_COMPATIBILITY"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Próximos Pasos"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Verifica que los secrets y variables fueron creados correctamente"
echo ""
echo "2. Prueba con un deployment:"
echo -e "   ${BLUE}git commit --allow-empty -m \"test: verificar consent version y semver\"${NC}"
echo -e "   ${BLUE}git push origin develop${NC}  # Para staging"
echo ""
echo "3. Revisa los logs del workflow en:"
echo "   https://github.com/[TU_USUARIO]/guiders-backend/actions"
echo ""
echo "4. Busca en los logs las líneas:"
echo -e "   ${GREEN}CONSENT_VERSION_CURRENT=$STAGING_VERSION${NC}"
echo -e "   ${GREEN}ENABLE_SEMVER_COMPATIBILITY=$SEMVER_VALUE${NC}"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Documentación Adicional"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📚 Guías disponibles:"
echo ""
echo "  • docs/SETUP_GITHUB_SECRETS_STEP_BY_STEP.md"
echo "    → Guía visual paso a paso con capturas"
echo ""
echo "  • docs/GITHUB_SECRETS_CONSENT_VERSION.md"
echo "    → Documentación técnica completa"
echo ""
echo "  • docs/CONSENT_VERSION_MANAGEMENT.md"
echo "    → Gestión de versiones de consentimiento"
echo ""

if [ "$STAGING_SUCCESS" = true ] && [ "$PROD_SUCCESS" = true ] && [ "$SEMVER_SUCCESS" = true ]; then
    echo -e "${GREEN}✅ ¡Configuración completada exitosamente!${NC}"
    echo ""
    echo "Configuración aplicada:"
    echo "  • STAGING_CONSENT_VERSION = $STAGING_VERSION"
    echo "  • PROD_CONSENT_VERSION = $PROD_VERSION"
    echo "  • ENABLE_SEMVER_COMPATIBILITY = $SEMVER_VALUE"
    exit 0
elif [ "$GH_INSTALLED" = false ]; then
    echo -e "${YELLOW}⚠️  Configuración manual requerida (ve las instrucciones arriba)${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Algunos secrets/variables requieren configuración manual${NC}"
    [ "$STAGING_SUCCESS" = false ] && echo "  ❌ STAGING_CONSENT_VERSION"
    [ "$PROD_SUCCESS" = false ] && echo "  ❌ PROD_CONSENT_VERSION"
    [ "$SEMVER_SUCCESS" = false ] && echo "  ❌ ENABLE_SEMVER_COMPATIBILITY"
    exit 1
fi
