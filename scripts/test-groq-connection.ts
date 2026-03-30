/**
 * Script de prueba para verificar la conexión con Groq
 *
 * Uso:
 *   npx ts-node scripts/test-groq-connection.ts
 *
 * Asegúrate de tener GROQ_API_KEY en tu .env
 */

import * as dotenv from 'dotenv';
import Groq from 'groq-sdk';

// Cargar variables de entorno
dotenv.config();

async function testGroqConnection(): Promise<void> {
  console.log('🔍 Verificando configuración de Groq...\n');

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    console.error('❌ ERROR: GROQ_API_KEY no está configurada en .env');
    console.log('\n📝 Para obtener una API key:');
    console.log('   1. Ve a https://console.groq.com/');
    console.log('   2. Crea una cuenta o inicia sesión');
    console.log('   3. Ve a API Keys y genera una nueva');
    console.log('   4. Añade a tu .env: GROQ_API_KEY=gsk_...');
    process.exit(1);
  }

  console.log('✅ GROQ_API_KEY encontrada');
  console.log(`   Prefijo: ${apiKey.substring(0, 10)}...`);

  const client = new Groq({ apiKey });

  console.log('\n📡 Probando conexión con Groq API...\n');

  try {
    const startTime = Date.now();

    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'Eres un asistente de prueba. Responde de forma muy breve.',
        },
        {
          role: 'user',
          content: 'Hola, ¿funciona la conexión? Responde solo "Sí, funciona correctamente"',
        },
      ],
      max_tokens: 50,
      temperature: 0.1,
    });

    const elapsed = Date.now() - startTime;
    const content = response.choices[0]?.message?.content;

    console.log('✅ Conexión exitosa!\n');
    console.log('📊 Detalles de la respuesta:');
    console.log(`   Modelo: ${response.model}`);
    console.log(`   Tokens usados: ${response.usage?.total_tokens || 'N/A'}`);
    console.log(`   Tiempo de respuesta: ${elapsed}ms`);
    console.log(`\n💬 Respuesta del LLM:`);
    console.log(`   "${content}"`);

    console.log('\n🎉 La integración con Groq está funcionando correctamente!');

  } catch (error: any) {
    console.error('❌ Error al conectar con Groq:\n');

    if (error.status === 401) {
      console.error('   🔑 API Key inválida o expirada');
      console.error('   Verifica tu GROQ_API_KEY en .env');
    } else if (error.status === 429) {
      console.error('   ⏱️ Rate limit excedido');
      console.error('   Espera unos segundos e intenta de nuevo');
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.error('   🌐 Error de red - no se puede conectar a Groq');
      console.error('   Verifica tu conexión a internet');
    } else {
      console.error(`   ${error.message || error}`);
    }

    process.exit(1);
  }
}

// Test adicional: probar generación de sugerencias
async function testSuggestions(): Promise<void> {
  console.log('\n' + '='.repeat(50));
  console.log('📝 Probando generación de sugerencias...\n');

  const apiKey = process.env.GROQ_API_KEY;
  const client = new Groq({ apiKey });

  try {
    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `Eres un asistente que genera sugerencias de respuesta para comerciales.
Genera exactamente 3 sugerencias de respuesta, numeradas del 1 al 3.
Cada sugerencia debe ser concisa (1-2 oraciones).`,
        },
        {
          role: 'user',
          content: 'El cliente pregunta: "¿Cuánto cuesta el servicio premium?"',
        },
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content;

    console.log('✅ Sugerencias generadas:\n');
    console.log(content);

  } catch (error: any) {
    console.error('❌ Error generando sugerencias:', error.message);
  }
}

// Ejecutar tests
async function main(): Promise<void> {
  console.log('='.repeat(50));
  console.log('  TEST DE CONEXIÓN GROQ - guiders-backend');
  console.log('='.repeat(50) + '\n');

  await testGroqConnection();
  await testSuggestions();

  console.log('\n' + '='.repeat(50));
  console.log('✅ Todos los tests completados');
  console.log('='.repeat(50));
}

main().catch(console.error);
