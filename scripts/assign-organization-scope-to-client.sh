#!/bin/bash

# Script para asignar el client scope organization a un client específico
# Uso: ./scripts/assign-organization-scope-to-client.sh [CLIENT_NAME]

set -e

# Configuración
KEYCLOAK_URL="http://localhost:8080"
REALM="guiders"  # Realm de la aplicación
CLIENT_ID="admin-cli"
USERNAME="admin" 
PASSWORD="admin123"
TARGET_CLIENT="${1:-console}"  # Nombre del client, por defecto console

echo "🚀 Asignando scope 'organization' al client '$TARGET_CLIENT'..."

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

# 2. Obtener ID del client target
echo "🔍 Buscando client '$TARGET_CLIENT'..."
TARGET_CLIENT_ID=$(curl -s -X GET \
  "$KEYCLOAK_URL/admin/realms/$REALM/clients" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | \
  jq -r ".[] | select(.clientId==\"$TARGET_CLIENT\") | .id")

if [ -z "$TARGET_CLIENT_ID" ] || [ "$TARGET_CLIENT_ID" = "null" ]; then
  echo "❌ Error: Client '$TARGET_CLIENT' no encontrado"
  echo "💡 Clients disponibles:"
  curl -s -X GET \
    "$KEYCLOAK_URL/admin/realms/$REALM/clients" \
    -H "Authorization: Bearer $ACCESS_TOKEN" | \
    jq -r '.[].clientId' | head -10
  exit 1
fi

echo "✅ Client ID: $TARGET_CLIENT_ID"

# 3. Obtener ID del client scope organization
echo "🔍 Buscando client scope 'organization'..."
SCOPE_ID=$(curl -s -X GET \
  "$KEYCLOAK_URL/admin/realms/$REALM/client-scopes" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | \
  jq -r '.[] | select(.name=="organization") | .id')

if [ -z "$SCOPE_ID" ] || [ "$SCOPE_ID" = "null" ]; then
  echo "❌ Error: Client scope 'organization' no encontrado"
  echo "💡 Ejecuta primero: ./scripts/setup-organization-scope.sh"
  exit 1
fi

echo "✅ Organization scope ID: $SCOPE_ID"

# 4. Asignar scope al client como default
echo "🔗 Asignando scope como default al client..."
curl -s -X PUT \
  "$KEYCLOAK_URL/admin/realms/$REALM/clients/$TARGET_CLIENT_ID/default-client-scopes/$SCOPE_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

echo "✅ Scope 'organization' asignado como default a '$TARGET_CLIENT'"

# 5. Verificar asignación
echo "🔍 Verificando asignación..."
ASSIGNED_SCOPES=$(curl -s -X GET \
  "$KEYCLOAK_URL/admin/realms/$REALM/clients/$TARGET_CLIENT_ID/default-client-scopes" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | \
  jq -r '.[] | select(.name=="organization") | .name')

if [ "$ASSIGNED_SCOPES" = "organization" ]; then
  echo "✅ ¡Verificación exitosa! El scope está correctamente asignado"
else
  echo "⚠️  Advertencia: No se pudo verificar la asignación"
fi

echo ""
echo "🎉 ¡Asignación completada!"
echo ""
echo "📋 Próximos pasos:"
echo "1. Reiniciar tu aplicación para que use el nuevo scope"
echo "2. Crear organizaciones en Keycloak"
echo "3. Asignar usuarios a organizaciones"
echo "4. Probar endpoint /me para verificar claims"