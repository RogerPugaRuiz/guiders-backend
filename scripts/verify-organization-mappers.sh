#!/bin/bash

# Script para verificar y corregir mappers del client scope organization
# Uso: ./scripts/verify-organization-mappers.sh

set -e

# Configuración
KEYCLOAK_URL="http://localhost:8080"
REALM="guiders"
CLIENT_ID="admin-cli"
USERNAME="admin"
PASSWORD="admin123"

echo "🔍 Verificando mappers del client scope 'organization'..."

# Obtener token de acceso
echo "📋 Obteniendo token de acceso..."
ACCESS_TOKEN=$(curl -s -X POST \
  "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=$CLIENT_ID" \
  -d "username=$USERNAME" \
  -d "password=$PASSWORD" | \
  jq -r '.access_token')

if [ "$ACCESS_TOKEN" = "null" ] || [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Error: No se pudo obtener el token de acceso"
  exit 1
fi

echo "✅ Token obtenido correctamente"

# Obtener ID del client scope organization
echo "🔍 Buscando client scope 'organization'..."
SCOPE_ID=$(curl -s -X GET \
  "$KEYCLOAK_URL/admin/realms/$REALM/client-scopes" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | \
  jq -r '.[] | select(.name=="organization") | .id')

if [ -z "$SCOPE_ID" ] || [ "$SCOPE_ID" = "null" ]; then
  echo "❌ Error: Client scope 'organization' no encontrado"
  exit 1
fi

echo "✅ Organization scope ID: $SCOPE_ID"

# Verificar mappers existentes
echo "🗺️  Verificando mappers actuales..."
MAPPERS=$(curl -s -X GET \
  "$KEYCLOAK_URL/admin/realms/$REALM/client-scopes/$SCOPE_ID/protocol-mappers/models" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "📋 Mappers encontrados:"
echo "$MAPPERS" | jq -r '.[] | "  - \(.name) (\(.protocolMapper)) -> \(.config["claim.name"] // "N/A")"'

# Verificar configuración específica de cada mapper
echo ""
echo "🔍 Verificando configuración detallada..."

# Buscar mapper organization-full
ORG_FULL_MAPPER=$(echo "$MAPPERS" | jq '.[] | select(.name=="organization-full")')
if [ "$ORG_FULL_MAPPER" != "null" ] && [ -n "$ORG_FULL_MAPPER" ]; then
  echo "✅ Mapper 'organization-full' encontrado"
  echo "   - User Attribute: $(echo "$ORG_FULL_MAPPER" | jq -r '.config["user.attribute"] // "N/A"')"
  echo "   - Claim Name: $(echo "$ORG_FULL_MAPPER" | jq -r '.config["claim.name"] // "N/A"')"
  echo "   - ID Token: $(echo "$ORG_FULL_MAPPER" | jq -r '.config["id.token.claim"] // "N/A"')"
  echo "   - Access Token: $(echo "$ORG_FULL_MAPPER" | jq -r '.config["access.token.claim"] // "N/A"')"
else
  echo "❌ Mapper 'organization-full' NO encontrado"
fi

# Buscar mapper organization-id
ORG_ID_MAPPER=$(echo "$MAPPERS" | jq '.[] | select(.name=="organization-id")')
if [ "$ORG_ID_MAPPER" != "null" ] && [ -n "$ORG_ID_MAPPER" ]; then
  echo "✅ Mapper 'organization-id' encontrado"
  echo "   - User Attribute: $(echo "$ORG_ID_MAPPER" | jq -r '.config["user.attribute"] // "N/A"')"
  echo "   - Claim Name: $(echo "$ORG_ID_MAPPER" | jq -r '.config["claim.name"] // "N/A"')"
else
  echo "❌ Mapper 'organization-id' NO encontrado" 
fi

# Buscar mapper organization-name
ORG_NAME_MAPPER=$(echo "$MAPPERS" | jq '.[] | select(.name=="organization-name")')
if [ "$ORG_NAME_MAPPER" != "null" ] && [ -n "$ORG_NAME_MAPPER" ]; then
  echo "✅ Mapper 'organization-name' encontrado"
  echo "   - User Attribute: $(echo "$ORG_NAME_MAPPER" | jq -r '.config["user.attribute"] // "N/A"')"
  echo "   - Claim Name: $(echo "$ORG_NAME_MAPPER" | jq -r '.config["claim.name"] // "N/A"')"
else
  echo "❌ Mapper 'organization-name' NO encontrado"
fi

echo ""
echo "🔍 Verificando atributos del usuario test1@demo.com..."

# Verificar atributos del usuario
USER_ATTRS=$(curl -s -X GET \
  "$KEYCLOAK_URL/admin/realms/$REALM/users?email=test1@demo.com" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | \
  jq -r '.[0].attributes // {}')

echo "👤 Atributos del usuario:"
echo "$USER_ATTRS" | jq '.'

echo ""
echo "🎯 Recomendaciones:"
if [ "$ORG_FULL_MAPPER" = "null" ] || [ -z "$ORG_FULL_MAPPER" ]; then
  echo "❌ Recrear mapper 'organization-full'"
fi
if [ "$ORG_ID_MAPPER" = "null" ] || [ -z "$ORG_ID_MAPPER" ]; then
  echo "❌ Recrear mapper 'organization-id'"
fi
if [ "$ORG_NAME_MAPPER" = "null" ] || [ -z "$ORG_NAME_MAPPER" ]; then
  echo "❌ Recrear mapper 'organization-name'"
fi

echo ""
echo "💡 Para recrear mappers ejecuta: ./scripts/setup-organization-scope.sh"