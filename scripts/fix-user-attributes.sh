#!/bin/bash

# Script para verificar y asignar atributos de usuario correctamente
# Uso: ./scripts/fix-user-attributes.sh <email> <org_name> <org_id>

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

echo "🔧 Corrigiendo atributos del usuario '$USER_EMAIL'..."

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
USER_DATA=$(curl -s -X GET \
  "$KEYCLOAK_URL/admin/realms/$REALM/users?email=$USER_EMAIL" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

USER_ID=$(echo "$USER_DATA" | jq -r '.[0].id // empty')

if [ -z "$USER_ID" ]; then
  echo "❌ Error: Usuario '$USER_EMAIL' no encontrado"
  exit 1
fi

echo "✅ Usuario encontrado: $USER_ID"

# Mostrar atributos actuales
echo "📋 Atributos actuales del usuario:"
echo "$USER_DATA" | jq -r '.[0].attributes // {}'

# Preparar payload con atributos de organización
echo "📝 Preparando payload con atributos de organización..."

# Obtener datos completos actuales del usuario
CURRENT_USER=$(curl -s -X GET \
  "$KEYCLOAK_URL/admin/realms/$REALM/users/$USER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

# Crear payload con atributos organizacionales
USER_PAYLOAD=$(echo "$CURRENT_USER" | jq --arg org_name "$ORG_NAME" --arg org_id "$ORG_ID" '
  .attributes = (.attributes // {}) |
  .attributes.organization = [$org_name] |
  .attributes["organization.id"] = [$org_id] |
  .attributes["organization.name"] = [$org_name]
')

echo "🔍 Payload a enviar:"
echo "$USER_PAYLOAD" | jq '.attributes'

# Actualizar usuario
echo "💾 Actualizando usuario..."
RESPONSE=$(curl -s -w "HTTP_CODE:%{http_code}" -X PUT \
  "$KEYCLOAK_URL/admin/realms/$REALM/users/$USER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$USER_PAYLOAD")

HTTP_CODE=$(echo "$RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)

if [ "$HTTP_CODE" = "204" ]; then
  echo "✅ Usuario actualizado correctamente"
  
  # Verificar actualización
  echo "🔍 Verificando actualización..."
  UPDATED_USER=$(curl -s -X GET \
    "$KEYCLOAK_URL/admin/realms/$REALM/users/$USER_ID" \
    -H "Authorization: Bearer $ACCESS_TOKEN")
  
  echo "📋 Atributos después de la actualización:"
  echo "$UPDATED_USER" | jq '.attributes'
  
  echo ""
  echo "🎉 ¡Atributos asignados correctamente!"
  echo ""
  echo "📋 Atributos configurados:"
  echo "  - organization: $ORG_NAME"
  echo "  - organization.id: $ORG_ID"
  echo "  - organization.name: $ORG_NAME"
  echo ""
  echo "💡 Ahora haz logout/login para probar los nuevos claims"
  
else
  echo "❌ Error actualizando usuario. HTTP Code: $HTTP_CODE"
  echo "Response: $(echo "$RESPONSE" | sed 's/HTTP_CODE:[0-9]*//')"
fi