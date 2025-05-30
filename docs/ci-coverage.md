# Configuración de Cobertura de Código en CI

Este documento describe la configuración implementada para verificar automáticamente la cobertura de código en el pipeline de CI.

## Configuración Implementada

El pipeline de CI incluye un job específico llamado `check-coverage` que verifica que la cobertura de código cumpla con los requisitos mínimos establecidos:

1. Los tests unitarios generan reportes de cobertura en formato LCOV y texto plano.
2. El job `check-coverage` descarga estos reportes y verifica que la cobertura total sea igual o superior al 80%.
3. Si la cobertura es inferior al 80%, el workflow fallará.

## Archivos de Configuración

- `.github/workflows/ci.yml`: Contiene la configuración del workflow de CI, incluyendo el job de cobertura.
- `src/scripts/ensure-coverage-dir.js`: Script que asegura que exista la carpeta de coverage para evitar errores en el pipeline.

## Cómo Ejecutar Localmente

Para ejecutar los tests con cobertura localmente:

```bash
# Tests unitarios con cobertura
npm run test:unit -- --coverage

# Tests de integración con cobertura
npm run test:int -- --coverage

# Verificar umbral de cobertura (después de ejecutar los tests)
npm run test:check-coverage
```

Para visualizar el reporte de cobertura, abre el archivo `coverage/lcov-report/index.html` en un navegador.

## Umbral de Cobertura

- El umbral mínimo de cobertura establecido es del 80%.
- Se evalúa el porcentaje de cobertura de líneas de código.
- El reporte de cobertura se muestra en los checks de GitHub Actions.

## Archivos Excluidos

Se han excluido del análisis de cobertura:
- Archivos generados automáticamente

## Mejoras Futuras

Posibles mejoras para el sistema de cobertura de código:

- Implementar umbrales específicos por módulo/directorio
- Configurar reporte de cobertura como comentario en PRs
- Agregar badges de cobertura en el README