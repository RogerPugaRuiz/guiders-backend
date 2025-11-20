#!/bin/bash

# Script para configurar Valid Post Logout Redirect URIs en Keycloak
# Uso: ./scripts/configure-keycloak-logout.sh

set -e

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Configurar Keycloak Post Logout Redirect URIs ===${NC}\n"

# Variables de entorno (puedes personalizarlas)
KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8080}"
REALM="${KEYCLOAK_REALM:-guiders}"
ADMIN_USER="${KEYCLOAK_ADMIN_USERNAME:-admin}"
ADMIN_PASS="${KEYCLOAK_ADMIN_PASSWORD:-admin123}"

# Clientes a configurar
CONSOLE_CLIENT="${OIDC_CONSOLE_CLIENT_ID:-console}"
ADMIN_CLIENT="${OIDC_ADMIN_CLIENT_ID:-admin}"

# URIs de redirección
BACKEND_URL="${BACKEND_URL:-http://localhost:3000}"
FRONTEND_CONSOLE_URL="${FRONTEND_CONSOLE_URL:-http://localhost:4200}"
FRONTEND_ADMIN_URL="${FRONTEND_ADMIN_URL:-http://localhost:4201}"

echo -e "${YELLOW}Configuración:${NC}"
echo "Keycloak: $KEYCLOAK_URL"
echo "Realm: $REALM"
echo "Backend: $BACKEND_URL"
echo "Frontend Console: $FRONTEND_CONSOLE_URL"
echo "Frontend Admin: $FRONTEND_ADMIN_URL"
echo ""

# Obtener token de acceso
echo -e "${YELLOW}1. Obteniendo token de administrador...${NC}"
TOKEN_RESPONSE=$(curl -s -X POST \
  "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=$ADMIN_USER" \
  -d "password=$ADMIN_PASS" \
  -d "grant_type=password" \
  -d "client_id=admin-cli")

ACCESS_TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
  echo -e "${RED}❌ Error: No se pudo obtener token de acceso${NC}"
  echo "Response: $TOKEN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Token obtenido${NC}\n"

# Función para configurar un cliente
configure_client() {
  local CLIENT_ID=$1
  local FRONTEND_URL=$2
  
  echo -e "${YELLOW}2. Configurando cliente '$CLIENT_ID'...${NC}"
  
  # Obtener ID interno del cliente
  CLIENT_UUID=$(curl -s -X GET \
    "$KEYCLOAK_URL/admin/realms/$REALM/clients?clientId=$CLIENT_ID" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
  
  if [ -z "$CLIENT_UUID" ]; then
    echo -e "${RED}❌ Error: Cliente '$CLIENT_ID' no encontrado${NC}\n"
    return 1
  fi
  
  echo "Cliente UUID: $CLIENT_UUID"
  
  # Obtener configuración actual
  CURRENT_CONFIG=$(curl -s -X GET \
    "$KEYCLOAK_URL/admin/realms/$REALM/clients/$CLIENT_UUID" \
    -H "Authorization: Bearer $ACCESS_TOKEN")
  
  # Preparar configuración actualizada
  UPDATED_CONFIG=$(echo $CURRENT_CONFIG | jq \
    --arg callback "$BACKEND_URL/api/bff/auth/callback/*" \
    --arg frontend "$FRONTEND_URL/*" \
    --arg root "$FRONTEND_URL/" \
    '.redirectUris += [$callback] | .redirectUris |= unique |
     .attributes["post.logout.redirect.uris"] = ($frontend + "##" + $root)')
  
  # Actualizar cliente
  RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT \
    "$KEYCLOAK_URL/admin/realms/$REALM/clients/$CLIENT_UUID" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$UPDATED_CONFIG")
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  
  if [ "$HTTP_CODE" -eq 204 ] || [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✅ Cliente '$CLIENT_ID' configurado correctamente${NC}"
    echo -e "   Valid Redirect URIs: $BACKEND_URL/api/bff/auth/callback/*"
    echo -e "   Valid Post Logout Redirect URIs: $FRONTEND_URL/*, $FRONTEND_URL/"
  else
    echo -e "${RED}❌ Error al configurar cliente '$CLIENT_ID' (HTTP $HTTP_CODE)${NC}"
    echo "$RESPONSE" | head -n-1
    return 1
  fi
  
  echo ""
}

# Configurar cliente Console
configure_client "$CONSOLE_CLIENT" "$FRONTEND_CONSOLE_URL"

# Configurar cliente Admin
configure_client "$ADMIN_CLIENT" "$FRONTEND_ADMIN_URL"

echo -e "${GREEN}=== Configuración completada ===${NC}\n"
echo -e "${YELLOW}Ahora puedes:${NC}"
echo "1. Hacer login en tu aplicación"
echo "2. Hacer logout"
echo "3. Verificar que redirige correctamente al frontend"
echo ""
echo -e "${YELLOW}Para verificar la configuración en Keycloak:${NC}"
echo "1. Ve a $KEYCLOAK_URL/admin"
echo "2. Realm: $REALM → Clients → $CONSOLE_CLIENT (o $ADMIN_CLIENT)"
echo "3. Verifica 'Valid Redirect URIs' y 'Valid post logout redirect URIs'"
