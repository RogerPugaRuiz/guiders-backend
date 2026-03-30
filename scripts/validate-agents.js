#!/usr/bin/env node

/**
 * Validador de documentación AGENTS.md
 * Asegura que cada contexto tenga documentación completa y vinculada
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const CONTEXTS_PATH = path.join(PROJECT_ROOT, 'src', 'context');
const ROOT_AGENTS = path.join(PROJECT_ROOT, 'AGENTS.md');

// Contextos que deben tener AGENTS.md
const REQUIRED_CONTEXTS = [
  'auth',
  'company',
  'shared',
  'conversations-v2',
  'visitors-v2',
  'tracking-v2',
  'leads',
  'llm',
  'commercial',
  'white-label',
  'consent',
  'lead-scoring',
  // Legacy contexts (optional but recommended)
  'conversations',
  'visitors',
];

// Secciones requeridas en cada AGENTS.md de contexto
const REQUIRED_SECTIONS = [
  '# AGENTS.md',
  '## Context Overview',
  '## Testing Strategy',
  '## Related Documentation',
  'Parent documentation',
];

// Secciones específicas por contexto
const CONTEXT_SPECIFIC_SECTIONS = {
  shared: ['## Result Pattern', '## Domain Events', '## Value Objects'],
  llm: ['## Overview', '## Integration Points'],
  commercial: ['## Overview', '## Integration Points'],
  'white-label': ['## Overview', '## Integration Points'],
  consent: ['## Overview', '## Integration Points'],
  'lead-scoring': ['## Overview', '## Integration Points'],
  conversations: ['DEPRECATED'],
  visitors: ['DEPRECATED'],
};

// Secciones optionales pero recomendadas
const RECOMMENDED_SECTIONS = [
  '## Database Schema',
  '## Integration Points',
  '## Security Guidelines',
  '## Performance Considerations',
  '## Common Patterns',
  '## Known Limitations',
  '## Future Enhancements',
  '## Troubleshooting',
];

class AgentsValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.contextDocs = {};
  }

  // Valida la existencia y estructura del AGENTS.md raíz
  validateRootAgents() {
    console.log('Validando AGENTS.md raíz...');

    if (!fs.existsSync(ROOT_AGENTS)) {
      this.errors.push('❌ AGENTS.md raíz no existe');
      return;
    }

    const content = fs.readFileSync(ROOT_AGENTS, 'utf-8');

    // Verificar que referencia a todos los contextos
    const referencedContexts = REQUIRED_CONTEXTS.filter((ctx) => {
      const docPath = `./src/context/${ctx}/AGENTS.md`;
      return content.includes(docPath);
    });

    if (referencedContexts.length === 0) {
      this.errors.push(
        '❌ AGENTS.md raíz no referencia ningún AGENTS.md de contexto',
      );
    } else if (referencedContexts.length < REQUIRED_CONTEXTS.length) {
      const missing = REQUIRED_CONTEXTS.filter(
        (ctx) => !referencedContexts.includes(ctx),
      );
      this.warnings.push(
        `⚠️  AGENTS.md raíz no referencia: ${missing.join(', ')}`,
      );
    } else {
      console.log('✅ AGENTS.md raíz referencia todos los contextos');
    }

    // Verificar sección de navegación
    if (!content.includes('## How to Navigate This Documentation')) {
      this.warnings.push('⚠️  AGENTS.md raíz falta sección "How to Navigate"');
    }
  }

  // Valida cada contexto
  validateContextAgents(contextName) {
    const contextPath = path.join(CONTEXTS_PATH, contextName);
    const agentsPath = path.join(contextPath, 'AGENTS.md');

    if (!fs.existsSync(contextPath)) {
      return; // Skip non-existent contexts
    }

    if (!fs.existsSync(agentsPath)) {
      this.errors.push(`❌ ${contextName}: AGENTS.md no existe`);
      return;
    }

    const content = fs.readFileSync(agentsPath, 'utf-8');
    const missingRequired = [];
    const missingSections = [];

    // Verificar secciones requeridas
    for (const section of REQUIRED_SECTIONS) {
      if (!content.includes(section)) {
        missingRequired.push(section);
      }
    }

    // Verificar secciones específicas del contexto
    if (CONTEXT_SPECIFIC_SECTIONS[contextName]) {
      const contextSections = CONTEXT_SPECIFIC_SECTIONS[contextName];
      let hasContextSection = false;
      for (const section of contextSections) {
        if (content.includes(section)) {
          hasContextSection = true;
          break;
        }
      }
      if (!hasContextSection && contextName !== 'shared') {
        missingRequired.push(
          `Context-specific content (${contextSections.join(' or ')})`,
        );
      }
    }

    if (missingRequired.length > 0) {
      this.errors.push(
        `❌ ${contextName}: Falta secciones requeridas:\n   ${missingRequired.join('\n   ')}`,
      );
    }

    // Verificar secciones recomendadas
    for (const section of RECOMMENDED_SECTIONS) {
      if (!content.includes(section)) {
        missingSections.push(section);
      }
    }

    if (missingSections.length > 0) {
      this.warnings.push(
        `⚠️  ${contextName}: Falta secciones recomendadas: ${missingSections.join(', ')}`,
      );
    }

    // Verificar que vincula al AGENTS.md raíz
    if (
      !content.includes('Root AGENTS.md') &&
      !content.includes('AGENTS.md - Guiders Backend')
    ) {
      this.warnings.push(`⚠️  ${contextName}: No vincula al AGENTS.md raíz`);
    }

    this.contextDocs[contextName] = {
      exists: true,
      hasRequired: missingRequired.length === 0,
      hasRecommended: missingSections.length === 0,
    };
  }

  // Valida integridad de enlaces
  validateLinks() {
    console.log('\nValidando enlaces cruzados...');

    for (const contextName of REQUIRED_CONTEXTS) {
      const contextPath = path.join(CONTEXTS_PATH, contextName);
      const agentsPath = path.join(contextPath, 'AGENTS.md');

      if (!fs.existsSync(agentsPath)) continue;

      const content = fs.readFileSync(agentsPath, 'utf-8');

      // Buscar referencias a otros contextos
      const references =
        content.match(/\[([^\]]+)\]\(\.\.\/([^/]+)\/AGENTS\.md\)/g) || [];
      for (const ref of references) {
        const match = ref.match(/\.\.\/([\w-]+)\/AGENTS\.md/);
        if (match) {
          const refContext = match[1];
          const refPath = path.join(CONTEXTS_PATH, refContext, 'AGENTS.md');

          if (!fs.existsSync(refPath)) {
            this.errors.push(
              `❌ ${contextName}: Referencia a ${refContext}/AGENTS.md pero no existe`,
            );
          }
        }
      }
    }
  }

  // Genera reporte HTML
  generateReport() {
    const timestamp = new Date().toISOString();
    const PROJECT_ROOT = path.resolve(__dirname, '..');
    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reporte de Validación AGENTS.md</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
    h1 { color: #333; border-bottom: 3px solid #0066cc; padding-bottom: 10px; }
    h2 { color: #0066cc; margin-top: 30px; }
    .error { color: #d32f2f; background: #ffebee; padding: 10px; border-radius: 4px; margin: 5px 0; border-left: 4px solid #d32f2f; }
    .warning { color: #f57c00; background: #fff3e0; padding: 10px; border-radius: 4px; margin: 5px 0; border-left: 4px solid #f57c00; }
    .success { color: #388e3c; background: #e8f5e9; padding: 10px; border-radius: 4px; margin: 5px 0; border-left: 4px solid #388e3c; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #0066cc; color: white; }
    tr:hover { background: #f9f9f9; }
    .status-ok { color: #388e3c; font-weight: bold; }
    .status-missing { color: #d32f2f; font-weight: bold; }
    .summary { background: #f0f7ff; padding: 15px; border-radius: 4px; margin: 20px 0; }
    .timestamp { color: #666; font-size: 0.9em; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📋 Reporte de Validación AGENTS.md</h1>
    
    <div class="summary">
      <strong>Resumen:</strong>
      <ul>
        <li>Errores: <span class="status-missing">${this.errors.length}</span></li>
        <li>Advertencias: <span class="status-missing">${this.warnings.length}</span></li>
        <li>Contextos documentados: <span class="status-ok">${Object.keys(this.contextDocs).filter((k) => this.contextDocs[k].exists).length} / ${REQUIRED_CONTEXTS.length}</span></li>
      </ul>
    </div>

    ${
      this.errors.length > 0
        ? `
    <h2>❌ Errores</h2>
    ${this.errors.map((e) => `<div class="error">${e}</div>`).join('')}
    `
        : '<div class="success">✅ No hay errores</div>'
    }

    ${
      this.warnings.length > 0
        ? `
    <h2>⚠️  Advertencias</h2>
    ${this.warnings.map((w) => `<div class="warning">${w}</div>`).join('')}
    `
        : '<div class="success">✅ No hay advertencias</div>'
    }

    <h2>📊 Estado por Contexto</h2>
    <table>
      <thead>
        <tr>
          <th>Contexto</th>
          <th>AGENTS.md</th>
          <th>Secciones Requeridas</th>
          <th>Secciones Recomendadas</th>
        </tr>
      </thead>
      <tbody>
        ${REQUIRED_CONTEXTS.map((ctx) => {
          const doc = this.contextDocs[ctx];
          const exists = doc ? '✅ Existe' : '❌ Falta';
          const required =
            doc && doc.hasRequired ? '✅' : doc ? '⚠️  Incompleto' : '-';
          const recommended =
            doc && doc.hasRecommended ? '✅' : doc ? '⚠️  Incompleto' : '-';
          return `
          <tr>
            <td><strong>${ctx}</strong></td>
            <td>${exists}</td>
            <td>${required}</td>
            <td>${recommended}</td>
          </tr>
          `;
        }).join('')}
      </tbody>
    </table>

    <div class="timestamp">
      Generado: ${timestamp}
    </div>
  </div>
</body>
</html>
    `.trim();

    const reportPath = path.join(PROJECT_ROOT, 'AGENTS-VALIDATION-REPORT.html');
    fs.writeFileSync(reportPath, html);
    console.log(`\n📄 Reporte generado en: ${reportPath}`);
  }

  // Ejecuta validación completa
  run() {
    console.log('🔍 Iniciando validación de documentación AGENTS.md...\n');

    this.validateRootAgents();

    console.log('\nValidando contextos...');
    for (const ctx of REQUIRED_CONTEXTS) {
      this.validateContextAgents(ctx);
    }

    this.validateLinks();

    // Resultado
    console.log('\n' + '='.repeat(60));
    if (this.errors.length > 0) {
      console.log(`\n❌ ERRORES (${this.errors.length}):`);
      this.errors.forEach((e) => console.log(`  ${e}`));
    }

    if (this.warnings.length > 0) {
      console.log(`\n⚠️  ADVERTENCIAS (${this.warnings.length}):`);
      this.warnings.forEach((w) => console.log(`  ${w}`));
    }

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log(
        '\n✅ ¡Validación exitosa! Toda la documentación está en orden.',
      );
    }

    console.log('\n' + '='.repeat(60));
    this.generateReport();

    // Exit con código de error si hay problemas
    process.exit(this.errors.length > 0 ? 1 : 0);
  }
}

// Ejecutar
const validator = new AgentsValidator();
validator.run();
