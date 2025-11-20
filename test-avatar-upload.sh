#!/bin/bash

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Test de Upload de Avatares ===${NC}\n"

# Configuración
BASE_URL="http://localhost:3000/api"
EMAIL="test1@demo.com"
PASSWORD="test1234"

# Paso 1: Login para obtener token
echo -e "${YELLOW}1. Obteniendo token JWT...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/user/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
  echo -e "${RED}✗ Error obteniendo token. Respuesta:${NC}"
  echo $LOGIN_RESPONSE
  echo -e "\n${YELLOW}NOTA: Asegúrate de tener un usuario con email '$EMAIL' y password '$PASSWORD'${NC}"
  echo -e "${YELLOW}O cambia las variables EMAIL y PASSWORD en este script.${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Token obtenido:${NC} ${ACCESS_TOKEN:0:50}..."

# Obtener ID del usuario actual
echo -e "\n${YELLOW}2. Obteniendo información del usuario...${NC}"
USER_INFO=$(curl -s -X GET "$BASE_URL/user/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

USER_ID=$(echo $USER_INFO | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$USER_ID" ]; then
  echo -e "${RED}✗ Error obteniendo user ID. Respuesta:${NC}"
  echo $USER_INFO
  exit 1
fi

echo -e "${GREEN}✓ User ID:${NC} $USER_ID"

# Paso 2: Crear una imagen de prueba (si no existe)
echo -e "\n${YELLOW}3. Preparando imagen de prueba...${NC}"
TEST_IMAGE="/tmp/test-avatar.jpg"

if [ ! -f "$TEST_IMAGE" ]; then
  # Crear una imagen simple de prueba (100x100px, rojo)
  if command -v convert &> /dev/null; then
    convert -size 100x100 xc:red "$TEST_IMAGE"
    echo -e "${GREEN}✓ Imagen de prueba creada con ImageMagick${NC}"
  elif command -v python3 &> /dev/null; then
    # Crear imagen con Python
    python3 << EOF
from PIL import Image
img = Image.new('RGB', (100, 100), color='red')
img.save('$TEST_IMAGE')
EOF
    echo -e "${GREEN}✓ Imagen de prueba creada con Python${NC}"
  else
    echo -e "${YELLOW}⚠ No se pudo crear imagen automáticamente${NC}"
    echo -e "${YELLOW}Por favor, coloca manualmente una imagen en: $TEST_IMAGE${NC}"
    echo -e "${YELLOW}O descarga una con:${NC}"
    echo "  curl -o $TEST_IMAGE https://via.placeholder.com/100/FF0000/FFFFFF?text=Test"
    exit 1
  fi
fi

echo -e "${GREEN}✓ Imagen lista:${NC} $TEST_IMAGE"

# Paso 3: Subir avatar
echo -e "\n${YELLOW}4. Subiendo avatar...${NC}"
UPLOAD_RESPONSE=$(curl -s -X POST "$BASE_URL/user/auth/$USER_ID/avatar" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "file=@$TEST_IMAGE")

echo -e "${GREEN}Respuesta del servidor:${NC}"
echo "$UPLOAD_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$UPLOAD_RESPONSE"

# Verificar si hay avatarUrl en la respuesta
AVATAR_URL=$(echo $UPLOAD_RESPONSE | grep -o '"avatarUrl":"[^"]*' | cut -d'"' -f4)

if [ -z "$AVATAR_URL" ]; then
  echo -e "\n${RED}✗ Error: No se obtuvo avatarUrl en la respuesta${NC}"
  exit 1
fi

echo -e "\n${GREEN}✓✓✓ Avatar subido exitosamente ✓✓✓${NC}"
echo -e "${GREEN}URL del avatar:${NC} $AVATAR_URL"

# Paso 4: Verificar que la URL funciona
echo -e "\n${YELLOW}5. Verificando acceso a la imagen en S3...${NC}"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$AVATAR_URL")

if [ "$HTTP_STATUS" -eq 200 ]; then
  echo -e "${GREEN}✓ Imagen accesible públicamente (HTTP $HTTP_STATUS)${NC}"
else
  echo -e "${RED}✗ Error: Imagen no accesible (HTTP $HTTP_STATUS)${NC}"
fi

# Paso 5: Verificar en base de datos
echo -e "\n${YELLOW}6. Verificando actualización en base de datos...${NC}"
UPDATED_USER=$(curl -s -X GET "$BASE_URL/user/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

DB_AVATAR_URL=$(echo $UPDATED_USER | grep -o '"avatarUrl":"[^"]*' | cut -d'"' -f4)

if [ "$DB_AVATAR_URL" = "$AVATAR_URL" ]; then
  echo -e "${GREEN}✓ Avatar URL actualizado en PostgreSQL${NC}"
else
  echo -e "${RED}✗ Avatar URL NO actualizado en PostgreSQL${NC}"
  echo "Esperado: $AVATAR_URL"
  echo "Obtenido: $DB_AVATAR_URL"
fi

# Resumen
echo -e "\n${YELLOW}=== RESUMEN ===${NC}"
echo -e "User ID: ${GREEN}$USER_ID${NC}"
echo -e "Avatar URL: ${GREEN}$AVATAR_URL${NC}"
echo -e "Accesible públicamente: ${GREEN}Sí (HTTP $HTTP_STATUS)${NC}"
echo -e "\n${GREEN}🎉 Puedes abrir la URL en tu navegador para ver la imagen:${NC}"
echo -e "${YELLOW}$AVATAR_URL${NC}"

echo -e "\n${YELLOW}=== PRUEBA COMPLETADA ===${NC}"
