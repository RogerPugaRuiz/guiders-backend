#!/bin/bash

# Script para probar el escenario de rechazo de consentimiento
# Verifica que el backend maneje correctamente cuando un visitante rechaza el consentimiento

set -e

echo "🧪 Prueba: Escenario de Rechazo de Consentimiento"
echo "================================================"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuración
API_URL="http://localhost:3000"
DOMAIN="landing.mytech.com"
API_KEY="ak_live_1234567890"  # Usar API key de prueba
FINGERPRINT="fp_rejection_test_$(date +%s)"

echo "📋 Configuración:"
echo "  - API URL: $API_URL"
echo "  - Domain: $DOMAIN"
echo "  - Fingerprint: $FINGERPRINT"
echo ""

# ========================================
# TEST 1: Escenario de RECHAZO
# ========================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 1: Visitante RECHAZA el consentimiento"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "➡️  Enviando solicitud con hasAcceptedPrivacyPolicy: false"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/visitors/identify" \
  -H "Content-Type: application/json" \
  -d "{
    \"fingerprint\": \"$FINGERPRINT\",
    \"domain\": \"$DOMAIN\",
    \"apiKey\": \"$API_KEY\",
    \"hasAcceptedPrivacyPolicy\": false,
    \"currentUrl\": \"https://$DOMAIN/home\",
    \"ipAddress\": \"192.168.1.100\",
    \"userAgent\": \"Mozilla/5.0 Test\"
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

echo "📥 Respuesta HTTP: $HTTP_CODE"
echo "📦 Body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

# Verificar que retorna HTTP 400 (BadRequest)
if [ "$HTTP_CODE" == "400" ]; then
  echo -e "${GREEN}✅ CORRECTO: HTTP 400 BadRequest${NC}"
else
  echo -e "${RED}❌ ERROR: Se esperaba HTTP 400, pero se obtuvo HTTP $HTTP_CODE${NC}"
  exit 1
fi

# Extraer datos del error response
VISITOR_ID=$(echo "$BODY" | jq -r '.visitorId // empty')
SESSION_ID=$(echo "$BODY" | jq -r '.sessionId // empty')
CONSENT_STATUS=$(echo "$BODY" | jq -r '.consentStatus // empty')
LIFECYCLE=$(echo "$BODY" | jq -r '.lifecycle // empty')
IS_NEW_VISITOR=$(echo "$BODY" | jq -r '.isNewVisitor // empty')
ALLOWED_ACTIONS=$(echo "$BODY" | jq -r '.allowedActions // empty')

echo ""
echo "📊 Datos extraídos del response:"
echo "  - visitorId: $VISITOR_ID"
echo "  - sessionId: $SESSION_ID"
echo "  - consentStatus: $CONSENT_STATUS"
echo "  - lifecycle: $LIFECYCLE"
echo "  - isNewVisitor: $IS_NEW_VISITOR"
echo "  - allowedActions: $ALLOWED_ACTIONS"
echo ""

# Verificaciones
ERRORS=0

# 1. Verificar que se creó un visitante
if [ -n "$VISITOR_ID" ] && [ "$VISITOR_ID" != "null" ]; then
  echo -e "${GREEN}✅ CORRECTO: Se creó un visitante anónimo${NC}"
else
  echo -e "${RED}❌ ERROR: No se creó visitorId${NC}"
  ERRORS=$((ERRORS + 1))
fi

# 2. Verificar que NO se creó sesión
if [ "$SESSION_ID" == "null" ] || [ -z "$SESSION_ID" ]; then
  echo -e "${GREEN}✅ CORRECTO: No se creó sesión (sessionId es null)${NC}"
else
  echo -e "${RED}❌ ERROR: Se creó una sesión cuando no debería (sessionId=$SESSION_ID)${NC}"
  ERRORS=$((ERRORS + 1))
fi

# 3. Verificar consentStatus
if [ "$CONSENT_STATUS" == "denied" ]; then
  echo -e "${GREEN}✅ CORRECTO: consentStatus = 'denied'${NC}"
else
  echo -e "${RED}❌ ERROR: consentStatus debería ser 'denied', pero es '$CONSENT_STATUS'${NC}"
  ERRORS=$((ERRORS + 1))
fi

# 4. Verificar lifecycle
if [ "$LIFECYCLE" == "anon" ]; then
  echo -e "${GREEN}✅ CORRECTO: lifecycle = 'anon'${NC}"
else
  echo -e "${RED}❌ ERROR: lifecycle debería ser 'anon', pero es '$LIFECYCLE'${NC}"
  ERRORS=$((ERRORS + 1))
fi

# 5. Verificar isNewVisitor
if [ "$IS_NEW_VISITOR" == "true" ]; then
  echo -e "${GREEN}✅ CORRECTO: isNewVisitor = true${NC}"
else
  echo -e "${RED}❌ ERROR: isNewVisitor debería ser true, pero es '$IS_NEW_VISITOR'${NC}"
  ERRORS=$((ERRORS + 1))
fi

# 6. Verificar allowedActions
if echo "$ALLOWED_ACTIONS" | grep -q "read_only"; then
  echo -e "${GREEN}✅ CORRECTO: allowedActions contiene 'read_only'${NC}"
else
  echo -e "${RED}❌ ERROR: allowedActions debería incluir 'read_only', pero es '$ALLOWED_ACTIONS'${NC}"
  ERRORS=$((ERRORS + 1))
fi

echo ""

