#!/bin/bash

# Script para probar el registro automático de consentimientos
# Uso: ./scripts/test-consent-registration.sh

set -e

echo "🧪 Iniciando prueba de registro de consentimientos..."
echo ""

# Variables
API_URL="http://localhost:3000"
VISITOR_ID=""
SESSION_ID=""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir con color
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 1. Identificar visitante con consentimiento
echo "================================================"
echo "1️⃣  Identificando visitante..."
echo "================================================"

RESPONSE=$(curl -s -X POST "${API_URL}/api/visitors/identify" \
  -H "Content-Type: application/json" \
  -c /tmp/guiders-cookies.txt \
  -d '{
    "fingerprint": "test_'$(date +%s)'",
    "domain": "127.0.0.1",
    "apiKey": "12ca17b49af2289436f303e0166030a21e525d266e209267433801a8fd4071a0",
    "hasAcceptedPrivacyPolicy": true,
    "consentVersion": "1.2.3-alpha.1",
    "currentUrl": "http://127.0.0.1:8083/test"
  }')

echo "$RESPONSE" | jq '.'

VISITOR_ID=$(echo "$RESPONSE" | jq -r '.visitorId')
SESSION_ID=$(echo "$RESPONSE" | jq -r '.sessionId')

if [ -z "$VISITOR_ID" ] || [ "$VISITOR_ID" == "null" ]; then
    print_error "No se pudo identificar al visitante"
    exit 1
fi

print_success "Visitante identificado: $VISITOR_ID"
print_success "Sesión creada: $SESSION_ID"
echo ""

# 2. Esperar 1 segundo para asegurar que se guardó
echo "================================================"
echo "2️⃣  Esperando 1 segundo para propagación..."
echo "================================================"
sleep 1
print_success "Espera completada"
echo ""

# 3. Consultar consentimientos
echo "================================================"
echo "3️⃣  Consultando consentimientos..."
echo "================================================"

CONSENTS=$(curl -s -X GET "${API_URL}/api/consents/visitors/${VISITOR_ID}" \
  -b /tmp/guiders-cookies.txt)

echo "$CONSENTS" | jq '.'

TOTAL=$(echo "$CONSENTS" | jq -r '.total')

if [ "$TOTAL" == "0" ]; then
    print_error "No se encontraron consentimientos registrados"
    print_warning "Revisa los logs del backend para más detalles"
    exit 1
fi

print_success "Consentimientos encontrados: $TOTAL"
echo ""

# 4. Verificar detalles del consentimiento
echo "================================================"
echo "4️⃣  Verificando detalles del consentimiento..."
echo "================================================"

CONSENT_TYPE=$(echo "$CONSENTS" | jq -r '.consents[0].consentType')
CONSENT_STATUS=$(echo "$CONSENTS" | jq -r '.consents[0].status')
CONSENT_VERSION=$(echo "$CONSENTS" | jq -r '.consents[0].version')

print_info "Tipo: $CONSENT_TYPE"
print_info "Estado: $CONSENT_STATUS"
print_info "Versión: $CONSENT_VERSION"

if [ "$CONSENT_TYPE" != "privacy_policy" ]; then
    print_error "Tipo de consentimiento incorrecto: esperado 'privacy_policy', recibido '$CONSENT_TYPE'"
    exit 1
fi

if [ "$CONSENT_STATUS" != "granted" ]; then
    print_error "Estado incorrecto: esperado 'granted', recibido '$CONSENT_STATUS'"
    exit 1
fi

if [ "$CONSENT_VERSION" != "v1.2.3-alpha.1" ]; then
    print_error "Versión incorrecta: esperado 'v1.2.3-alpha.1', recibido '$CONSENT_VERSION'"
    exit 1
fi

print_success "Todos los detalles son correctos"
echo ""

# 5. Verificar MongoDB directamente
echo "================================================"
echo "5️⃣  Verificando MongoDB directamente..."
echo "================================================"

MONGO_COUNT=$(mongosh mongodb://admin:password@localhost:27017/guiders --authenticationDatabase admin --quiet --eval "
db.visitor_consents.countDocuments({ visitorId: '$VISITOR_ID' })
")

print_info "Documentos en MongoDB: $MONGO_COUNT"

if [ "$MONGO_COUNT" -eq "0" ]; then
    print_error "No se encontró el documento en MongoDB"
    exit 1
fi

print_success "Documento encontrado en MongoDB"
echo ""

# 6. Verificar audit logs
echo "================================================"
echo "6️⃣  Verificando audit logs..."
echo "================================================"

AUDIT_LOGS=$(curl -s -X GET "${API_URL}/api/consents/visitors/${VISITOR_ID}/audit-logs" \
  -b /tmp/guiders-cookies.txt)

echo "$AUDIT_LOGS" | jq '.'

AUDIT_TOTAL=$(echo "$AUDIT_LOGS" | jq -r '.total')

if [ "$AUDIT_TOTAL" == "0" ]; then
    print_warning "No se encontraron audit logs"
else
    print_success "Audit logs encontrados: $AUDIT_TOTAL"
fi

echo ""

# Resumen final
echo "================================================"
echo "✅ TODAS LAS PRUEBAS PASARON EXITOSAMENTE"
echo "================================================"
echo ""
print_success "El registro automático de consentimientos funciona correctamente"
print_success "La normalización de versiones funciona (1.2.3-alpha.1 → v1.2.3-alpha.1)"
print_success "Los datos se persistieron correctamente en MongoDB"
echo ""

# Cleanup
rm -f /tmp/guiders-cookies.txt
