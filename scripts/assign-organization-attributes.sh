#!/bin/bash

# Script para asignar atributos de organización directamente al usuario
# Uso: ./scripts/assign-organization-attributes.sh <email_usuario> <org_name> <org_id>

set -e

# Configuración
KEYCLOAK_URL="http://localhost:8080"
REALM="guiders"
CLIENT_ID="admin-cli"
USERNAME="admin"
PASSWORD="admin123"

USER_EMAIL="$1"
ORG_NAME="$2"
ORG_ID="$3"

if [ -z "$USER_EMAIL" ] || [ -z "$ORG_NAME" ] || [ -z "$ORG_ID" ]; then
  echo "❌ Error: Todos los parámetros son requeridos"
  echo "Uso: $0 <email_usuario> <org_name> <org_id>"
  exit 1
fi

echo "🚀 Asignando atributos de organización al usuario '$USER_EMAIL'..."

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

# Buscar usuario por email
echo "👤 Buscando usuario '$USER_EMAIL'..."

USER_ID=$(curl -s -X GET \
  "$KEYCLOAK_URL/admin/realms/$REALM/users?email=$USER_EMAIL" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | \
  jq -r '.[0].id // empty')

if [ -z "$USER_ID" ]; then
  echo "❌ Error: Usuario '$USER_EMAIL' no encontrado"
  exit 1
fi

echo "✅ Usuario encontrado: $USER_ID"

# Obtener atributos actuales del usuario
echo "📋 Obteniendo atributos actuales del usuario..."

CURRENT_USER=$(curl -s -X GET \
  "$KEYCLOAK_URL/admin/realms/$REALM/users/$USER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

# Actualizar usuario con atributos de organización
echo "📝 Actualizando atributos del usuario..."

# Crear JSON completo del usuario con nuevos atributos
USER_PAYLOAD=$(echo "$CURRENT_USER" | jq --arg org_name "$ORG_NAME" --arg org_id "$ORG_ID" '
  .attributes = (.attributes // {}) | 
  .attributes["organization"] = [$org_name] |
  .attributes["organization.id"] = [$org_id] |
  .attributes["organization.name"] = [$org_name]
')

RESPONSE=$(curl -s -w "HTTP_CODE:%{http_code}" -X PUT \
  "$KEYCLOAK_URL/admin/realms/$REALM/users/$USER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$USER_PAYLOAD")

HTTP_CODE=$(echo "$RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)

if [ "$HTTP_CODE" = "204" ]; then
  echo "✅ Atributos de organización asignados correctamente"
  echo ""
  echo "📋 Atributos asignados:"
  echo "  - organization: $ORG_NAME"
  echo "  - organization.id: $ORG_ID"  
  echo "  - organization.name: $ORG_NAME"
  echo ""
  echo "🎉 ¡Usuario actualizado! Ahora el endpoint /me debería mostrar la organización."
  echo ""
  echo "💡 Para probar:"
  echo "  1. Hacer logout en tu aplicación"
  echo "  2. Hacer login nuevamente"
  echo "  3. Verificar endpoint /me"
else
  echo "❌ Error actualizando usuario. HTTP Code: $HTTP_CODE"
  echo "Response: $(echo "$RESPONSE" | sed 's/HTTP_CODE:[0-9]*//')"
fi