# Verificar en MongoDB que se registró el rechazo
if [ -n "$VISITOR_ID" ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Verificando MongoDB: Registro de consentimiento DENIED"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  MONGO_RESULT=$(mongosh mongodb://admin:password@localhost:27017/guiders --authenticationDatabase admin --quiet --eval "
    db.visitor_consents.find({ visitorId: '$VISITOR_ID' }).toArray()
  " 2>/dev/null || echo "[]")

  echo "📦 Consents en MongoDB:"
  echo "$MONGO_RESULT" | jq '.' 2>/dev/null || echo "$MONGO_RESULT"
  echo ""

  # Verificar que existe el consent con status 'denied'
  CONSENT_COUNT=$(echo "$MONGO_RESULT" | jq 'length' 2>/dev/null || echo "0")
  if [ "$CONSENT_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ CORRECTO: Se encontró $CONSENT_COUNT registro(s) de consentimiento${NC}"

    STATUS_DENIED=$(echo "$MONGO_RESULT" | jq -r '.[0].status' 2>/dev/null || echo "")
    if [ "$STATUS_DENIED" == "denied" ]; then
      echo -e "${GREEN}✅ CORRECTO: El consentimiento tiene status 'denied'${NC}"
    else
      echo -e "${RED}❌ ERROR: El consentimiento debería tener status 'denied', pero tiene '$STATUS_DENIED'${NC}"
      ERRORS=$((ERRORS + 1))
    fi
  else
    echo -e "${RED}❌ ERROR: No se encontró ningún registro de consentimiento en MongoDB${NC}"
    ERRORS=$((ERRORS + 1))
  fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ========================================
# TEST 2: Escenario de ACEPTACIÓN (para comparar)
# ========================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 2: Visitante ACEPTA el consentimiento (control)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

FINGERPRINT_ACCEPT="fp_acceptance_test_$(date +%s)"
echo "➡️  Enviando solicitud con hasAcceptedPrivacyPolicy: true"

RESPONSE2=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/visitors/identify" \
  -H "Content-Type: application/json" \
  -d "{
    \"fingerprint\": \"$FINGERPRINT_ACCEPT\",
    \"domain\": \"$DOMAIN\",
    \"apiKey\": \"$API_KEY\",
    \"hasAcceptedPrivacyPolicy\": true,
    \"currentUrl\": \"https://$DOMAIN/home\",
    \"ipAddress\": \"192.168.1.101\",
    \"userAgent\": \"Mozilla/5.0 Test\"
  }")

HTTP_CODE2=$(echo "$RESPONSE2" | tail -n1)
BODY2=$(echo "$RESPONSE2" | head -n-1)

echo "📥 Respuesta HTTP: $HTTP_CODE2"
echo "📦 Body:"
echo "$BODY2" | jq '.' 2>/dev/null || echo "$BODY2"
echo ""

# Verificar que retorna HTTP 200 (OK)
if [ "$HTTP_CODE2" == "200" ]; then
  echo -e "${GREEN}✅ CORRECTO: HTTP 200 OK${NC}"
else
  echo -e "${RED}❌ ERROR: Se esperaba HTTP 200, pero se obtuvo HTTP $HTTP_CODE2${NC}"
  ERRORS=$((ERRORS + 1))
fi

# Extraer datos
VISITOR_ID2=$(echo "$BODY2" | jq -r '.visitorId // empty')
SESSION_ID2=$(echo "$BODY2" | jq -r '.sessionId // empty')
CONSENT_STATUS2=$(echo "$BODY2" | jq -r '.consentStatus // empty')
ALLOWED_ACTIONS2=$(echo "$BODY2" | jq -r '.allowedActions // empty')

echo ""
echo "📊 Datos extraídos:"
echo "  - visitorId: $VISITOR_ID2"
echo "  - sessionId: $SESSION_ID2"
echo "  - consentStatus: $CONSENT_STATUS2"
echo "  - allowedActions: $ALLOWED_ACTIONS2"
echo ""

# Verificaciones
if [ -n "$SESSION_ID2" ] && [ "$SESSION_ID2" != "null" ]; then
  echo -e "${GREEN}✅ CORRECTO: Se creó una sesión (sessionId presente)${NC}"
else
  echo -e "${RED}❌ ERROR: No se creó sessionId${NC}"
  ERRORS=$((ERRORS + 1))
fi

if [ "$CONSENT_STATUS2" == "granted" ]; then
  echo -e "${GREEN}✅ CORRECTO: consentStatus = 'granted'${NC}"
else
  echo -e "${RED}❌ ERROR: consentStatus debería ser 'granted', pero es '$CONSENT_STATUS2'${NC}"
  ERRORS=$((ERRORS + 1))
fi

if echo "$ALLOWED_ACTIONS2" | grep -q "chat"; then
  echo -e "${GREEN}✅ CORRECTO: allowedActions incluye acciones completas (chat)${NC}"
else
  echo -e "${RED}❌ ERROR: allowedActions debería incluir 'chat', pero es '$ALLOWED_ACTIONS2'${NC}"
  ERRORS=$((ERRORS + 1))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ========================================
# RESUMEN FINAL
# ========================================
echo ""
echo "════════════════════════════════════════════════════════════"
echo "                    RESUMEN DE PRUEBAS"
echo "════════════════════════════════════════════════════════════"
echo ""

if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}✅✅✅ TODAS LAS PRUEBAS PASARON EXITOSAMENTE ✅✅✅${NC}"
  echo ""
  echo "✓ Rechazo de consentimiento funciona correctamente"
  echo "✓ Se crea visitante anónimo sin sesión cuando se rechaza"
  echo "✓ Se registra el rechazo en MongoDB con status 'denied'"
  echo "✓ Se retorna HTTP 400 con información estructurada"
  echo "✓ Aceptación de consentimiento sigue funcionando (HTTP 200)"
  echo ""
  exit 0
else
  echo -e "${RED}❌❌❌ SE ENCONTRARON $ERRORS ERROR(ES) ❌❌❌${NC}"
  echo ""
  exit 1
fi
