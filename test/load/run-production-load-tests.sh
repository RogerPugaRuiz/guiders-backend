#!/bin/bash

# Script para ejecutar pruebas de carga en el servidor de producción
# Este script debe ejecutarse DESDE el servidor de producción
# Uso: ./run-production-load-tests.sh [test-type]

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para mostrar ayuda
show_help() {
    echo -e "${BLUE}🔧 Script de Load Testing para Producción${NC}"
    echo -e "${YELLOW}Uso: $0 [test-type]${NC}"
    echo -e ""
    echo -e "${YELLOW}Tipos de prueba disponibles:${NC}"
    echo -e "  simple    - Prueba suave (1 usuario/segundo por 30s)"
    echo -e "  normal    - Prueba normal (2-8 usuarios/segundo)"
    echo -e "  stress    - Prueba de estrés (10-30 usuarios/segundo)"
    echo -e "  monitor   - Monitoreo continuo (1 usuario/segundo por 5 min)"
    echo -e ""
    echo -e "${YELLOW}Ejemplos:${NC}"
    echo -e "  $0 simple"
    echo -e "  $0 normal"
    echo -e "  $0 stress"
    echo -e ""
    echo -e "${RED}⚠️  IMPORTANTE:${NC}"
    echo -e "  - Ejecutar solo desde el servidor de producción"
    echo -e "  - Monitorear recursos del servidor durante las pruebas"
    echo -e "  - Usar 'stress' con precaución en horarios de baja actividad"
}

# Verificar parámetros
TEST_TYPE=${1:-simple}

# Verificar que estamos en el directorio correcto
if [ ! -f "custom-functions.js" ]; then
    echo -e "${RED}Error: No se encontró custom-functions.js${NC}"
    echo -e "${YELLOW}Ejecuta este script desde el directorio /var/www/guiders-backend/load-tests/${NC}"
    exit 1
fi

# Verificar que Artillery esté instalado
if ! command -v artillery &> /dev/null; then
    echo -e "${RED}Artillery no está instalado. Instalando...${NC}"
    npm install -g artillery
fi

# Verificar que la aplicación esté corriendo
echo -e "${YELLOW}🔍 Verificando que la aplicación esté corriendo...${NC}"
if ! curl -s http://localhost:3000/api/health > /dev/null; then
    echo -e "${RED}Error: La aplicación no responde en localhost:3000${NC}"
    echo -e "${YELLOW}Verifica que PM2 esté ejecutando la aplicación:${NC}"
    echo -e "${BLUE}  pm2 list${NC}"
    echo -e "${BLUE}  pm2 restart guiders-backend${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Aplicación accesible en localhost:3000${NC}"

# Crear directorio para reportes
mkdir -p reports

# Ejecutar según el tipo de prueba
case $TEST_TYPE in
    "simple")
        echo -e "${YELLOW}🚀 Ejecutando prueba simple...${NC}"
        REPORT_FILE="reports/simple-$(date +%Y%m%d-%H%M%S).json"
        artillery run ../simple-test.yml --output $REPORT_FILE
        ;;
    
    "normal")
        echo -e "${YELLOW}🚀 Ejecutando prueba normal...${NC}"
        REPORT_FILE="reports/normal-$(date +%Y%m%d-%H%M%S).json"
        artillery run production-load-test.yml --output $REPORT_FILE
        ;;
    
    "stress")
        echo -e "${RED}⚠️  ADVERTENCIA: Prueba de estrés iniciando...${NC}"
        echo -e "${YELLOW}Esta prueba puede impactar el rendimiento del servidor${NC}"
        read -p "¿Continuar? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            REPORT_FILE="reports/stress-$(date +%Y%m%d-%H%M%S).json"
            artillery run production-stress-test.yml --output $REPORT_FILE
        else
            echo -e "${YELLOW}Prueba cancelada${NC}"
            exit 0
        fi
        ;;
    
    "monitor")
        echo -e "${YELLOW}🔄 Iniciando monitoreo continuo (5 minutos)...${NC}"
        REPORT_FILE="reports/monitor-$(date +%Y%m%d-%H%M%S).json"
        # Crear configuración temporal para monitoreo
        cat > temp-monitor.yml << EOF
config:
  target: http://localhost:3000
  phases:
    - duration: 300  # 5 minutos
      arrivalRate: 1
  processor: "./custom-functions.js"

scenarios:
  - name: "Monitoreo continuo"
    beforeRequest: "generateRandomVisitor"
    flow:
      - get:
          url: "/health"
          expect:
            - statusCode: 200
      - think: 10
      - get:
          url: "/"
          headers:
            User-Agent: "{{ userAgent }}"
          cookie:
            visitorId: "{{ visitorId }}"
      - think: 20
EOF
        artillery run temp-monitor.yml --output $REPORT_FILE
        rm temp-monitor.yml
        ;;
    
    *)
        echo -e "${RED}Tipo de prueba no válido: $TEST_TYPE${NC}"
        show_help
        exit 1
        ;;
esac

# Generar reporte HTML
echo -e "${YELLOW}📊 Generando reporte HTML...${NC}"
artillery report $REPORT_FILE

# Mostrar resumen
echo -e "\n${GREEN}✅ Prueba de carga completada${NC}"
echo -e "${BLUE}📄 Reporte JSON: $REPORT_FILE${NC}"
echo -e "${BLUE}🌐 Reporte HTML: $REPORT_FILE.html${NC}"

# Mostrar información del sistema
echo -e "\n${YELLOW}📊 Estado del sistema:${NC}"
echo -e "${BLUE}PM2 Status:${NC}"
pm2 list | grep guiders-backend || echo "No se encontró la aplicación en PM2"

echo -e "\n${BLUE}Uso de memoria:${NC}"
free -h | head -2

echo -e "\n${BLUE}Carga del sistema:${NC}"
uptime

# Sugerir próximos pasos
echo -e "\n${YELLOW}💡 Próximos pasos:${NC}"
echo -e "  - Revisar el reporte HTML para métricas detalladas"
echo -e "  - Monitorear logs de la aplicación: pm2 logs guiders-backend"
echo -e "  - Verificar logs de la base de datos si hay errores"
echo -e "  - Considerar ajustar configuraciones si hay problemas de rendimiento"
