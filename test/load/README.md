# Load Testing con Artillery

Este directorio contiene configuraciones de Artillery para simular múltiples visitantes en la aplicación Guiders.

## Instalación

Primero, instala Artillery globalmente:

```bash
npm install -g artillery
```

## Archivos de Configuración

### 1. `load-test.yml`
Prueba de carga normal con escalamiento gradual:
- 30s con 2 usuarios/segundo
- 60s con 5 usuarios/segundo  
- 30s con 10 usuarios/segundo

### 2. `stress-test.yml`
Prueba de estrés con alta carga:
- 60s con 20 usuarios/segundo
- 120s con 50 usuarios/segundo
- 60s con 100 usuarios/segundo

### 3. `custom-functions.js`
Funciones personalizadas para generar datos realistas:
- IDs únicos de visitantes y sesiones
- User-Agents diversos
- Simulación de diferentes dispositivos
- Datos de tracking realistas

## Uso

### Prueba de Carga Normal
```bash
cd test/load
artillery run load-test.yml
```

### Prueba de Estrés
```bash
cd test/load
artillery run stress-test.yml
```

### Con Reporte HTML
```bash
artillery run load-test.yml --output report.json
artillery report report.json
```

### Con Debug
```bash
ARTILLERY_DEBUG=true artillery run load-test.yml
```

## Monitoreo

Durante las pruebas, monitorea:

1. **Logs del servidor**: `npm run start:dev`
2. **Uso de CPU/memoria**: `top` o `htop`
3. **Conexiones de red**: `netstat -an | grep 8080`
4. **Logs de base de datos**: Si usas PostgreSQL/MongoDB

## Métricas Importantes

Artillery reportará:
- **RPS (Requests per Second)**: Requests por segundo
- **Latencia**: Tiempo de respuesta promedio
- **Throughput**: Datos transferidos
- **Errores**: Requests fallidos
- **Códigos de estado**: Distribución de respuestas HTTP

## Configuración del Servidor

Antes de ejecutar las pruebas:

1. **Inicia el servidor**:
```bash
npm run start:dev
```

2. **Verifica que esté corriendo**:
```bash
curl http://localhost:8080/api/health
```

3. **Opcional - Limpiar base de datos**:
```bash
node bin/guiders-cli.js clean-database --force
```

## Personalización

### Cambiar Target
Modifica el `target` en los archivos YAML:
```yaml
config:
  target: http://localhost:8080  # Cambiar aquí
```

### Ajustar Carga
Modifica `arrivalRate` y `duration`:
```yaml
phases:
  - duration: 60    # 60 segundos
    arrivalRate: 10  # 10 usuarios por segundo
```

### Agregar Nuevos Endpoints
En la sección `scenarios > flow`:
```yaml
- get:
    url: "/api/nuevo-endpoint"
    headers:
      Accept: "application/json"
```

## Troubleshooting

### Puerto Ocupado
Si el puerto 8080 está ocupado:
```bash
lsof -i :8080
kill -9 <PID>
```

### Timeout Errors
Aumenta el timeout en la configuración:
```yaml
config:
  http:
    timeout: 30  # segundos
```

### Límite de Archivos Abiertos
En macOS/Linux:
```bash
ulimit -n 65536
```

## Ejemplos de Resultados

### Resultado Exitoso
```
All virtual users finished
Summary report @ 14:30:25(+0100) 2025-01-15

Scenarios launched:  1500
Scenarios completed: 1500
Requests completed:  6000
Response time (msec):
  min: 12
  max: 847
  median: 45.2
  p95: 156.7
  p99: 289.4

Scenario counts:
  Simular visitantes navegando el sitio: 1500 (100%)

Codes:
  200: 5850
  404: 150
```

### Resultado con Problemas
```
Errors:
  ETIMEDOUT: 45
  ECONNRESET: 12
  
Response time (msec):
  p95: 2547.3  # Muy alto
  p99: 5832.1  # Muy alto
```

## Consejos

1. **Empezar gradual**: Usa `load-test.yml` antes que `stress-test.yml`
2. **Monitorear recursos**: Vigila CPU/memoria durante las pruebas
3. **Interpretar resultados**: Un p95 < 200ms es bueno para aplicaciones web
4. **Escalar progresivamente**: Aumenta la carga gradualmente
5. **Documentar resultados**: Guarda reportes para comparar mejoras
