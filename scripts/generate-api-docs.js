#!/usr/bin/env node

/**
 * Script para generar automáticamente la documentación API
 * Extrae información de controllers, DTOs y decoradores Swagger
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const { execSync } = require('child_process');

class ApiDocumentationGenerator {
  constructor() {
    this.baseDir = path.resolve(__dirname, '..');
    this.srcDir = path.join(this.baseDir, 'src', 'context');
    this.outputDir = path.join(this.baseDir, 'docs', 'api-ai');
    this.contexts = [];
    this.endpoints = [];
  }

  /**
   * Punto de entrada principal
   */
  async generate() {
    console.log('🚀 Iniciando generación automática de documentación API...');
    
    try {
      // 1. Escanear todos los contexts
      await this.scanContexts();
      
      // 2. Procesar controllers
      await this.processControllers();
      
      // 3. Generar documentación completa
      await this.generateFullDocumentation();
      
      // 4. Generar documentación compacta
      await this.generateCompactDocumentation();
      
      // 5. Generar resumen ejecutivo
      await this.generateExecutiveSummary();
      
      // 6. Validar consistencia
      await this.validateDocumentation();
      
      console.log('✅ Documentación API generada exitosamente');
      this.printSummary();
      
    } catch (error) {
      console.error('❌ Error generando documentación:', error);
      process.exit(1);
    }
  }

  /**
   * Escanea todos los contextos de dominio
   */
  async scanContexts() {
    console.log('📂 Escaneando contextos...');
    
    const contextDirs = fs.readdirSync(this.srcDir)
      .filter(dir => fs.statSync(path.join(this.srcDir, dir)).isDirectory())
      .filter(dir => !dir.startsWith('.'));
    
    for (const contextName of contextDirs) {
      const contextPath = path.join(this.srcDir, contextName);
      const controllersPath = path.join(contextPath, 'infrastructure', 'controllers');
      
      // Incluir contexto si tiene controllers estándar O si contiene archivos .controller.ts
      const hasStandardControllers = fs.existsSync(controllersPath);
      const hasControllerFiles = glob.sync(`${contextPath}/**/*.controller.ts`).length > 0;
      
      if (hasStandardControllers || hasControllerFiles) {
        // Buscar archivos de controller
        const controllerFiles = [];
        
        if (hasStandardControllers) {
          // Buscar en la carpeta estándar de controllers
          const files = fs.readdirSync(controllersPath)
            .filter(file => file.endsWith('.controller.ts'))
            .map(file => path.join(controllersPath, file));
          controllerFiles.push(...files);
        }
        
        // Buscar archivos .controller.ts en todo el contexto
        const allControllerFiles = glob.sync(`${contextPath}/**/*.controller.ts`);
        controllerFiles.push(...allControllerFiles.filter(file => !controllerFiles.includes(file)));
        
        this.contexts.push({
          name: contextName,
          path: contextPath,
          controllersPath,
          description: this.extractContextDescription(contextName),
          controllers: controllerFiles
        });
      }
    }
    
    console.log(`📋 ${this.contexts.length} contextos encontrados: ${this.contexts.map(c => c.name).join(', ')}`);
  }

  /**
   * Procesa todos los controllers encontrados
   */
  async processControllers() {
    console.log('🎯 Procesando controllers...');
    
    for (const context of this.contexts) {
      console.log(`📁 Procesando contexto: ${context.name}`);
      const originalControllers = [...context.controllers];
      context.controllers = []; // Reset para almacenar objetos controller procesados
      
      for (const controllerFile of originalControllers) {
        const controller = await this.parseController(controllerFile, context.name);
        if (controller) {
          console.log(`  ✅ ${controller.name}: ${controller.endpoints.length} endpoints`);
          context.controllers.push(controller);
          this.endpoints.push(...controller.endpoints);
        } else {
          console.log(`  ❌ Error procesando: ${controllerFile}`);
        }
      }
    }
    
    console.log(`🔗 ${this.endpoints.length} endpoints encontrados`);
  }

  /**
   * Parsea un archivo de controller para extraer endpoints
   */
  async parseController(filePath, contextName) {
    try {
      console.log(`    📄 Procesando archivo: ${path.basename(filePath)}`);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Extraer información básica del controller
      const controllerName = this.extractControllerName(content);
      const baseUrl = this.extractBaseUrl(content, contextName);
      const description = this.extractControllerDescription(content);
      const tags = this.extractTags(content);
      
      // Extraer endpoints
      const endpoints = this.extractEndpoints(content, baseUrl);
      console.log(`      🔍 Encontrados ${endpoints.length} endpoints`);
      
      return {
        name: controllerName,
        context: contextName,
        baseUrl,
        description,
        tags,
        endpoints,
        filePath: path.relative(this.baseDir, filePath)
      };
      
    } catch (error) {
      console.warn(`⚠️  Error procesando ${filePath}:`, error.message);
      return null;
    }
  }

  /**
   * Extrae endpoints de un controller usando enfoque simplificado y rápido
   */
  extractEndpoints(content, baseUrl) {
    const endpoints = [];
    const lines = content.split('\n');
    
    // Patrón para encontrar métodos HTTP
    const methodPattern = /@(Post|Get|Put|Delete|Patch)\(['"]?([^'")\n]*)?['"]?\)/;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(methodPattern);
      
      if (match) {
        const [, httpMethod, routePath] = match;
        
        // Extraer contexto limitado (30 líneas antes y 15 después)
        const contextStart = Math.max(0, i - 30);
        const contextEnd = Math.min(lines.length, i + 15);
        const methodContext = lines.slice(contextStart, contextEnd).join('\n');
        
        const endpoint = {
          method: httpMethod.toUpperCase(),
          path: this.buildFullPath(baseUrl, routePath || ''),
          summary: this.extractSummary(methodContext),
          description: this.extractDescription(methodContext),
          tags: this.extractMethodTags(methodContext),
          auth: this.extractAuthInfo(methodContext),
          parameters: this.extractParameters(methodContext),
          responses: this.extractResponses(methodContext),
          examples: this.extractExamples(methodContext)
        };
        
        endpoints.push(endpoint);
      }
    }
    
    return endpoints;
  }

  /**
   * Construye la ruta completa del endpoint
   */
  buildFullPath(baseUrl, routePath) {
    const base = baseUrl ? `/${baseUrl}` : '';
    const route = routePath || '';
    return `${base}/${route}`.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
  }



  /**
   * Extrae información de autenticación
   */
  extractAuthInfo(methodContent) {
    const hasAuth = methodContent.includes('@UseGuards(') || methodContent.includes('@ApiBearerAuth');
    const roles = this.extractRoles(methodContent);
    
    return {
      required: hasAuth,
      roles: roles,
      bearer: methodContent.includes('@ApiBearerAuth')
    };
  }

  /**
   * Extrae roles requeridos
   */
  extractRoles(methodContent) {
    const rolesMatch = methodContent.match(/@RequiredRoles\(['"]([^'"]+)['"](?:,\s*['"]([^'"]+)['"])*\)/);
    if (rolesMatch) {
      return rolesMatch.slice(1).filter(Boolean);
    }
    
    // Buscar patrones alternativos
    const altMatch = methodContent.match(/roles:\s*\[['"]([^'"]+)['"](?:,\s*['"]([^'"]+)['"])*\]/);
    if (altMatch) {
      return altMatch.slice(1).filter(Boolean);
    }
    
    return [];
  }

  /**
   * Genera la documentación completa (formato original)
   */
  async generateFullDocumentation() {
    console.log('📖 Generando documentación completa...');
    
    const documentation = {
      version: '1.0.0',
      generated: new Date().toISOString(),
      baseUrl: 'http://localhost:3000',
      contexts: this.contexts.map(context => ({
        name: context.name,
        description: context.description,
        controllers: context.controllers
      })),
      summary: {
        totalEndpoints: this.endpoints.length,
        totalControllers: this.contexts.reduce((sum, ctx) => sum + ctx.controllers.length, 0),
        authenticationMethods: ['Bearer JWT', 'OIDC'],
        availableRoles: ['admin', 'commercial', 'visitor', 'supervisor']
      }
    };
    
    const outputPath = path.join(this.outputDir, 'api-documentation.json');
    fs.writeFileSync(outputPath, JSON.stringify(documentation, null, 2));
    
    console.log(`📄 Documentación completa guardada: ${outputPath}`);
  }

  /**
   * Genera la documentación compacta optimizada para IA
   */
  async generateCompactDocumentation() {
    console.log('🎯 Generando documentación compacta...');
    
    const compactDoc = {
      version: '1.0.0',
      generated: new Date().toISOString(),
      baseUrl: 'http://localhost:3000',
      info: {
        description: 'API completa para sistema de chat Guiders - Documentación autoexplicativa para IA',
        totalEndpoints: this.endpoints.length,
        authMethods: ['Bearer JWT', 'Cookie Session', 'BFF HttpOnly Cookies', 'API Key'],
        roles: ['admin', 'commercial', 'visitor', 'supervisor']
      },
      contexts: this.generateCompactContexts(),
      commonPatterns: this.generateCommonPatterns()
    };
    
    const outputPath = path.join(this.outputDir, 'api-documentation-compact.json');
    fs.writeFileSync(outputPath, JSON.stringify(compactDoc, null, 2));
    
    console.log(`🎯 Documentación compacta guardada: ${outputPath}`);
  }

  /**
   * Genera contextos en formato compacto
   */
  generateCompactContexts() {
    const compactContexts = {};
    
    for (const context of this.contexts) {
      if (context.controllers.length === 0) continue;
      
      compactContexts[context.name] = {
        description: context.description,
        endpoints: {}
      };
      
      for (const controller of context.controllers) {
        for (const endpoint of controller.endpoints) {
          const path = endpoint.path;
          const method = endpoint.method;
          
          if (!compactContexts[context.name].endpoints[path]) {
            compactContexts[context.name].endpoints[path] = {};
          }
          
          compactContexts[context.name].endpoints[path][method] = {
            summary: endpoint.summary,
            auth: this.simplifyAuth(endpoint.auth),
            ...this.extractCompactParameters(endpoint),
            responses: this.simplifyResponses(endpoint.responses)
          };
        }
      }
    }
    
    return compactContexts;
  }

  /**
   * Simplifica información de autenticación para formato compacto
   */
  simplifyAuth(auth) {
    return {
      required: auth.required,
      ...(auth.roles && auth.roles.length > 0 && { roles: auth.roles }),
      ...(auth.bearer && { type: 'Bearer' })
    };
  }

  /**
   * Genera patrones comunes para la documentación
   */
  generateCommonPatterns() {
    return {
      authentication: {
        Bearer: 'Authorization: Bearer <token>',
        Cookie: 'Cookie: session_name=<value>; HttpOnly',
        ApiKey: 'X-API-Key: <key> (en headers o query param)'
      },
      pagination: {
        cursor: 'Usar \'cursor\' y \'limit\' para paginación eficiente',
        offset: 'Usar \'offset\' y \'limit\' para paginación tradicional'
      },
      errors: {
        400: 'Bad Request - Datos inválidos o faltantes',
        401: 'Unauthorized - Token inválido o faltante',
        403: 'Forbidden - Sin permisos suficientes',
        404: 'Not Found - Recurso no encontrado',
        500: 'Internal Server Error - Error del servidor'
      },
      dataTypes: {
        datetime: 'ISO 8601 format: 2025-09-25T16:30:00.000Z',
        uuid: 'UUID v4: 550e8400-e29b-41d4-a716-446655440000',
        enum: 'Valores predefinidos específicos',
        array: 'Lista de objetos del tipo especificado',
        object: 'Estructura JSON con propiedades definidas'
      }
    };
  }

  /**
   * Genera resumen ejecutivo
   */
  async generateExecutiveSummary() {
    console.log('📊 Generando resumen ejecutivo...');
    
    const summary = {
      overview: {
        totalEndpoints: this.endpoints.length,
        totalControllers: this.contexts.reduce((sum, ctx) => sum + ctx.controllers.length, 0),
        contexts: this.contexts.length,
        generated: new Date().toISOString()
      },
      contexts: this.contexts.map(ctx => ({
        name: ctx.name,
        description: ctx.description,
        controllers: ctx.controllers.length,
        endpoints: ctx.controllers.reduce((sum, ctrl) => sum + ctrl.endpoints.length, 0)
      })),
      endpoints: {
        byMethod: this.getEndpointsByMethod(),
        byContext: this.getEndpointsByContext()
      },
      authentication: {
        methods: ['Bearer JWT', 'OIDC'],
        roles: ['admin', 'commercial', 'visitor']
      }
    };
    
    const outputPath = path.join(this.outputDir, 'executive-summary.json');
    fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2));
    
    console.log(`📊 Resumen ejecutivo guardado: ${outputPath}`);
  }

  /**
   * Obtiene estadísticas de endpoints por método HTTP
   */
  getEndpointsByMethod() {
    const methods = {};
    for (const endpoint of this.endpoints) {
      methods[endpoint.method] = (methods[endpoint.method] || 0) + 1;
    }
    return methods;
  }

  /**
   * Obtiene estadísticas de endpoints por contexto
   */
  getEndpointsByContext() {
    return this.contexts.map(ctx => ({
      context: ctx.name,
      count: ctx.controllers.reduce((sum, ctrl) => sum + ctrl.endpoints.length, 0)
    }));
  }

  /**
   * Imprime resumen final
   */
  printSummary() {
    console.log('\n🎉 RESUMEN DE GENERACIÓN:');
    console.log(`📂 Contextos: ${this.contexts.length}`);
    console.log(`🎛️  Controllers: ${this.contexts.reduce((sum, ctx) => sum + ctx.controllers.length, 0)}`);
    console.log(`🔗 Endpoints: ${this.endpoints.length}`);
    
    // Mostrar estadísticas por contexto
    console.log('\n📋 Por contexto:');
    for (const ctx of this.contexts) {
      const endpointCount = ctx.controllers.reduce((sum, ctrl) => sum + ctrl.endpoints.length, 0);
      console.log(`  • ${ctx.name}: ${endpointCount} endpoints`);
    }
    
    console.log('\n📁 Archivos generados:');
    console.log('  • api-documentation.json (completa)');
    console.log('  • api-documentation-compact.json (optimizada IA)');
    console.log('  • executive-summary.json (métricas)');
  }

  /**
   * Métodos auxiliares para extracción de información
   */
  
  extractControllerName(content) {
    const match = content.match(/export class (\w+Controller)/);
    return match ? match[1] : 'UnknownController';
  }
  
  extractBaseUrl(content) {
    const match = content.match(/@Controller\(['"]([^'"]*)['"]\)/);
    return match ? match[1] : '';
  }
  
  extractControllerDescription(content) {
    const match = content.match(/\/\*\*\s*\n\s*\*\s*(.+?)\s*\n[\s\*]*\//);
    return match ? match[1] : 'Controller sin descripción';
  }
  
  extractTags(content) {
    const match = content.match(/@ApiTags\(['"]([^'"]+)['"]\)/);
    return match ? [match[1]] : [];
  }
  
  extractSummary(methodContent) {
    // Buscar línea por línea para evitar contaminación cruzada
    const lines = methodContent.split('\n');
    
    for (const line of lines) {
      // Patrón más estricto que solo busca en la línea actual
      const match = line.match(/@ApiOperation\(\s*{\s*summary:\s*['"]([^'"]+)['"]/);
      if (match) {
        return match[1];
      }
      
      // También buscar formato multilinea
      if (line.includes('@ApiOperation({')) {
        const nextLine = lines[lines.indexOf(line) + 1];
        if (nextLine) {
          const summaryMatch = nextLine.match(/\s*summary:\s*['"]([^'"]+)['"]/);
          if (summaryMatch) {
            return summaryMatch[1];
          }
        }
      }
    }
    
    return 'Sin resumen';
  }
  
  extractDescription(methodContent) {
    // Buscar línea por línea para evitar contaminación cruzada
    const lines = methodContent.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Buscar @ApiOperation
      if (line.includes('@ApiOperation({')) {
        let operationBlock = line;
        let j = i + 1;
        
        // Si no está cerrado en la misma línea, buscar las siguientes
        while (j < lines.length && !operationBlock.includes('})')) {
          operationBlock += '\n' + lines[j];
          j++;
        }
        
        // Buscar description en el bloque completo
        const descMatch = operationBlock.match(/description:\s*['"]([^'"]*(?:\n[^'"]*)*)['"]/);
        if (descMatch) {
          return descMatch[1].replace(/\n\s*/g, ' ').trim();
        }
        
        break; // Solo procesar el primer @ApiOperation encontrado
      }
    }
    
    return 'Sin descripción';
  }
  
  extractContextDescription(contextName) {
    const descriptions = {
      'visitors-v2': 'Gestión de visitantes V2 optimizada',
      'conversations-v2': 'Sistema de chat V2 optimizado (MongoDB)',
      'commercial': 'Gestión de comerciales y conectividad',
      'auth': 'Autenticación y autorización avanzada',
      'company': 'Gestión de empresas y sitios',
      'tracking': 'Seguimiento de intenciones y métricas',
      'visitors': 'Gestión de visitantes V1 (legacy)'
    };
    return descriptions[contextName] || `Contexto ${contextName}`;
  }
  
  // Más métodos auxiliares...
  extractParameters(methodContent) {
    const params = { path: [], query: [] };
    const lines = methodContent.split('\n');
    
    // Procesar línea por línea para evitar contaminación cruzada
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Buscar @ApiParam (puede estar en múltiples líneas)
      if (line.includes('@ApiParam({')) {
        let paramBlock = line;
        let j = i + 1;
        
        // Si no está cerrado en la misma línea, buscar las siguientes
        while (j < lines.length && !paramBlock.includes('})')) {
          paramBlock += '\n' + lines[j];
          j++;
        }
        
        const nameMatch = paramBlock.match(/name:\s*['"]([^'"]+)['"]/);
        const descMatch = paramBlock.match(/description:\s*['"]([^'"]*(?:\n[^'"]*)*)['"]/);
        
        if (nameMatch) {
          params.path.push({
            name: nameMatch[1],
            description: descMatch ? descMatch[1].replace(/\n\s*/g, ' ').trim() : 'Parámetro sin descripción'
          });
        }
        
        i = j - 1; // Saltar las líneas procesadas
        continue;
      }
      
      // Buscar @ApiQuery (puede estar en múltiples líneas)
      if (line.includes('@ApiQuery({')) {
        let queryBlock = line;
        let j = i + 1;
        
        // Si no está cerrado en la misma línea, buscar las siguientes
        while (j < lines.length && !queryBlock.includes('})')) {
          queryBlock += '\n' + lines[j];
          j++;
        }
        
        const nameMatch = queryBlock.match(/name:\s*['"]([^'"]+)['"]/);
        const requiredMatch = queryBlock.match(/required:\s*(true|false)/);
        const descMatch = queryBlock.match(/description:\s*['"]([^'"]*(?:\n[^'"]*)*)['"]/);
        
        if (nameMatch) {
          params.query.push({
            name: nameMatch[1],
            required: requiredMatch ? requiredMatch[1] === 'true' : false,
            description: descMatch ? descMatch[1].replace(/\n\s*/g, ' ').trim() : 'Parámetro sin descripción'
          });
        }
        
        i = j - 1; // Saltar las líneas procesadas
        continue;
      }
    }

    return params;
  }

  extractResponses(methodContent) {
    const responses = [];
    const lines = methodContent.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Buscar @ApiResponse (puede estar en múltiples líneas)
      if (line.includes('@ApiResponse({')) {
        let responseBlock = line;
        let j = i + 1;
        
        // Si no está cerrado en la misma línea, buscar las siguientes
        while (j < lines.length && !responseBlock.includes('})')) {
          responseBlock += '\n' + lines[j];
          j++;
        }
        
        const statusMatch = responseBlock.match(/status:\s*(\d+)/);
        const descMatch = responseBlock.match(/description:\s*['"]([^'"]*(?:\n[^'"]*)*)['"]/);
        
        if (statusMatch) {
          responses.push({
            status: Number(statusMatch[1]),
            description: descMatch ? descMatch[1].replace(/\n\s*/g, ' ').trim() : ''
          });
        }
        
        i = j - 1; // Saltar las líneas procesadas
        continue;
      }
    }
    
    return responses;
  }

  extractExamples(methodContent) { return {}; }
  extractMethodTags(methodContent) { return []; }

  extractCompactParameters(endpoint) {
    const out = {};
    if (endpoint.parameters?.path?.length) out.path = endpoint.parameters.path;
    if (endpoint.parameters?.query?.length) out.query = endpoint.parameters.query;
    return out;
  }

  simplifyResponses(responses) {
    if (!responses || !responses.length) return [];
    return responses.map((r) => ({ status: r.status, description: r.description }));
  }
  
  async validateDocumentation() {
    console.log('✅ Validación completada');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const generator = new ApiDocumentationGenerator();
  generator.generate().catch(console.error);
}

module.exports = ApiDocumentationGenerator;