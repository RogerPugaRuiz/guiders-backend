# Load Testing en Producción

Este directorio contiene herramientas para ejecutar pruebas de carga directamente en el servidor de producción.

## ⚠️ Importante

Estas pruebas están diseñadas para ejecutarse **DESDE el servidor de producción**, no desde un cliente externo. Esto permite:

- Evitar limitaciones de red externa
- Probar el rendimiento real del servidor
- Reducir variables de latencia de red
- Simular carga interna del sistema

## Archivos Disponibles

### Configuraciones de Prueba
- `production-load-test.yml` - Prueba normal (2-8 usuarios/segundo)
- `production-stress-test.yml` - Prueba de estrés (10-30 usuarios/segundo)
- `simple-test.yml` - Prueba suave (1 usuario/segundo)
- `custom-functions.js` - Funciones para generar datos realistas

### Scripts
- `run-production-load-tests.sh` - Script principal para ejecutar pruebas
- `run-load-tests.sh` - Script original para desarrollo local

## Instalación en Producción

El workflow de GitHub Actions automáticamente copia estos archivos al servidor en:
```
/var/www/guiders-backend/load-tests/
```

## Uso en Producción

### 1. Conectarse al servidor
```bash
ssh usuario@servidor-produccion
cd /var/www/guiders-backend/load-tests/
```

### 2. Ejecutar pruebas
```bash
# Prueba suave (recomendado para empezar)
./run-production-load-tests.sh simple

# Prueba normal
./run-production-load-tests.sh normal

# Prueba de estrés (usar con precaución)
./run-production-load-tests.sh stress

# Monitoreo continuo por 5 minutos
./run-production-load-tests.sh monitor
```

### 3. Ver ayuda
```bash
./run-production-load-tests.sh --help
```

## Monitoreo Durante las Pruebas

### Recursos del Sistema
```bash
# En otra terminal SSH
htop                    # Monitorear CPU y memoria
iostat -x 1            # Monitorear I/O de disco
pm2 logs guiders-backend # Ver logs de la aplicación
```

### Base de Datos
```bash
# PostgreSQL
docker exec postgres-prod psql -U usuario -d database -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"

# MongoDB
docker exec mongodb-prod mongosh --eval "db.currentOp()"
```

## Interpretación de Resultados

### Métricas Importantes
- **Response time p95**: < 500ms es bueno
- **Response time p99**: < 1000ms es aceptable
- **Errors**: < 1% es ideal
- **RPS**: Requests por segundo manejados

### Códigos de Estado Esperados
- **200**: Respuestas exitosas
- **401**: Sin autenticación (normal para algunos endpoints)
- **404**: Endpoints no encontrados (verificar configuración)
- **5xx**: Errores del servidor (requieren investigación)

## Configuración de Pruebas

### Ajustar Carga
Modifica los archivos `.yml` para cambiar la intensidad:

```yaml
config:
  target: http://localhost:3000
  phases:
    - duration: 60    # Duración en segundos
      arrivalRate: 5  # Usuarios por segundo
```

### Agregar Endpoints
Añade nuevos endpoints a probar:

```yaml
scenarios:
  - name: "Nuevo endpoint"
    flow:
      - get:
          url: "/api/nuevo-endpoint"
          expect:
            - statusCode: 200
```

## Buenas Prácticas

### Antes de Ejecutar
1. **Verificar horario**: Ejecutar en horarios de baja actividad
2. **Notificar al equipo**: Informar sobre las pruebas
3. **Backup**: Asegurar que hay backups recientes
4. **Monitoreo**: Preparar herramientas de monitoreo

### Durante las Pruebas
1. **Monitorear recursos**: CPU, memoria, disco
2. **Vigilar logs**: Buscar errores o warnings
3. **Preparar rollback**: Estar listo para detener si es necesario
4. **Documentar**: Registrar configuración y resultados

### Después de las Pruebas
1. **Analizar reportes**: Revisar métricas y identificar cuellos de botella
2. **Verificar logs**: Buscar errores que no aparecieron en las métricas
3. **Limpiar**: Eliminar archivos temporales de reportes antiguos
4. **Documentar**: Guardar hallazgos para futuras referencias

## Troubleshooting

### Error: "Application not responding"
```bash
pm2 list                    # Verificar estado de la aplicación
pm2 restart guiders-backend # Reiniciar si es necesario
pm2 logs guiders-backend    # Ver logs de error
```

### Error: "Artillery not found"
```bash
npm install -g artillery    # Instalar Artillery
```

### Errores 5xx en las pruebas
```bash
pm2 logs guiders-backend --lines 100  # Ver logs recientes
docker logs postgres-prod             # Verificar base de datos
docker logs mongodb-prod              # Verificar MongoDB
```

### Alto uso de memoria
```bash
pm2 restart guiders-backend  # Reiniciar aplicación
docker restart postgres-prod # Reiniciar PostgreSQL si es necesario
```

## Límites Recomendados

### Pruebas Seguras
- **simple**: 1 usuario/segundo - Siempre seguro
- **normal**: 2-8 usuarios/segundo - Seguro en horarios normales
- **stress**: 10-30 usuarios/segundo - Solo en horarios de mantenimiento

### Señales de Alerta
- Response time p95 > 1000ms
- Error rate > 5%
- CPU > 80% por más de 5 minutos
- Memoria > 90%

## Automatización

### Cron Jobs para Monitoreo
```bash
# Ejecutar monitoreo diario a las 3 AM
0 3 * * * cd /var/www/guiders-backend/load-tests/ && ./run-production-load-tests.sh monitor >> /var/log/load-test-monitor.log 2>&1
```

### Alertas
Considera integrar con sistemas de alertas para notificar sobre:
- Degradación de rendimiento
- Aumento de errores
- Uso excesivo de recursos
