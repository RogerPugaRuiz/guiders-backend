#!/bin/bash

# Script para configurar el client scope de organization en Keycloak
# Uso: ./scripts/setup-organization-scope.sh

set -e

# Configuración
KEYCLOAK_URL="http://localhost:8080"
REALM="guiders"  # Realm de la aplicación
CLIENT_ID="admin-cli"  # Cliente admin por defecto
USERNAME="admin"
PASSWORD="admin123"

echo "🚀 Configurando Organization Client Scope en Keycloak..."

# 1. Obtener token de acceso desde realm master
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

# 2. Crear Client Scope "organization"
echo "🔧 Creando client scope 'organization'..."
SCOPE_PAYLOAD='{
  "name": "organization",
  "description": "Organization membership information",
  "protocol": "openid-connect",
  "displayOnConsentScreen": true,
  "consentScreenText": "Access to organization information",
  "includeInTokenScope": true,
  "guiOrder": 100
}'

SCOPE_RESPONSE=$(curl -s -w "HTTP_CODE:%{http_code}" -X POST \
  "$KEYCLOAK_URL/admin/realms/$REALM/client-scopes" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$SCOPE_PAYLOAD")

HTTP_CODE=$(echo "$SCOPE_RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)

if [ "$HTTP_CODE" = "201" ]; then
  echo "✅ Client scope 'organization' creado correctamente"
elif [ "$HTTP_CODE" = "409" ]; then
  echo "⚠️  Client scope 'organization' ya existe"
else
  echo "❌ Error creando client scope. HTTP Code: $HTTP_CODE"
  echo "Response: $(echo "$SCOPE_RESPONSE" | sed 's/HTTP_CODE:[0-9]*//')"
fi

# 3. Obtener ID del client scope creado
echo "🔍 Obteniendo ID del client scope..."
SCOPE_ID=$(curl -s -X GET \
  "$KEYCLOAK_URL/admin/realms/$REALM/client-scopes" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | \
  jq -r '.[] | select(.name=="organization") | .id')

if [ -z "$SCOPE_ID" ] || [ "$SCOPE_ID" = "null" ]; then
  echo "❌ Error: No se pudo obtener el ID del client scope"
  exit 1
fi

echo "✅ Client scope ID: $SCOPE_ID"

# 4. Crear mapper para organization completa
echo "🗺️  Creando mapper 'organization-full'..."
MAPPER_FULL_PAYLOAD='{
  "name": "organization-full",
  "protocol": "openid-connect",
  "protocolMapper": "oidc-usermodel-attribute-mapper",
  "consentRequired": false,
  "config": {
    "userinfo.token.claim": "true",
    "user.attribute": "organization",
    "id.token.claim": "true",
    "access.token.claim": "true",
    "claim.name": "organization",
    "jsonType.label": "JSON"
  }
}'

curl -s -X POST \
  "$KEYCLOAK_URL/admin/realms/$REALM/client-scopes/$SCOPE_ID/protocol-mappers/models" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$MAPPER_FULL_PAYLOAD" > /dev/null

echo "✅ Mapper 'organization-full' creado"

# 5. Crear mapper para organization ID
echo "🗺️  Creando mapper 'organization-id'..."
MAPPER_ID_PAYLOAD='{
  "name": "organization-id",
  "protocol": "openid-connect", 
  "protocolMapper": "oidc-usermodel-attribute-mapper",
  "consentRequired": false,
  "config": {
    "userinfo.token.claim": "true",
    "user.attribute": "organization.id",
    "id.token.claim": "true", 
    "access.token.claim": "true",
    "claim.name": "organization_id",
    "jsonType.label": "String"
  }
}'

curl -s -X POST \
  "$KEYCLOAK_URL/admin/realms/$REALM/client-scopes/$SCOPE_ID/protocol-mappers/models" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$MAPPER_ID_PAYLOAD" > /dev/null

echo "✅ Mapper 'organization-id' creado"

# 6. Crear mapper para organization name
echo "🗺️  Creando mapper 'organization-name'..."
MAPPER_NAME_PAYLOAD='{
  "name": "organization-name",
  "protocol": "openid-connect",
  "protocolMapper": "oidc-usermodel-attribute-mapper", 
  "consentRequired": false,
  "config": {
    "userinfo.token.claim": "true",
    "user.attribute": "organization.name",
    "id.token.claim": "true",
    "access.token.claim": "true", 
    "claim.name": "organization_name",
    "jsonType.label": "String"
  }
}'

curl -s -X POST \
  "$KEYCLOAK_URL/admin/realms/$REALM/client-scopes/$SCOPE_ID/protocol-mappers/models" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$MAPPER_NAME_PAYLOAD" > /dev/null

echo "✅ Mapper 'organization-name' creado"

echo ""
echo "🎉 ¡Configuración completada!"
echo ""
echo "📋 Próximos pasos:"
echo "1. Asignar el scope 'organization' a tus clients"
echo "2. Crear organizaciones y asignar usuarios"
echo "3. Probar que los tokens incluyan los claims de organization"
echo ""
echo "🔗 Scope ID creado: $SCOPE_ID"