#!/usr/bin/env node

/**
 * Script de ejemplo para configurar reglas de asignación en MongoDB
 * 
 * Uso:
 * node create-assignment-rules-example.js
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/guiders-dev';

const exampleRules = [
  // Reglas generales para empresa
  {
    id: 'company-demo-123',
    companyId: 'company-demo-123',
    siteId: undefined,
    defaultStrategy: 'ROUND_ROBIN',
    maxChatsPerCommercial: 5,
    maxWaitTimeSeconds: 300,
    enableSkillBasedRouting: false,
    workingHours: {
      timezone: 'Europe/Madrid',
      schedule: [
        { dayOfWeek: 1, startTime: '09:00', endTime: '18:00' }, // Lunes
        { dayOfWeek: 2, startTime: '09:00', endTime: '18:00' }, // Martes
        { dayOfWeek: 3, startTime: '09:00', endTime: '18:00' }, // Miércoles
        { dayOfWeek: 4, startTime: '09:00', endTime: '18:00' }, // Jueves
        { dayOfWeek: 5, startTime: '09:00', endTime: '18:00' }, // Viernes
      ],
    },
    fallbackStrategy: 'RANDOM',
    priorities: new Map(Object.entries({
      general: 1,
      support: 2,
    })),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  
  // Reglas específicas para sitio VIP
  {
    id: 'company-demo-123:site-vip-456',
    companyId: 'company-demo-123',
    siteId: 'site-vip-456',
    defaultStrategy: 'SKILL_BASED',
    maxChatsPerCommercial: 3,
    maxWaitTimeSeconds: 180,
    enableSkillBasedRouting: true,
    workingHours: {
      timezone: 'Europe/Madrid',
      schedule: [
        { dayOfWeek: 1, startTime: '08:00', endTime: '20:00' }, // Lunes - Horario extendido
        { dayOfWeek: 2, startTime: '08:00', endTime: '20:00' }, // Martes
        { dayOfWeek: 3, startTime: '08:00', endTime: '20:00' }, // Miércoles
        { dayOfWeek: 4, startTime: '08:00', endTime: '20:00' }, // Jueves
        { dayOfWeek: 5, startTime: '08:00', endTime: '20:00' }, // Viernes
        { dayOfWeek: 6, startTime: '10:00', endTime: '16:00' }, // Sábado - Soporte parcial
      ],
    },
    fallbackStrategy: 'WORKLOAD_BALANCED',
    priorities: new Map(Object.entries({
      vip: 10,
      premium: 8,
      technical: 6,
      billing: 5,
      general: 1,
    })),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // Reglas para empresa con soporte 24/7
  {
    id: 'company-support-247',
    companyId: 'company-support-247',
    siteId: undefined,
    defaultStrategy: 'WORKLOAD_BALANCED',
    maxChatsPerCommercial: 8,
    maxWaitTimeSeconds: 120,
    enableSkillBasedRouting: true,
    workingHours: undefined, // Sin horarios = 24/7
    fallbackStrategy: 'ROUND_ROBIN',
    priorities: new Map(Object.entries({
      emergency: 20,
      critical: 15,
      urgent: 10,
      normal: 5,
      low: 1,
    })),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

async function createExampleRules() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB');
    
    const db = client.db();
    const collection = db.collection('assignment_rules');
    
    // Limpiar datos existentes de ejemplo (opcional)
    const deleteResult = await collection.deleteMany({ 
      companyId: { $in: ['company-demo-123', 'company-support-247'] } 
    });
    console.log(`🗑️ Eliminadas ${deleteResult.deletedCount} reglas existentes`);
    
    // Insertar reglas de ejemplo
    const insertResult = await collection.insertMany(exampleRules);
    console.log(`✅ Insertadas ${insertResult.insertedCount} reglas de ejemplo`);
    
    // Verificar creación
    const count = await collection.countDocuments();
    console.log(`📊 Total de reglas en colección: ${count}`);
    
    // Mostrar reglas creadas
    console.log('\n📋 Reglas creadas:');
    const createdRules = await collection.find({
      companyId: { $in: ['company-demo-123', 'company-support-247'] }
    }).toArray();
    
    createdRules.forEach(rule => {
      console.log(`  - ${rule.id}: ${rule.defaultStrategy} (max: ${rule.maxChatsPerCommercial} chats, wait: ${rule.maxWaitTimeSeconds}s)`);
      if (rule.siteId) {
        console.log(`    └─ Sitio específico: ${rule.siteId}`);
      }
      if (rule.workingHours) {
        console.log(`    └─ Horarios: ${rule.workingHours.schedule.length} días configurados`);
      } else {
        console.log(`    └─ Disponibilidad: 24/7`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✅ Desconectado de MongoDB');
  }
}

if (require.main === module) {
  createExampleRules()
    .then(() => {
      console.log('\n🎉 Reglas de asignación de ejemplo creadas exitosamente');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { createExampleRules, exampleRules };