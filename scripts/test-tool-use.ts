/**
 * Script de prueba para verificar Tool Use (Function Calling) del LLM
 *
 * Uso:
 *   npx ts-node scripts/test-tool-use.ts
 *
 * Asegúrate de tener GROQ_API_KEY en tu .env
 */

import * as dotenv from 'dotenv';
import Groq from 'groq-sdk';
import axios from 'axios';

// Cargar variables de entorno
dotenv.config();

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function log(message: string, color: string = colors.reset): void {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Tool definition para fetch_page_content
 */
const FETCH_PAGE_TOOL: Groq.Chat.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'fetch_page_content',
    description:
      'Obtiene el contenido de una página del sitio web. Usar cuando necesites información específica sobre productos, servicios, precios, contacto, etc.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description:
            'Ruta relativa de la página (ej: /productos, /servicios, /contacto)',
        },
      },
      required: ['path'],
    },
  },
};

/**
 * Simula el fetch de contenido web via Jina Reader
 */
async function fetchPageContent(
  baseDomain: string,
  path: string,
): Promise<string> {
  const fullUrl = `https://${baseDomain}${path.startsWith('/') ? path : '/' + path}`;
  const jinaUrl = `https://r.jina.ai/${encodeURIComponent(fullUrl)}`;

  log(`\n   📡 Fetching: ${fullUrl}`, colors.cyan);
  log(`   🔗 Via Jina: ${jinaUrl}`, colors.cyan);

  try {
    const response = await axios.get(jinaUrl, {
      timeout: 15000,
      headers: {
        Accept: 'text/markdown',
        'User-Agent': 'Guiders-Bot/1.0 (Tool Use Test)',
      },
    });

    const content = response.data as string;
    const truncated =
      content.length > 5000 ? content.substring(0, 5000) + '\n...[truncado]' : content;

    log(`   ✅ Contenido obtenido: ${content.length} caracteres`, colors.green);

    return truncated;
  } catch (error: any) {
    log(`   ❌ Error fetching: ${error.message}`, colors.red);
    return `Error al obtener contenido: ${error.message}`;
  }
}

/**
 * Test principal de Tool Use
 */
