#!/bin/bash

# Script para configurar atributos de usuario mediante Admin Console de Keycloak
# usando el método más directo posible

set -e

# Configuración
KEYCLOAK_URL="http://localhost:8080"
REALM="guiders"
CLIENT_ID="admin-cli"
USERNAME="admin"
PASSWORD="admin123"
USER_EMAIL="test1@demo.com"
ORG_NAME="Test Company"
ORG_ID="734faa73-12dc-4ddc-aad0-1db67c7f4dd7"

echo "🔧 Configurando atributos de usuario mediante método directo..."

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

# Obtener ID del usuario
echo "👤 Obteniendo datos del usuario..."
USER_ID=$(curl -s -X GET \
  "$KEYCLOAK_URL/admin/realms/$REALM/users?email=$USER_EMAIL" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | \
  jq -r '.[0].id')

if [ -z "$USER_ID" ] || [ "$USER_ID" = "null" ]; then
  echo "❌ Error: Usuario no encontrado"
  exit 1
fi

echo "✅ Usuario ID: $USER_ID"

# Método 1: Crear payload minimalista solo con atributos
echo "📝 Método 1 - Payload minimalista..."

MINIMAL_PAYLOAD='{
  "attributes": {
    "organization": ["'$ORG_NAME'"],
    "organization.id": ["'$ORG_ID'"],
    "organization.name": ["'$ORG_NAME'"]
  }
}'

echo "Payload: $MINIMAL_PAYLOAD"

RESPONSE_1=$(curl -s -w "HTTP_CODE:%{http_code}" -X PUT \
  "$KEYCLOAK_URL/admin/realms/$REALM/users/$USER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$MINIMAL_PAYLOAD")

HTTP_CODE_1=$(echo "$RESPONSE_1" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)

if [ "$HTTP_CODE_1" = "204" ]; then
  echo "✅ Método 1 - Actualización exitosa"
  
  # Verificar inmediatamente
  VERIFY_1=$(curl -s -X GET \
    "$KEYCLOAK_URL/admin/realms/$REALM/users/$USER_ID" \
    -H "Authorization: Bearer $ACCESS_TOKEN" | \
    jq '.attributes')
  
  echo "📋 Verificación Método 1: $VERIFY_1"
  
  if [ "$VERIFY_1" != "null" ]; then
    echo "🎉 ¡Éxito! Los atributos se han configurado correctamente"
    echo ""
    echo "💡 Ahora haz logout/login para probar los nuevos claims"
    exit 0
  fi
else
  echo "❌ Método 1 falló. HTTP Code: $HTTP_CODE_1"
  echo "Response: $(echo "$RESPONSE_1" | sed 's/HTTP_CODE:[0-9]*//')"
fi

# Método 2: Si el método 1 falla, intentar con representación completa
echo ""
echo "📝 Método 2 - Representación completa del usuario..."

# Obtener representación completa actual
FULL_USER=$(curl -s -X GET \
  "$KEYCLOAK_URL/admin/realms/$REALM/users/$USER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "Usuario actual obtenido, agregando atributos..."

# Agregar atributos a la representación completa
FULL_PAYLOAD=$(echo "$FULL_USER" | jq --arg org_name "$ORG_NAME" --arg org_id "$ORG_ID" '
  .attributes = {
    "organization": [$org_name],
    "organization.id": [$org_id], 
    "organization.name": [$org_name]
  }
')

RESPONSE_2=$(curl -s -w "HTTP_CODE:%{http_code}" -X PUT \
  "$KEYCLOAK_URL/admin/realms/$REALM/users/$USER_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$FULL_PAYLOAD")

HTTP_CODE_2=$(echo "$RESPONSE_2" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)

if [ "$HTTP_CODE_2" = "204" ]; then
  echo "✅ Método 2 - Actualización exitosa"
  
  # Verificar inmediatamente
  VERIFY_2=$(curl -s -X GET \
    "$KEYCLOAK_URL/admin/realms/$REALM/users/$USER_ID" \
    -H "Authorization: Bearer $ACCESS_TOKEN" | \
    jq '.attributes')
  
  echo "📋 Verificación Método 2: $VERIFY_2"
  
  if [ "$VERIFY_2" != "null" ]; then
    echo "🎉 ¡Éxito! Los atributos se han configurado correctamente"
  else
    echo "❌ Los atributos siguen siendo null después del Método 2"
  fi
else
  echo "❌ Método 2 falló. HTTP Code: $HTTP_CODE_2"
  echo "Response: $(echo "$RESPONSE_2" | sed 's/HTTP_CODE:[0-9]*//')"
fi

echo ""
echo "💡 Recomendación: Configurar manualmente desde Admin Console si los scripts no funcionan:"
echo "   1. http://localhost:8080/admin/"
echo "   2. Realm: guiders > Users > test1@demo.com > Attributes"
echo "   3. Añadir manualmente:"
echo "      - organization: Test Company"
echo "      - organization.id: 734faa73-12dc-4ddc-aad0-1db67c7f4dd7"
echo "      - organization.name: Test Company"