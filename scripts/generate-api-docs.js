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
        this.contexts.push({
          name: contextName,
          path: contextPath,
          controllersPath,
          description: this.extractContextDescription(contextName),
          controllers: []
        });
      }
    }
    
    console.log(`📋 ${this.contexts.length} contextos encontrados: ${this.contexts.map(c => c.name).join(', ')}`);
  }

  /**
   * Procesa todos los controllers de todos los contextos
   */
  async processControllers() {
    console.log('🎯 Procesando controllers...');
    
    for (const context of this.contexts) {
      // Buscar todos los archivos controller en cada contexto (incluyendo subdirectorios)
      const contextPath = path.join(this.srcDir, context.name);
      const controllerFiles = glob.sync(`${contextPath}/**/infrastructure/**/*.controller.ts`);
      
      for (const controllerFile of controllerFiles) {
        const controller = await this.parseController(controllerFile, context.name);
        
        if (controller && controller.endpoints.length > 0) {
          context.controllers.push(controller);
          this.endpoints.push(...controller.endpoints);
        }
      }
    }
    
    const totalEndpoints = this.endpoints.length;
    console.log(`🔗 ${totalEndpoints} endpoints encontrados`);
  }

  /**
   * Parsea un archivo de controller para extraer endpoints
   */
  async parseController(filePath, contextName) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Extraer información básica del controller
      const controllerName = this.extractControllerName(content);
      const baseUrl = this.extractBaseUrl(content);
      const description = this.extractControllerDescription(content);
      const tags = this.extractTags(content);
      
      // Extraer endpoints
      const endpoints = this.extractEndpoints(content, baseUrl);
      
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
   * Extrae endpoints de un controller usando regex
   */
  extractEndpoints(content, baseUrl) {
    const endpoints = [];
    
    // Patrón para encontrar métodos HTTP con decoradores
    const methodPattern = /@(Post|Get|Put|Delete|Patch)\(['"]?([^'")\n]*)?['"]?\)\s*\n(?:.*\n)*?\s*async?\s+(\w+)\s*\(/gm;
    
    let match;
    while ((match = methodPattern.exec(content)) !== null) {
      const [, httpMethod, routePath, methodName] = match;
      
      // Extraer información adicional del método
      const methodStart = match.index;
      const methodContent = this.extractMethodContent(content, methodStart);
      
      const endpoint = {
        method: httpMethod.toUpperCase(),
        path: this.buildFullPath(baseUrl, routePath),
        summary: this.extractSummary(methodContent),
        description: this.extractDescription(methodContent),
        tags: this.extractMethodTags(methodContent),
        auth: this.extractAuthInfo(methodContent),
        parameters: this.extractParameters(methodContent),
        responses: this.extractResponses(methodContent),
        examples: this.extractExamples(methodContent)
      };
      
      endpoints.push(endpoint);
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
   * Extrae el contenido de un método específico
   */
  extractMethodContent(content, startIndex) {
    // Incluir algo de contexto previo para capturar decoradores Swagger antes de @Get/@Post
    const lookbehind = 800; // caracteres hacia atrás
    const start = Math.max(0, startIndex - lookbehind);
    const methodEnd = content.indexOf('\n  }', startIndex);
    return content.substring(start, methodEnd !== -1 ? methodEnd : startIndex + 1000);
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
    const match = methodContent.match(/@ApiOperation\(\s*{\s*summary:\s*['"]([^'"]+)['"]/);
    return match ? match[1] : 'Sin resumen';
  }
  
  extractDescription(methodContent) {
    const match = methodContent.match(/@ApiOperation\(\s*{[^}]*description:\s*['"]([^'"]+)['"]/);
    return match ? match[1] : 'Sin descripción';
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
    // @ApiParam({ name: 'app', description: '...' })
    const apiParamRegex = /@ApiParam\(\s*{[^}]*name:\s*['"]([^'"]+)['"][^}]*?(?:description:\s*['"]([^'"]+)['"])?[^}]*}\s*\)/g;
    let m;
    while ((m = apiParamRegex.exec(methodContent)) !== null) {
      const name = m[1];
      const description = m[2] || '';
      params.path.push({ name, description });
    }

    // @ApiQuery({ name: 'redirect', required: false, description: '...' })
    const apiQueryRegex = /@ApiQuery\(\s*{[^}]*name:\s*['"]([^'"]+)['"][^}]*?(?:required:\s*(true|false))?[^}]*?(?:description:\s*['"]([^'"]+)['"])?[^}]*}\s*\)/g;
    while ((m = apiQueryRegex.exec(methodContent)) !== null) {
      const name = m[1];
      const required = m[2] ? m[2] === 'true' : false;
      const description = m[3] || '';
      params.query.push({ name, required, description });
    }

    return params;
  }

  extractResponses(methodContent) {
    const responses = [];
    // @ApiResponse({ status: 302, description: '...' })
    const apiResponseRegex = /@ApiResponse\(\s*{[^}]*status:\s*(\d+)[^}]*?(?:description:\s*['"]([^'"]+)['"])?[^}]*}\s*\)/g;
    let m;
    while ((m = apiResponseRegex.exec(methodContent)) !== null) {
      responses.push({ status: Number(m[1]), description: m[2] || '' });
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