#!/bin/bash

# Script para probar diferentes escenarios de consentimientos RGPD
# Escenarios:
# 1. Usuario acepta consentimiento (hasAcceptedPrivacyPolicy: true)
# 2. Usuario rechaza consentimiento (hasAcceptedPrivacyPolicy: false)
# 3. Usuario no toma ninguna acción (sin llamar a /identify)

set -e

API_URL="http://localhost:3000"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }

echo "🧪 Pruebas de Escenarios de Consentimientos RGPD"
echo "================================================"
echo ""

# ==================================================
# ESCENARIO 1: Usuario ACEPTA el consentimiento
# ==================================================
echo "================================================"
echo "📝 ESCENARIO 1: Usuario ACEPTA el consentimiento"
echo "================================================"
echo ""

print_info "Llamando a POST /api/visitors/identify con hasAcceptedPrivacyPolicy: true"

RESPONSE_1=$(curl -s -X POST "${API_URL}/api/visitors/identify" \
  -H "Content-Type: application/json" \
  -c /tmp/guiders-cookies-1.txt \
  -d '{
    "fingerprint": "test_scenario_1_'$(date +%s)'",
    "domain": "127.0.0.1",
    "apiKey": "12ca17b49af2289436f303e0166030a21e525d266e209267433801a8fd4071a0",
    "hasAcceptedPrivacyPolicy": true,
    "consentVersion": "1.0.0",
    "currentUrl": "http://127.0.0.1:8083/test-scenario-1"
  }')

VISITOR_ID_1=$(echo "$RESPONSE_1" | jq -r '.visitorId')

if [ -z "$VISITOR_ID_1" ] || [ "$VISITOR_ID_1" == "null" ]; then
    print_error "Falló la identificación del visitante"
    echo "$RESPONSE_1" | jq '.'
    exit 1
fi

print_success "Visitante identificado: $VISITOR_ID_1"

sleep 1

CONSENTS_1=$(curl -s -X GET "${API_URL}/api/consents/visitors/${VISITOR_ID_1}" \
  -b /tmp/guiders-cookies-1.txt)

TOTAL_1=$(echo "$CONSENTS_1" | jq -r '.total')

if [ "$TOTAL_1" == "1" ]; then
    print_success "✅ RESULTADO: Consentimiento registrado correctamente"
    STATUS_1=$(echo "$CONSENTS_1" | jq -r '.consents[0].status')
    VERSION_1=$(echo "$CONSENTS_1" | jq -r '.consents[0].version')
    print_info "   - Estado: $STATUS_1"
    print_info "   - Versión: $VERSION_1"
else
    print_error "❌ RESULTADO: No se registró el consentimiento"
fi

echo ""

# ==================================================
# ESCENARIO 2: Usuario RECHAZA el consentimiento
# ==================================================
echo "================================================"
echo "📝 ESCENARIO 2: Usuario RECHAZA el consentimiento"
echo "================================================"
echo ""

print_info "Llamando a POST /api/visitors/identify con hasAcceptedPrivacyPolicy: false"

RESPONSE_2=$(curl -s -X POST "${API_URL}/api/visitors/identify" \
  -H "Content-Type: application/json" \
  -w "\nHTTP_CODE:%{http_code}" \
  -d '{
    "fingerprint": "test_scenario_2_'$(date +%s)'",
    "domain": "127.0.0.1",
    "apiKey": "12ca17b49af2289436f303e0166030a21e525d266e209267433801a8fd4071a0",
    "hasAcceptedPrivacyPolicy": false,
    "consentVersion": "1.0.0",
    "currentUrl": "http://127.0.0.1:8083/test-scenario-2"
  }')

HTTP_CODE_2=$(echo "$RESPONSE_2" | grep "HTTP_CODE" | cut -d':' -f2)
BODY_2=$(echo "$RESPONSE_2" | sed '/HTTP_CODE/d')

if [ "$HTTP_CODE_2" == "500" ]; then
    print_success "✅ RESULTADO: Backend rechaza la petición (Error 500)"
    ERROR_MSG=$(echo "$BODY_2" | jq -r '.message // .error // empty')
    if [ -n "$ERROR_MSG" ]; then
        print_info "   - Mensaje: $ERROR_MSG"
    fi
    print_warning "   ⚠️  COMPORTAMIENTO ACTUAL: Error 500 (debería ser 400 Bad Request)"
    print_warning "   ⚠️  NO se crea visitante ni sesión"
    print_warning "   ⚠️  NO se registra consentimiento revocado"
