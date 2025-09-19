#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface EndpointInfo {
  method: string;
  path: string;
  summary: string;
  description: string;
  tags: string[];
  auth: {
    required: boolean;
    roles?: string[];
    bearer?: boolean;
  };
  parameters: {
    path?: Array<{
      name: string;
      description: string;
      example?: string;
      required: boolean;
    }>;
    query?: Array<{
      name: string;
      description: string;
      example?: any;
      required: boolean;
      type: string;
    }>;
    body?: {
      description: string;
      type: string;
      required: boolean;
      schema?: any;
    };
  };
  responses: Array<{
    status: number;
    description: string;
    schema?: any;
  }>;
  examples: {
    request?: any;
    response?: any;
  };
}

interface ControllerInfo {
  name: string;
  context: string;
  baseUrl: string;
  description: string;
  tags: string[];
  endpoints: EndpointInfo[];
  filePath: string;
}

interface ApiDocumentation {
  version: string;
  generated: string;
  baseUrl: string;
  contexts: Array<{
    name: string;
    description: string;
    controllers: ControllerInfo[];
  }>;
  summary: {
    totalEndpoints: number;
    totalControllers: number;
    authenticationMethods: string[];
    availableRoles: string[];
  };
}

class ImprovedControllerAnalyzer {
  private readonly sourceDir: string;
  private readonly outputDir: string;

  constructor(sourceDir: string = 'src', outputDir: string = 'docs/api-ai') {
    this.sourceDir = sourceDir;
    this.outputDir = outputDir;
  }

  async generateDocumentation(): Promise<void> {
    console.log('🚀 Generando documentación de API para IAs (versión mejorada)...');
    
    // Asegurar que el directorio de salida existe
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    // Encontrar todos los controllers
    const controllerFiles = await this.findControllerFiles();
    console.log(`📁 Encontrados ${controllerFiles.length} controllers`);

    // Analizar cada controller
    const contexts = new Map<string, ControllerInfo[]>();
    let totalEndpoints = 0;
    const allRoles = new Set<string>();
    const allTags = new Set<string>();

    for (const filePath of controllerFiles) {
      try {
        const controllerInfo = await this.analyzeController(filePath);
        if (controllerInfo) {
          const contextName = controllerInfo.context;
          if (!contexts.has(contextName)) {
            contexts.set(contextName, []);
          }
          contexts.get(contextName)!.push(controllerInfo);
          
          totalEndpoints += controllerInfo.endpoints.length;
          controllerInfo.endpoints.forEach(endpoint => {
            if (endpoint.auth.roles) {
              endpoint.auth.roles.forEach(role => allRoles.add(role));
            }
            endpoint.tags.forEach(tag => allTags.add(tag));
          });
        }
      } catch (error) {
        console.warn(`⚠️ Error analizando ${filePath}:`, error.message);
      }
    }

    // Crear la documentación final
    const documentation: ApiDocumentation = {
      version: '1.0.0',
      generated: new Date().toISOString(),
      baseUrl: 'http://localhost:3000',
      contexts: Array.from(contexts.entries()).map(([name, controllers]) => ({
        name,
        description: this.getContextDescription(name),
        controllers: controllers.sort((a, b) => a.name.localeCompare(b.name)),
      })),
      summary: {
        totalEndpoints,
        totalControllers: controllerFiles.length,
        authenticationMethods: ['Bearer JWT', 'OIDC'],
        availableRoles: Array.from(allRoles).sort(),
      }
    };

    // Guardar documentación completa
    await this.saveDocumentation(documentation);
    
    // Generar documentación por contexto
    await this.generateContextDocuments(documentation);
    
    // Generar resumen ejecutivo
    await this.generateExecutiveSummary(documentation);

    console.log('✅ Documentación generada exitosamente');
    console.log(`📊 Total: ${totalEndpoints} endpoints en ${controllerFiles.length} controllers`);
    console.log(`📁 Archivos generados en: ${this.outputDir}`);
  }

  private async findControllerFiles(): Promise<string[]> {
    const pattern = `${this.sourceDir}/**/controllers/**/*.controller.ts`;
    const files = await glob(pattern);
    
    // Excluir archivos de test
    return files.filter(file => !file.includes('.spec.') && !file.includes('__tests__'));
  }

