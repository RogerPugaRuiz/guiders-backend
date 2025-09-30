#!/bin/bash

# Script para gestionar organizaciones en Keycloak
# Uso: ./scripts/manage-organizations.sh [create|assign] [args...]

set -e

# Configuración
KEYCLOAK_URL="http://localhost:8080"
REALM="guiders"
CLIENT_ID="admin-cli"
USERNAME="admin"
PASSWORD="admin123"

# Función para obtener token de acceso
get_access_token() {
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
}

# Función para crear organización
create_organization() {
  local org_name="$1"
  local org_display_name="$2"
  
  if [ -z "$org_name" ]; then
    echo "❌ Error: Nombre de organización requerido"
    echo "Uso: $0 create <nombre> [nombre_mostrar]"
    exit 1
  fi
  
  [ -z "$org_display_name" ] && org_display_name="$org_name"
  
  echo "🏢 Creando organización '$org_name'..."
  
  ORG_PAYLOAD="{
    \"name\": \"$org_name\",
    \"description\": \"$org_display_name - Organización creada via script\",
    \"enabled\": true,
    \"domains\": [
      {
        \"name\": \"${org_name}.demo.com\",
        \"verified\": true
      }
    ]
  }"
  
  RESPONSE=$(curl -s -w "HTTP_CODE:%{http_code}" -X POST \
    "$KEYCLOAK_URL/admin/realms/$REALM/organizations" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$ORG_PAYLOAD")
  
  HTTP_CODE=$(echo "$RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
  
  if [ "$HTTP_CODE" = "201" ]; then
    echo "✅ Organización '$org_name' creada correctamente"
    
    # Obtener ID de la organización creada
    ORG_ID=$(curl -s -X GET \
      "$KEYCLOAK_URL/admin/realms/$REALM/organizations" \
      -H "Authorization: Bearer $ACCESS_TOKEN" | \
      jq -r ".[] | select(.name==\"$org_name\") | .id")
    
    echo "🆔 ID de organización: $ORG_ID"
    
  elif [ "$HTTP_CODE" = "409" ]; then
    echo "⚠️  Organización '$org_name' ya existe"
  else
    echo "❌ Error creando organización. HTTP Code: $HTTP_CODE"
    echo "Response: $(echo "$RESPONSE" | sed 's/HTTP_CODE:[0-9]*//')"
  fi
}

# Función para listar organizaciones
list_organizations() {
  echo "📋 Listando organizaciones..."
  
  ORGS=$(curl -s -X GET \
    "$KEYCLOAK_URL/admin/realms/$REALM/organizations" \
    -H "Authorization: Bearer $ACCESS_TOKEN")
  
  echo "$ORGS" | jq -r '.[] | "🏢 \(.name) (\(.id)) - \(.displayName // "Sin nombre mostrar")"'
}

# Función para asignar usuario a organización
assign_user_to_organization() {
  local user_email="$1"
  local org_name="$2"
  
  if [ -z "$user_email" ] || [ -z "$org_name" ]; then
    echo "❌ Error: Email de usuario y nombre de organización requeridos"
    echo "Uso: $0 assign <email_usuario> <nombre_organizacion>"
    exit 1
  fi
  
  echo "👤 Buscando usuario '$user_email'..."
  
  # Buscar usuario por email
  USER_ID=$(curl -s -X GET \
    "$KEYCLOAK_URL/admin/realms/$REALM/users?email=$user_email" \
    -H "Authorization: Bearer $ACCESS_TOKEN" | \
    jq -r '.[0].id // empty')
  
  if [ -z "$USER_ID" ]; then
    echo "❌ Error: Usuario '$user_email' no encontrado"
    exit 1
  fi
  
  echo "✅ Usuario encontrado: $USER_ID"
  
  # Buscar organización por nombre
  echo "🏢 Buscando organización '$org_name'..."
  
  ORG_ID=$(curl -s -X GET \
    "$KEYCLOAK_URL/admin/realms/$REALM/organizations" \
    -H "Authorization: Bearer $ACCESS_TOKEN" | \
    jq -r ".[] | select(.name==\"$org_name\") | .id")
  
  if [ -z "$ORG_ID" ]; then
    echo "❌ Error: Organización '$org_name' no encontrada"
    exit 1
  fi
  
  echo "✅ Organización encontrada: $ORG_ID"
  
  # Asignar usuario a organización
  echo "🔗 Asignando usuario a organización..."
  
  RESPONSE=$(curl -s -w "HTTP_CODE:%{http_code}" -X POST \
    "$KEYCLOAK_URL/admin/realms/$REALM/organizations/$ORG_ID/members" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"userId\": \"$USER_ID\"}")
  
  HTTP_CODE=$(echo "$RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)
  
  if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "204" ]; then
    echo "✅ Usuario '$user_email' asignado a organización '$org_name'"
    
    # Actualizar atributos del usuario para los mappers
    echo "📝 Actualizando atributos del usuario..."
    
    USER_ATTRS_PAYLOAD="{
      \"attributes\": {
        \"organization\": [\"${org_name}\"],
        \"organization.id\": [\"${ORG_ID}\"],
        \"organization.name\": [\"${org_name}\"]
      }
    }"
    
    curl -s -X PUT \
      "$KEYCLOAK_URL/admin/realms/$REALM/users/$USER_ID" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "Content-Type: application/json" \
      -d "$USER_ATTRS_PAYLOAD" > /dev/null
    
    echo "✅ Atributos de usuario actualizados"
    
  elif [ "$HTTP_CODE" = "409" ]; then
    echo "⚠️  Usuario ya está asignado a la organización"
  else
    echo "❌ Error asignando usuario. HTTP Code: $HTTP_CODE"
    echo "Response: $(echo "$RESPONSE" | sed 's/HTTP_CODE:[0-9]*//')"
  fi
}

# Función para mostrar ayuda
show_help() {
  echo "🔧 Gestión de Organizaciones en Keycloak"
  echo ""
  echo "Uso: $0 <comando> [argumentos]"
  echo ""
  echo "Comandos disponibles:"
  echo "  create <nombre> [nombre_mostrar]    - Crear nueva organización"
  echo "  list                               - Listar todas las organizaciones"
  echo "  assign <email> <org_nombre>        - Asignar usuario a organización"
  echo "  help                               - Mostrar esta ayuda"
  echo ""
  echo "Ejemplos:"
  echo "  $0 create acme-corp 'ACME Corporation'"
  echo "  $0 list"
  echo "  $0 assign test1@demo.com acme-corp"
}

# Obtener token al inicio
get_access_token

# Procesar comando
case "${1:-help}" in
  "create")
    create_organization "$2" "$3"
    ;;
  "list")
    list_organizations
    ;;
  "assign")
    assign_user_to_organization "$2" "$3"
    ;;
  "help"|*)
    show_help
    ;;
esac