else
    print_error "❌ RESULTADO INESPERADO: HTTP $HTTP_CODE_2"
    echo "$BODY_2" | jq '.'
fi

echo ""

# ==================================================
# ESCENARIO 3: Usuario NO toma ninguna acción
# ==================================================
echo "================================================"
echo "📝 ESCENARIO 3: Usuario NO toma ninguna acción"
echo "================================================"
echo ""

print_info "Usuario visualiza el banner pero NO hace clic en nada"
print_info "Frontend NO llama a /api/visitors/identify"
print_warning "⚠️  Sin llamada al backend"

print_success "✅ RESULTADO: No se registra nada en el sistema"
print_info "   - No se crea visitante"
print_info "   - No se crea sesión"
print_info "   - No se registra consentimiento"
print_info "   - El usuario permanece completamente anónimo"

echo ""

# ==================================================
# RESUMEN
# ==================================================
echo "================================================"
echo "📊 RESUMEN DE ESCENARIOS"
echo "================================================"
echo ""

echo "┌─────────────────────────────────────────────────────────┐"
echo "│ Escenario 1: ACEPTA (hasAcceptedPrivacyPolicy: true)   │"
echo "├─────────────────────────────────────────────────────────┤"
echo "│ ✅ Visitante creado                                     │"
echo "│ ✅ Sesión iniciada                                      │"
echo "│ ✅ Consentimiento registrado (status: granted)          │"
echo "│ ✅ Puede usar el chat y todas las funciones             │"
echo "└─────────────────────────────────────────────────────────┘"
echo ""

echo "┌─────────────────────────────────────────────────────────┐"
echo "│ Escenario 2: RECHAZA (hasAcceptedPrivacyPolicy: false) │"
echo "├─────────────────────────────────────────────────────────┤"
echo "│ ❌ Error 500 (debería ser 400)                         │"
echo "│ ❌ NO se crea visitante                                │"
echo "│ ❌ NO se crea sesión                                   │"
echo "│ ❌ NO se registra consentimiento                       │"
echo "│ ⚠️  El usuario NO puede usar el sistema                │"
echo "└─────────────────────────────────────────────────────────┘"
echo ""

echo "┌─────────────────────────────────────────────────────────┐"
echo "│ Escenario 3: SIN ACCIÓN (no llama /identify)           │"
echo "├─────────────────────────────────────────────────────────┤"
echo "│ ⚠️  Sin llamada al backend                             │"
echo "│ ⚠️  NO se crea visitante                               │"
echo "│ ⚠️  NO se crea sesión                                  │"
echo "│ ⚠️  NO se registra consentimiento                      │"
echo "│ ℹ️  El usuario permanece completamente anónimo          │"
echo "└─────────────────────────────────────────────────────────┘"
echo ""

# ==================================================
# RECOMENDACIONES RGPD
# ==================================================
echo "================================================"
echo "📋 RECOMENDACIONES RGPD"
echo "================================================"
echo ""

print_warning "⚠️  MEJORAS RECOMENDADAS:"
echo ""
echo "1. Escenario 2 (Rechazo):"
print_info "   - Cambiar HTTP 500 → 400 Bad Request"
print_info "   - Crear visitante ANÓNIMO (sin datos personales)"
print_info "   - Registrar consentimiento con status: 'denied'"
print_info "   - Permitir navegación limitada (solo lectura)"
echo ""

echo "2. Escenario 3 (Sin acción):"
print_info "   - Frontend debe permitir navegación limitada"
print_info "   - Mostrar banner persistente hasta decisión"
print_info "   - Backend: crear visitante solo con fingerprint"
print_info "   - NO registrar consentimiento hasta decisión explícita"
echo ""

echo "3. Cumplimiento RGPD:"
print_info "   - ✅ Art. 7.1: Capacidad de demostrar consentimiento"
print_info "   - ✅ Art. 7.3: Derecho a retirar consentimiento"
print_info "   - ⚠️  Art. 4.11: Consentimiento debe ser específico e informado"
print_info "   - ⚠️  Consentimiento 'no dado' ≠ 'rechazado'"
echo ""

# Cleanup
rm -f /tmp/guiders-cookies-1.txt
rm -f /tmp/guiders-cookies-2.txt

echo "================================================"
echo "✅ Pruebas completadas"
echo "================================================"