  private async analyzeController(filePath: string): Promise<ControllerInfo | null> {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Extraer información básica del controller
    const controllerMatch = content.match(/@Controller\((['"`]([^'"`]*?)['"`])?\)/);
    if (!controllerMatch) return null;

    const controllerPath = controllerMatch[2] || '';
    const className = this.extractClassName(content);
    const contextName = this.extractContextFromPath(filePath);
    const tags = this.extractApiTags(content);
    const description = this.extractControllerDescription(content);

    const endpoints = this.extractEndpoints(content, controllerPath);

    return {
      name: className,
      context: contextName,
      baseUrl: controllerPath,
      description,
      tags,
      endpoints,
      filePath: path.relative(process.cwd(), filePath),
    };
  }

  private extractClassName(content: string): string {
    const match = content.match(/export\s+class\s+(\w+)/);
    return match ? match[1] : 'UnknownController';
  }

  private extractContextFromPath(filePath: string): string {
    const match = filePath.match(/src\/context\/([^\/]+)/);
    if (match) return match[1];
    
    // Fallback para otros patrones
    if (filePath.includes('/auth/')) return 'auth';
    if (filePath.includes('/company/')) return 'company';
    return 'shared';
  }

  private extractApiTags(content: string): string[] {
    const match = content.match(/@ApiTags\(\s*['"`]([^'"`]+)['"`]\s*\)/);
    return match ? [match[1]] : [];
  }

  private extractControllerDescription(content: string): string {
    // Buscar comentarios JSDoc o comentarios de bloque antes de la clase
    const classMatch = content.match(/\/\*\*\s*(.*?)\s*\*\/\s*@ApiTags.*?export\s+class/s);
    if (classMatch) {
      return classMatch[1]
        .replace(/\*\s*/g, '')
        .replace(/\n/g, ' ')
        .trim();
    }
    
    // Buscar comentarios de una línea
    const singleLineMatch = content.match(/\/\/\s*(.+)\s*@ApiTags.*?export\s+class/);
    if (singleLineMatch) {
      return singleLineMatch[1].trim();
    }

    return 'Controller sin descripción';
  }

  private extractEndpoints(content: string, basePath: string): EndpointInfo[] {
    const endpoints: EndpointInfo[] = [];
    
    // Dividir el contenido en métodos usando regex más robusta
    const methodBlocks = this.splitIntoMethodBlocks(content);
    
    for (const block of methodBlocks) {
      const endpoint = this.parseMethodBlock(block, basePath);
      if (endpoint) {
        endpoints.push(endpoint);
      }
    }

    return endpoints;
  }

  private splitIntoMethodBlocks(content: string): string[] {
    const blocks: string[] = [];
    const methodRegex = /@(Get|Post|Put|Delete|Patch)\(/g;
    let lastIndex = 0;
    let match;

    while ((match = methodRegex.exec(content)) !== null) {
      if (lastIndex > 0) {
        blocks.push(content.substring(lastIndex, match.index));
      }
      lastIndex = match.index;
    }
    
    // Agregar el último bloque
    if (lastIndex > 0) {
      blocks.push(content.substring(lastIndex));
    }

    return blocks.filter(block => block.trim().length > 0);
  }

  private parseMethodBlock(block: string, basePath: string): EndpointInfo | null {
    // Extraer método HTTP y path
    const methodMatch = block.match(/@(Get|Post|Put|Delete|Patch)\((['"`]([^'"`]*?)['"`])?\)/);
    if (!methodMatch) return null;

    const method = methodMatch[1].toUpperCase();
    const endpointPath = methodMatch[3] || '';
    const fullPath = this.buildFullPath(basePath, endpointPath);

    // Extraer información del endpoint
    const summary = this.extractApiOperationField(block, 'summary') || 'Sin resumen';
    const description = this.extractApiOperationField(block, 'description') || 'Sin descripción';
    
    // Extraer autenticación y roles
    const auth = this.extractAuthInfo(block);
    
    // Extraer parámetros
    const parameters = this.extractParameters(block);
    
    // Extraer respuestas
    const responses = this.extractResponses(block);
    
    // Extraer tags del endpoint (si difieren del controller)
    const endpointTags = this.extractEndpointTags(block);

    return {
      method,
      path: fullPath,
      summary,
      description,
      tags: endpointTags,
      auth,
      parameters,
      responses,
      examples: this.extractExamples(block),
    };
  }

  private extractEndpointTags(content: string): string[] {
    // Por ahora, devolver array vacío ya que los tags suelen estar a nivel de controller
    return [];
  }

  private extractApiOperationField(content: string, field: string): string | null {
    // Buscar el bloque @ApiOperation completo
    const operationMatch = content.match(/@ApiOperation\(\s*\{([\s\S]*?)\}\s*\)/);
    if (!operationMatch) return null;

    const operationContent = operationMatch[1];
    
    // Buscar el campo específico con diferentes formatos
    const patterns = [
      new RegExp(`${field}:\\s*['"\`]([^'"\`]*?)['"\`]`, 'i'),
      new RegExp(`'${field}':\\s*['"\`]([^'"\`]*?)['"\`]`, 'i'),
      new RegExp(`"${field}":\\s*['"\`]([^'"\`]*?)['"\`]`, 'i'),
      // Para campos multilínea
      new RegExp(`${field}:\\s*['"\`]([\\s\\S]*?)['"\`]`, 'i'),
    ];
    
    for (const pattern of patterns) {
      const match = operationContent.match(pattern);
      if (match) {
        return match[1].replace(/\s+/g, ' ').trim();
      }
    }
    
    return null;
  }

  private buildFullPath(basePath: string, endpointPath: string): string {
    const base = basePath.startsWith('/') ? basePath : `/${basePath}`;
    const endpoint = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
    
    if (!endpointPath) return base;
    if (!basePath) return endpoint;
    
    return `${base}${endpoint}`.replace(/\/+/g, '/');
  }

  private extractAuthInfo(content: string): { required: boolean; roles?: string[]; bearer?: boolean } {
    const hasAuthGuard = content.includes('@UseGuards') && content.includes('AuthGuard');
    const hasRoleGuard = content.includes('RolesGuard');
    const hasBearerAuth = content.includes('@ApiBearerAuth');
    
    let roles: string[] | undefined;
    // Buscar tanto @RequiredRoles como @Roles
    const rolesPatterns = [
      /@RequiredRoles\(\s*['"`]([^'"`]+)['"`]\s*(?:,\s*['"`]([^'"`]+)['"`])*\s*\)/,
      /@RequiredRoles\(([^)]+)\)/,
      /@Roles\(([^)]+)\)/,
    ];
    
    for (const pattern of rolesPatterns) {
      const rolesMatch = content.match(pattern);
      if (rolesMatch) {
        // Extraer roles de la cadena, eliminando comillas y espacios
        const rolesStr = rolesMatch[1];
        roles = rolesStr
          .split(',')
          .map(role => role.trim().replace(/['"]/g, ''))
          .filter(role => role.length > 0);
        break;
      }
    }

    return {
      required: hasAuthGuard,
      roles,
      bearer: hasBearerAuth,
    };
  }

  private extractParameters(content: string): EndpointInfo['parameters'] {
    const parameters: EndpointInfo['parameters'] = {};

    // Extraer parámetros de path
    const pathParams = this.extractApiParams(content);
    if (pathParams.length > 0) {
      parameters.path = pathParams;
    }

    // Extraer parámetros de query
    const queryParams = this.extractApiQueries(content);
    if (queryParams.length > 0) {
      parameters.query = queryParams;
    }

    // Extraer body
    const bodyInfo = this.extractApiBody(content);
    if (bodyInfo) {
      parameters.body = bodyInfo;
    }

    return parameters;
  }

  private extractApiParams(content: string): Array<{ name: string; description: string; example?: string; required: boolean }> {
    const params: Array<{ name: string; description: string; example?: string; required: boolean }> = [];
    const regex = /@ApiParam\(\s*\{([\s\S]*?)\}\s*\)/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const paramConfig = match[1];
      const name = this.extractFromConfig(paramConfig, 'name');
      const description = this.extractFromConfig(paramConfig, 'description');
      const example = this.extractFromConfig(paramConfig, 'example');
      
      if (name && description) {
        params.push({
          name,
          description,
          example: example || undefined,
          required: true, // Los parámetros de path son siempre requeridos
        });
      }
    }

    return params;
  }

  private extractApiQueries(content: string): Array<{ name: string; description: string; example?: any; required: boolean; type: string }> {
    const queries: Array<{ name: string; description: string; example?: any; required: boolean; type: string }> = [];
    const regex = /@ApiQuery\(\s*\{([\s\S]*?)\}\s*\)/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const queryConfig = match[1];
      const name = this.extractFromConfig(queryConfig, 'name');
      const description = this.extractFromConfig(queryConfig, 'description');
      const example = this.extractFromConfig(queryConfig, 'example');
      const required = this.extractFromConfig(queryConfig, 'required') === 'true';
      const type = this.extractFromConfig(queryConfig, 'type') || 'string';
      
      if (name && description) {
        queries.push({
          name,
          description,
          example: example || undefined,
          required,
          type,
        });
      }
    }

    return queries;
  }

  private extractApiBody(content: string): { description: string; type: string; required: boolean; schema?: any } | null {
    const regex = /@ApiBody\(\s*\{([\s\S]*?)\}\s*\)/;
    const match = content.match(regex);
    
    if (match) {
      const bodyConfig = match[1];
      const description = this.extractFromConfig(bodyConfig, 'description') || 'Cuerpo de la petición';
      const typeStr = this.extractFromConfig(bodyConfig, 'type') || 'object';
      const required = this.extractFromConfig(bodyConfig, 'required') !== 'false';
      
      // Extraer el tipo DTO para buscar su esquema
      const dtoType = this.extractDtoType(bodyConfig);
      let schema = undefined;
      
      if (dtoType) {
        schema = this.extractDtoSchema(content, dtoType);
      }
      
      // Extraer ejemplos del @ApiBody
      const examples = this.extractExamplesFromConfig(bodyConfig);
      
      return {
        description,
        type: typeStr,
        required,
        schema: schema || (examples ? { examples } : undefined),
      };
    }

    return null;
  }

  private extractDtoType(config: string): string | null {
    // Buscar type: SomeDto o type: () => SomeDto
    const patterns = [
      /type:\s*([A-Z][A-Za-z0-9_]+)/,
      /type:\s*\(\)\s*=>\s*([A-Z][A-Za-z0-9_]+)/,
    ];
    
    for (const pattern of patterns) {
      const match = config.match(pattern);
      if (match) return match[1];
    }
    
    return null;
  }

  private extractDtoSchema(content: string, dtoType: string): any {
    // Buscar el import del DTO
    const importRegex = new RegExp(`import.*${dtoType}.*from\\s+['"\`]([^'"\`]+)['"\`]`);
    const importMatch = content.match(importRegex);
    
    if (importMatch) {
      const dtoPath = importMatch[1];
      try {
        // Construir la ruta completa del DTO
        const fullDtoPath = this.resolveDtoPath(dtoPath);
        if (fs.existsSync(fullDtoPath)) {
          const dtoContent = fs.readFileSync(fullDtoPath, 'utf-8');
          return this.parseDtoSchema(dtoContent, dtoType);
        }
      } catch (error) {
        console.warn(`⚠️  No se pudo leer el esquema del DTO ${dtoType}:`, error.message);
      }
    }
    
    return undefined;
  }

  private resolveDtoPath(importPath: string): string {
    // Si es un path relativo, construir la ruta completa
    if (importPath.startsWith('.')) {
      return path.resolve(this.sourceDir, importPath + '.ts');
    }
    
    // Si es un path absoluto del proyecto
    return path.resolve(this.sourceDir, importPath.replace(/^src\//, '') + '.ts');
  }

  private parseDtoSchema(dtoContent: string, dtoType: string): any {
    const schema: any = {
      type: 'object',
      properties: {},
      required: []
    };

    // Buscar la clase DTO específica
    const classRegex = new RegExp(`export\\s+class\\s+${dtoType}\\s*\\{([\\s\\S]*?)\\}(?:\\s*$|\\s*export)`);
    const classMatch = dtoContent.match(classRegex);
    
    if (!classMatch) return schema;
    
    const classBody = classMatch[1];
    
    // Extraer propiedades con sus decoradores
    const propertyRegex = /@ApiProperty\(\s*\{([\s\S]*?)\}\s*\)[\s\S]*?(\w+)(\?)?:\s*([^;]+);/g;
    let propertyMatch;
    
    while ((propertyMatch = propertyRegex.exec(classBody)) !== null) {
      const [, apiPropertyConfig, propertyName, optional, propertyType] = propertyMatch;
      
      const description = this.extractFromConfig(apiPropertyConfig, 'description') || '';
      const example = this.extractFromConfig(apiPropertyConfig, 'example');
      const enumValues = this.extractArrayFromConfig(apiPropertyConfig, 'enum');
      
      schema.properties[propertyName] = {
        type: this.mapTypeScriptTypeToJsonType(propertyType),
        description,
        ...(example && { example }),
        ...(enumValues && { enum: enumValues })
      };
      
      // Si no es opcional, añadir a required
      if (!optional) {
        schema.required.push(propertyName);
      }
    }
    
    return schema;
  }

  private extractArrayFromConfig(config: string, field: string): string[] | null {
    const pattern = new RegExp(`${field}:\\s*\\[([^\\]]+)\\]`);
    const match = config.match(pattern);
    
    if (match) {
      return match[1]
        .split(',')
        .map(item => item.trim().replace(/['"]/g, ''))
        .filter(item => item.length > 0);
    }
    
    return null;
  }

  private extractExamplesFromConfig(config: string): any {
    // Buscar examples: { ... } en la configuración
    const examplesRegex = /examples:\s*\{([\s\S]*?)\}(?:,|\s*\})/;
    const match = config.match(examplesRegex);
    
    if (match) {
      try {
        const examplesContent = match[1];
        return this.parseExamplesObject(examplesContent);
      } catch (error) {
        console.warn('Error parsing examples:', error);
      }
    }
    
    return undefined;
  }

  private parseExamplesObject(content: string): any {
    const examples: any = {};
    
    // Buscar ejemplos individuales como 'key': { ... }
    const exampleRegex = /['"`]([^'"`]+)['"`]:\s*\{([\s\S]*?)\}(?:,|\s*$)/g;
    let match;
    
    while ((match = exampleRegex.exec(content)) !== null) {
      const [, exampleName, exampleContent] = match;
      try {
        examples[exampleName] = this.parseExampleObject(exampleContent);
      } catch (error) {
        // Si no se puede parsear, guardar como string
        examples[exampleName] = exampleContent.trim();
      }
    }
    
    return Object.keys(examples).length > 0 ? examples : undefined;
  }

  private parseExampleObject(content: string): any {
    const example: any = {};
    
    // Extraer summary
    const summaryMatch = content.match(/summary:\s*['"`]([^'"`]+)['"`]/);
    if (summaryMatch) {
      example.summary = summaryMatch[1];
    }
    
    // Extraer description
    const descMatch = content.match(/description:\s*['"`]([^'"`]+)['"`]/);
    if (descMatch) {
      example.description = descMatch[1];
    }
    
    // Extraer value
    const valueMatch = content.match(/value:\s*\{([\s\S]*?)\}(?:,|\s*$)/);
    if (valueMatch) {
      try {
        example.value = this.parseJsonLikeObject(valueMatch[1]);
      } catch (error) {
        example.value = valueMatch[1].trim();
      }
    }
    
    return example;
  }

  private parseJsonLikeObject(content: string): any {
    try {
      // Limpiar y convertir a JSON válido
      let jsonString = content
        .replace(/(\w+):\s*/g, '"$1": ') // Agregar comillas a las claves
        .replace(/'/g, '"') // Convertir comillas simples a dobles
        .replace(/,\s*\}/g, '}') // Quitar comas trailing en objetos
        .replace(/,\s*\]/g, ']') // Quitar comas trailing en arrays
        .trim();
      
      // Si no empieza con { o [, envolverlo
      if (!jsonString.startsWith('{') && !jsonString.startsWith('[')) {
        jsonString = `{${jsonString}}`;
      }
      
      return JSON.parse(jsonString);
    } catch (error) {
      // Si falla el parsing, devolver como string
      return content.trim();
    }
  }

  private extractFromConfig(config: string, field: string): string | null {
    const patterns = [
      new RegExp(`${field}:\\s*['"\`]([^'"\`]*?)['"\`]`),
      new RegExp(`'${field}':\\s*['"\`]([^'"\`]*?)['"\`]`),
      new RegExp(`"${field}":\\s*['"\`]([^'"\`]*?)['"\`]`),
    ];
    
    for (const pattern of patterns) {
      const match = config.match(pattern);
      if (match) return match[1];
    }
    
    return null;
  }

  private extractResponses(content: string): Array<{ status: number; description: string; schema?: any }> {
    const responses: Array<{ status: number; description: string; schema?: any }> = [];
    const regex = /@ApiResponse\(\s*\{([\s\S]*?)\}\s*\)/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const responseConfig = match[1];
      const statusStr = this.extractFromConfig(responseConfig, 'status');
      const description = this.extractFromConfig(responseConfig, 'description');
      const type = this.extractFromConfig(responseConfig, 'type');
      
      // Buscar esquema en la configuración
      let schema = this.extractSchemaFromConfig(responseConfig);
      
      if (!schema && type) {
        schema = { type };
      }
      
      if (statusStr && description) {
        const status = parseInt(statusStr, 10);
        responses.push({
          status,
          description,
          schema,
        });
      }
    }

    return responses;
  }

  private extractSchemaFromConfig(config: string): any {
    // Buscar schema: { ... } en la configuración
    const schemaRegex = /schema:\s*\{([\s\S]*?)\}(?:,|\s*\})/;
    const match = config.match(schemaRegex);
    
    if (match) {
      try {
        // Intentar extraer el contenido del esquema
        const schemaContent = match[1];
        return this.parseSchemaContent(schemaContent);
      } catch (error) {
        console.warn('Error parsing schema:', error);
      }
    }
    
    return undefined;
  }

  private parseSchemaContent(content: string): any {
    const schema: any = {};
    
    // Extraer type
    const typeMatch = content.match(/type:\s*['"`](\w+)['"`]/);
    if (typeMatch) {
      schema.type = typeMatch[1];
    }
    
    // Extraer properties
    const propertiesMatch = content.match(/properties:\s*\{([\s\S]*?)\}/);
    if (propertiesMatch) {
      schema.properties = this.parseProperties(propertiesMatch[1]);
    }
    
    // Extraer example
    const exampleMatch = content.match(/example:\s*\{([\s\S]*?)\}/);
    if (exampleMatch) {
      try {
        schema.example = this.parseExample(exampleMatch[1]);
      } catch (error) {
        // Si no se puede parsear como JSON, usar como string
        schema.example = exampleMatch[1].trim();
      }
    }
    
    return schema;
  }

  private parseProperties(propertiesContent: string): any {
    const properties: any = {};
    
    // Regex mejorado para capturar propiedades anidadas
    const propertyRegex = /(\w+):\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;
    let match;
    
    while ((match = propertyRegex.exec(propertiesContent)) !== null) {
      const [, propertyName, propertyConfig] = match;
      properties[propertyName] = this.parsePropertyConfig(propertyConfig);
    }
    
    return properties;
  }

  private parsePropertyConfig(config: string): any {
    const property: any = {};
    
    // Extraer type
    const typeMatch = config.match(/type:\s*['"`](\w+)['"`]/);
    if (typeMatch) {
      property.type = typeMatch[1];
    }
    
    // Extraer description
    const descMatch = config.match(/description:\s*['"`]([^'"`]+)['"`]/);
    if (descMatch) {
      property.description = descMatch[1];
    }
    
    // Extraer example
    const exampleMatch = config.match(/example:\s*['"`]([^'"`]+)['"`]/);
    if (exampleMatch) {
      property.example = exampleMatch[1];
    }
    
    return property;
  }

  private parseExample(exampleContent: string): any {
    try {
      // Intentar parsear como JSON-like
      const jsonLike = exampleContent
        .replace(/(\w+):/g, '"$1":') // Agregar comillas a las claves
        .replace(/'/g, '"') // Convertir comillas simples a dobles
        .replace(/,\s*\}/g, '}') // Quitar comas trailing
        .replace(/,\s*\]/g, ']');
      
      return JSON.parse(`{${jsonLike}}`);
    } catch (error) {
      return exampleContent.trim();
    }
  }

  private mapTypeScriptTypeToJsonType(tsType: string): string {
    const cleanType = tsType.trim().replace(/\?$/, '');
    
    if (cleanType === 'string') return 'string';
    if (cleanType === 'number') return 'number';
    if (cleanType === 'boolean') return 'boolean';
    if (cleanType.includes('[]')) return 'array';
    if (cleanType === 'object' || cleanType.includes('Record<') || cleanType.includes('{')) return 'object';
    
    return 'object'; // Default para tipos complejos
  }

  private extractExamples(content: string): { request?: any; response?: any } {
    const examples: { request?: any; response?: any } = {};
    
    // Buscar ejemplos en comentarios JSDoc
    const docRegex = /\/\*\*[\s\S]*?@example[\s\S]*?([\s\S]*?)\*\//g;
    let match;
    
    while ((match = docRegex.exec(content)) !== null) {
      try {
        const exampleContent = match[1];
        
        // Buscar bloques de código JSON
        const requestMatch = exampleContent.match(/Request:\s*```json\s*([\s\S]*?)```/);
        if (requestMatch) {
          try {
            examples.request = JSON.parse(requestMatch[1].trim());
          } catch (error) {
            examples.request = requestMatch[1].trim();
          }
        }
        
        const responseMatch = exampleContent.match(/Response:\s*```json\s*([\s\S]*?)```/);
        if (responseMatch) {
          try {
            examples.response = JSON.parse(responseMatch[1].trim());
          } catch (error) {
            examples.response = responseMatch[1].trim();
          }
        }
      } catch (error) {
        // Ignorar errores de parsing de ejemplos
      }
    }
    
    return examples;
  }

  private getContextDescription(contextName: string): string {
    const descriptions: Record<string, string> = {
      'auth': 'Autenticación y autorización de usuarios',
      'company': 'Gestión de empresas y sitios web',
      'conversations': 'Sistema de chat V1 (SQL legacy)',
      'conversations-v2': 'Sistema de chat V2 optimizado (MongoDB)',
      'real-time': 'Comunicación en tiempo real vía WebSockets',
      'visitors': 'Gestión de visitantes V1',
      'visitors-v2': 'Gestión de visitantes V2 optimizada',
      'tracking': 'Seguimiento de intenciones y métricas',
      'shared': 'Utilidades y componentes compartidos',
    };

    return descriptions[contextName] || `Contexto ${contextName}`;
  }

  private async saveDocumentation(documentation: ApiDocumentation): Promise<void> {
    // Guardar como JSON
    const jsonPath = path.join(this.outputDir, 'api-documentation.json');
    fs.writeFileSync(jsonPath, JSON.stringify(documentation, null, 2));

    // Guardar como YAML
    const yamlPath = path.join(this.outputDir, 'api-documentation.yaml');
    const yaml = this.convertToYaml(documentation);
    fs.writeFileSync(yamlPath, yaml);

    console.log(`📝 Documentación guardada en:`);
    console.log(`   - ${jsonPath}`);
    console.log(`   - ${yamlPath}`);
  }

  private async generateContextDocuments(documentation: ApiDocumentation): Promise<void> {
    const contextDir = path.join(this.outputDir, 'contexts');
    if (!fs.existsSync(contextDir)) {
      fs.mkdirSync(contextDir, { recursive: true });
    }

    for (const context of documentation.contexts) {
      const contextDoc = {
        context: context.name,
        description: context.description,
        controllers: context.controllers,
        summary: {
          controllersCount: context.controllers.length,
          endpointsCount: context.controllers.reduce((sum, ctrl) => sum + ctrl.endpoints.length, 0),
        }
      };

      const filePath = path.join(contextDir, `${context.name}.json`);
      fs.writeFileSync(filePath, JSON.stringify(contextDoc, null, 2));
    }

    console.log(`📁 Documentación por contexto guardada en: ${contextDir}`);
  }

  private async generateExecutiveSummary(documentation: ApiDocumentation): Promise<void> {
    const summary = {
      overview: {
        totalEndpoints: documentation.summary.totalEndpoints,
        totalControllers: documentation.summary.totalControllers,
        contexts: documentation.contexts.length,
        generated: documentation.generated,
      },
      contexts: documentation.contexts.map(ctx => ({
        name: ctx.name,
        description: ctx.description,
        controllers: ctx.controllers.length,
        endpoints: ctx.controllers.reduce((sum, ctrl) => sum + ctrl.endpoints.length, 0),
      })),
      authentication: {
        methods: documentation.summary.authenticationMethods,
        roles: documentation.summary.availableRoles,
      },
      endpoints: {
        byMethod: this.getEndpointsByMethod(documentation),
        byContext: this.getEndpointsByContext(documentation),
        byAuth: this.getEndpointsByAuth(documentation),
      }
    };

    const summaryPath = path.join(this.outputDir, 'executive-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    
    console.log(`📊 Resumen ejecutivo guardado en: ${summaryPath}`);
  }

  private getEndpointsByMethod(documentation: ApiDocumentation): Record<string, number> {
    const byMethod: Record<string, number> = {};
    
    documentation.contexts.forEach(context => {
      context.controllers.forEach(controller => {
        controller.endpoints.forEach(endpoint => {
          byMethod[endpoint.method] = (byMethod[endpoint.method] || 0) + 1;
        });
      });
    });

    return byMethod;
  }

  private getEndpointsByContext(documentation: ApiDocumentation): Array<{ context: string; count: number }> {
    return documentation.contexts.map(context => ({
      context: context.name,
      count: context.controllers.reduce((sum, ctrl) => sum + ctrl.endpoints.length, 0),
    }));
  }

  private getEndpointsByAuth(documentation: ApiDocumentation): { authenticated: number; public: number; byRole: Record<string, number> } {
    let authenticated = 0;
    let publicEndpoints = 0;
    const byRole: Record<string, number> = {};

    documentation.contexts.forEach(context => {
      context.controllers.forEach(controller => {
        controller.endpoints.forEach(endpoint => {
          if (endpoint.auth.required) {
            authenticated++;
            endpoint.auth.roles?.forEach(role => {
              byRole[role] = (byRole[role] || 0) + 1;
            });
          } else {
            publicEndpoints++;
          }
        });
      });
    });

    return {
      authenticated,
      public: publicEndpoints,
      byRole,
    };
  }

  private convertToYaml(obj: any, indent: number = 0): string {
    const spaces = '  '.repeat(indent);
    let yaml = '';

    if (Array.isArray(obj)) {
      for (const item of obj) {
        yaml += `${spaces}- `;
        if (typeof item === 'object' && item !== null) {
          yaml += '\n' + this.convertToYaml(item, indent + 1);
        } else {
          yaml += `${item}\n`;
        }
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        yaml += `${spaces}${key}:`;
        if (Array.isArray(value)) {
          yaml += '\n' + this.convertToYaml(value, indent + 1);
        } else if (typeof value === 'object' && value !== null) {
          yaml += '\n' + this.convertToYaml(value, indent + 1);
        } else {
          yaml += ` ${value}\n`;
        }
      }
    }

    return yaml;
  }
}

// Función principal
async function main() {
  try {
    const analyzer = new ImprovedControllerAnalyzer();
    await analyzer.generateDocumentation();
  } catch (error) {
    console.error('❌ Error generando documentación:', error);
    process.exit(1);
  }
}

// Ejecutar si este archivo es llamado directamente
if (require.main === module) {
  main();
}

export { ImprovedControllerAnalyzer };