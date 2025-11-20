#!/usr/bin/env node

/**
 * Script para validar la calidad de la documentación de API
 * Verifica que los endpoints estén bien documentados
 */

const fs = require('fs');
const path = require('path');

class DocumentationQualityChecker {
  constructor() {
    this.docsPath = path.join(__dirname, '../docs/api-ai/api-documentation.json');
    
    if (!fs.existsSync(this.docsPath)) {
      console.error('❌ No se encontró documentación. Ejecuta: npm run docs:generate-ai');
      process.exit(1);
    }
    
    this.docs = JSON.parse(fs.readFileSync(this.docsPath, 'utf-8'));
  }

  checkQuality() {
    console.log('🔍 Validando calidad de documentación API...\n');

    const results = {
      total: 0,
      perfect: 0,
      good: 0,
      needsWork: 0,
      poor: 0,
      issues: []
    };

    for (const context of this.docs.contexts) {
      for (const controller of context.controllers) {
        for (const endpoint of controller.endpoints) {
          results.total++;
          const score = this.scoreEndpoint(endpoint);
          
          if (score.total >= 9) results.perfect++;
          else if (score.total >= 7) results.good++;
          else if (score.total >= 5) results.needsWork++;
          else results.poor++;

          if (score.total < 7) {
            results.issues.push({
              endpoint: `${endpoint.method} ${endpoint.path}`,
              score: score.total,
              problems: score.problems
            });
          }
        }
      }
    }

    this.printResults(results);
    
    // Exit code basado en la calidad
    const qualityPercentage = (results.perfect + results.good) / results.total;
    if (qualityPercentage < 0.8) {
      console.log('\n❌ La calidad de documentación está por debajo del 80%. Considera mejorar la documentación.');
      process.exit(1);
    } else {
      console.log('\n✅ La calidad de documentación es aceptable.');
      process.exit(0);
    }
  }

  scoreEndpoint(endpoint) {
    const score = { total: 0, problems: [] };

    // Summary (2 puntos)
    if (endpoint.summary && endpoint.summary !== 'Sin resumen' && endpoint.summary.length >= 10) {
      score.total += 2;
    } else {
      score.problems.push('Summary vacío o muy corto');
    }

    // Description (2 puntos)
    if (endpoint.description && endpoint.description !== 'Sin descripción' && endpoint.description.length >= 20) {
      score.total += 2;
    } else {
      score.problems.push('Description vacía o muy corta');
    }

    // Autenticación bien documentada (2 puntos)
    if (endpoint.auth.required) {
      if (endpoint.auth.roles && endpoint.auth.roles.length > 0) {
        score.total += 2;
      } else {
        score.problems.push('Autenticación requerida pero roles no especificados');
      }
    } else {
      score.total += 2; // Endpoints públicos están OK
    }

    // Parámetros documentados (2 puntos)
    const pathParams = endpoint.path.match(/:(\w+)/g) || [];
    if (pathParams.length > 0) {
      if (endpoint.parameters.path && endpoint.parameters.path.length >= pathParams.length) {
        score.total += 1;
      } else {
        score.problems.push('Parámetros de path no documentados');
      }
    } else {
      score.total += 1;
    }

    // Query parameters si existen
    if (endpoint.parameters.query && endpoint.parameters.query.length > 0) {
      const hasGoodDocs = endpoint.parameters.query.every(q => 
        q.description && q.description.length >= 10
      );
      if (hasGoodDocs) {
        score.total += 1;
      } else {
        score.problems.push('Query parameters mal documentados');
      }
    } else {
      score.total += 1;
    }

    // Respuestas documentadas (2 puntos)
    if (endpoint.responses.length >= 2) {
      const hasSuccess = endpoint.responses.some(r => r.status >= 200 && r.status < 300);
      const hasError = endpoint.responses.some(r => r.status >= 400);
      
      if (hasSuccess && hasError) {
        score.total += 2;
      } else if (hasSuccess || hasError) {
        score.total += 1;
        score.problems.push('Falta documentar respuestas de éxito o error');
      } else {
        score.problems.push('Respuestas mal documentadas');
      }
    } else {
      score.problems.push('Muy pocas respuestas documentadas');
    }

    return score;
  }

  printResults(results) {
    console.log('📊 Resultados de Calidad:\n');
    
    console.log(`Total de endpoints: ${results.total}`);
    console.log(`🏆 Perfectos (9-10 puntos): ${results.perfect} (${Math.round(results.perfect / results.total * 100)}%)`);
    console.log(`✅ Buenos (7-8 puntos): ${results.good} (${Math.round(results.good / results.total * 100)}%)`);
    console.log(`⚠️  Necesitan trabajo (5-6 puntos): ${results.needsWork} (${Math.round(results.needsWork / results.total * 100)}%)`);
    console.log(`❌ Pobres (0-4 puntos): ${results.poor} (${Math.round(results.poor / results.total * 100)}%)`);

    const qualityScore = (results.perfect + results.good) / results.total;
    console.log(`\n🎯 Puntuación general: ${Math.round(qualityScore * 100)}%`);

    if (results.issues.length > 0) {
      console.log('\n🔧 Endpoints que necesitan mejoras:\n');
      
      results.issues.slice(0, 10).forEach(issue => {
        console.log(`${issue.endpoint} (${issue.score}/10 puntos):`);
        issue.problems.forEach(problem => {
          console.log(`  - ${problem}`);
        });
        console.log('');
      });

      if (results.issues.length > 10) {
        console.log(`... y ${results.issues.length - 10} endpoints más.`);
      }
    }
  }
}

// Ejecutar validación
try {
  const checker = new DocumentationQualityChecker();
  checker.checkQuality();
} catch (error) {
  console.error('❌ Error validando documentación:', error.message);
  process.exit(1);
}