async function testToolUse(testDomain: string): Promise<void> {
  log('\n' + '='.repeat(60), colors.bright);
  log('  TEST DE TOOL USE - fetch_page_content', colors.bright);
  log('='.repeat(60), colors.bright);

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    log('\n❌ ERROR: GROQ_API_KEY no está configurada en .env', colors.red);
    process.exit(1);
  }

  const client = new Groq({ apiKey });

  // Mensaje que debería disparar el uso de tools
  const userMessage = '¿Cuáles son los productos o servicios que ofrecéis?';

  log(`\n📝 Dominio de prueba: ${testDomain}`, colors.yellow);
  log(`💬 Mensaje del visitante: "${userMessage}"`, colors.yellow);

  const messages: Groq.Chat.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: `Eres un asistente de atención al cliente para el sitio web ${testDomain}.
Tu objetivo es ayudar a los visitantes respondiendo sus preguntas.
Cuando necesites información específica del sitio (productos, servicios, precios, etc.),
usa la herramienta fetch_page_content para obtener el contenido actualizado.
Responde siempre en español de forma amable y profesional.`,
    },
    {
      role: 'user',
      content: userMessage,
    },
  ];

  let iteration = 0;
  const maxIterations = 3;

  while (iteration < maxIterations) {
    iteration++;
    log(`\n${'─'.repeat(50)}`, colors.blue);
    log(`🔄 Iteración ${iteration}/${maxIterations}`, colors.blue);

    try {
      const startTime = Date.now();

      const response = await client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages,
        tools: [FETCH_PAGE_TOOL],
        tool_choice: 'auto',
        max_tokens: 1000,
        temperature: 0.7,
      });

      const elapsed = Date.now() - startTime;
      const choice = response.choices[0];

      log(`   ⏱️  Tiempo: ${elapsed}ms`, colors.cyan);
      log(
        `   🎯 Finish reason: ${choice.finish_reason}`,
        choice.finish_reason === 'tool_calls' ? colors.magenta : colors.green,
      );

      // Si el modelo quiere usar tools
      if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls) {
        log(`\n   🔧 Tool calls solicitados:`, colors.magenta);

        // Agregar el mensaje del asistente con tool_calls
        messages.push({
          role: 'assistant',
          content: choice.message.content,
          tool_calls: choice.message.tool_calls,
        });

        // Ejecutar cada tool call
        for (const toolCall of choice.message.tool_calls) {
          log(`\n   📌 Tool: ${toolCall.function.name}`, colors.magenta);
          log(`   📎 Args: ${toolCall.function.arguments}`, colors.magenta);

          const args = JSON.parse(toolCall.function.arguments);
          const content = await fetchPageContent(testDomain, args.path);

          // Agregar resultado del tool
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content,
          });
        }
      } else {
        // Respuesta final
        log(`\n${'═'.repeat(60)}`, colors.green);
        log('✅ RESPUESTA FINAL DEL LLM:', colors.green);
        log('═'.repeat(60), colors.green);
        log(`\n${choice.message.content}`, colors.bright);
        log(`\n${'═'.repeat(60)}`, colors.green);

        log(`\n📊 Estadísticas:`, colors.yellow);
        log(`   • Iteraciones: ${iteration}`, colors.yellow);
        log(`   • Modelo: ${response.model}`, colors.yellow);
        log(`   • Tokens: ${response.usage?.total_tokens || 'N/A'}`, colors.yellow);

        return;
      }
    } catch (error: any) {
      log(`\n❌ Error: ${error.message}`, colors.red);
      process.exit(1);
    }
  }

  log(`\n⚠️ Se alcanzó el máximo de iteraciones (${maxIterations})`, colors.yellow);
}

/**
 * Test sin tools (para comparar)
 */
async function testWithoutTools(testDomain: string): Promise<void> {
  log('\n' + '='.repeat(60), colors.bright);
  log('  TEST SIN TOOLS (comparación)', colors.bright);
  log('='.repeat(60), colors.bright);

  const apiKey = process.env.GROQ_API_KEY;
  const client = new Groq({ apiKey: apiKey! });

  const userMessage = '¿Cuáles son los productos o servicios que ofrecéis?';

  try {
    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `Eres un asistente de atención al cliente para el sitio web ${testDomain}.
Responde siempre en español de forma amable y profesional.`,
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    log(`\n💬 Respuesta SIN tools:`, colors.yellow);
    log(`\n${response.choices[0]?.message?.content}`, colors.reset);
  } catch (error: any) {
    log(`\n❌ Error: ${error.message}`, colors.red);
  }
}

/**
 * Main
 */
async function main(): Promise<void> {
  // Dominio de prueba - cambiar según necesidad
  const testDomain = process.argv[2] || 'apple.com';

  console.log('\n' + '═'.repeat(60));
  console.log('  🧪 GUIDERS - Test de Tool Use (Function Calling)');
  console.log('═'.repeat(60));
  console.log(`\n📌 Uso: npx ts-node scripts/test-tool-use.ts [dominio]`);
  console.log(`   Ejemplo: npx ts-node scripts/test-tool-use.ts example.com`);

  // Test con tools
  await testToolUse(testDomain);

  // Preguntar si quiere ver comparación
  log('\n' + '─'.repeat(60), colors.blue);
  log('¿Quieres ver la respuesta SIN tools para comparar? (automático en 3s...)', colors.blue);

  await new Promise((resolve) => setTimeout(resolve, 3000));
  await testWithoutTools(testDomain);

  log('\n' + '═'.repeat(60), colors.bright);
  log('✅ Test completado', colors.green);
  log('═'.repeat(60), colors.bright);
}

main().catch(console.error);
