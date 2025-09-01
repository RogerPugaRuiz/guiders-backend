#!/bin/bash

# Script para ejecutar pruebas de carga con Artillery
# Uso: ./run-load-tests.sh [simple|normal|stress]

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar que Artillery esté instalado
if ! command -v artillery &> /dev/null; then
    echo -e "${RED}Artillery no está instalado. Instalando...${NC}"
    npm install -g artillery
fi

# Verificar que el servidor esté corriendo
echo -e "${YELLOW}Verificando que el servidor esté corriendo en localhost:8080...${NC}"
if ! curl -s http://localhost:8080/api/health > /dev/null; then
    echo -e "${RED}Error: El servidor no está corriendo en localhost:8080${NC}"
    echo -e "${YELLOW}Ejecuta: npm run start:dev${NC}"
    exit 1
fi

echo -e "${GREEN}Servidor encontrado y funcionando${NC}"

# Determinar qué prueba ejecutar
TEST_TYPE=${1:-simple}

case $TEST_TYPE in
    "simple")
        echo -e "${YELLOW}Ejecutando prueba simple (1 usuario/segundo por 30s)...${NC}"
        artillery run simple-test.yml
        ;;
    "normal")
        echo -e "${YELLOW}Ejecutando prueba normal (escalamiento gradual)...${NC}"
        artillery run load-test.yml
        ;;
    "stress")
        echo -e "${YELLOW}Ejecutando prueba de estrés (alta carga)...${NC}"
        echo -e "${RED}¡ADVERTENCIA! Esta prueba puede sobrecargar el servidor${NC}"
        read -p "¿Continuar? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            artillery run stress-test.yml
        else
            echo -e "${YELLOW}Prueba cancelada${NC}"
            exit 0
        fi
        ;;
    "browser")
        echo -e "${YELLOW}Ejecutando simulación de navegador real...${NC}"
        artillery run browser-simulation-test.yml
        ;;
    "javascript")
        echo -e "${YELLOW}Ejecutando test con JavaScript real usando Playwright...${NC}"
        if command -v node &> /dev/null; then
            node browser-javascript-test.js
        else
            echo -e "${RED}Node.js no está instalado${NC}"
            exit 1
        fi
        ;;
    "report")
        echo -e "${YELLOW}Ejecutando prueba normal con reporte HTML...${NC}"
        artillery run load-test.yml --output report.json
        artillery report report.json
        echo -e "${GREEN}Reporte generado como report.json.html${NC}"
        ;;
    *)
        echo -e "${RED}Uso: $0 [simple|normal|stress|browser|javascript|report]${NC}"
        echo -e "${YELLOW}  simple: Prueba suave (1 usuario/segundo)${NC}"
        echo -e "${YELLOW}  normal: Prueba gradual (2-10 usuarios/segundo)${NC}"
        echo -e "${YELLOW}  stress: Prueba de estrés (20-100 usuarios/segundo)${NC}"
        echo -e "${YELLOW}  browser: Simulación de navegador con recursos${NC}"
        echo -e "${YELLOW}  javascript: Test con JavaScript real (Playwright)${NC}"
        echo -e "${YELLOW}  report: Prueba normal con reporte HTML${NC}"
        exit 1
        ;;
esac

echo -e "${GREEN}Prueba de carga completada${NC}"
