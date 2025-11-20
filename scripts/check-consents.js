#!/usr/bin/env node
/**
 * Script para verificar consentimientos registrados en MongoDB
 *
 * Uso:
 *   node scripts/check-consents.js <visitorId>
 *
 * Ejemplo:
 *   node scripts/check-consents.js 4bb44f8d-0e2d-4d5a-8836-8e11f50fb1be
 */

const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/guiders';

async function checkConsents(visitorId) {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB');

    const db = client.db();

    // Verificar colección visitor_consents
    console.log('\n📋 Verificando colección: visitor_consents');
    const consents = await db
      .collection('visitor_consents')
      .find({ visitorId })
      .sort({ createdAt: -1 })
      .toArray();

    console.log(`Total de consentimientos encontrados: ${consents.length}`);

    if (consents.length > 0) {
      consents.forEach((consent, index) => {
        console.log(`\n--- Consentimiento ${index + 1} ---`);
        console.log(`ID: ${consent._id}`);
        console.log(`VisitorId: ${consent.visitorId}`);
        console.log(`Tipo: ${consent.consentType}`);
        console.log(`Estado: ${consent.status}`);
        console.log(`Versión: ${consent.version}`);
        console.log(`Otorgado: ${consent.grantedAt}`);
        console.log(`Expira: ${consent.expiresAt}`);
        console.log(`IP: ${consent.ipAddress}`);
        console.log(`User-Agent: ${consent.userAgent}`);
        console.log(`Metadata:`, JSON.stringify(consent.metadata, null, 2));
        console.log(`Creado: ${consent.createdAt}`);
      });
    } else {
      console.log('❌ No se encontraron consentimientos para este visitante');
    }

    // Verificar colección consent_audit_logs
    console.log('\n📋 Verificando colección: consent_audit_logs');
    const auditLogs = await db
      .collection('consent_audit_logs')
      .find({ visitorId })
      .sort({ timestamp: -1 })
      .toArray();

    console.log(`Total de audit logs encontrados: ${auditLogs.length}`);

    if (auditLogs.length > 0) {
      auditLogs.forEach((log, index) => {
        console.log(`\n--- Audit Log ${index + 1} ---`);
        console.log(`ID: ${log._id}`);
        console.log(`ConsentId: ${log.consentId}`);
        console.log(`VisitorId: ${log.visitorId}`);
        console.log(`Acción: ${log.actionType}`);
        console.log(`Tipo: ${log.consentType}`);
        console.log(`Timestamp: ${log.timestamp}`);
        console.log(`IP: ${log.ipAddress}`);
      });
    } else {
      console.log('❌ No se encontraron audit logs para este visitante');
    }

    // Verificar visitante en visitors_v2
    console.log('\n📋 Verificando visitante en colección: visitors_v2');
    const visitor = await db
      .collection('visitors_v2')
      .findOne({ _id: visitorId });

    if (visitor) {
      console.log('✅ Visitante encontrado');
      console.log(`ID: ${visitor._id}`);
      console.log(`Fingerprint: ${visitor.fingerprint}`);
      console.log(`SiteId: ${visitor.siteId}`);
      console.log(`TenantId: ${visitor.tenantId}`);
      console.log(`Lifecycle: ${visitor.lifecycle}`);
      console.log(`Sesiones activas: ${visitor.sessions?.length || 0}`);

      if (visitor.consent) {
        console.log('\n📝 Información de consentimiento en el agregado:');
        console.log(`  - hasAcceptedPrivacyPolicy: ${visitor.consent.hasAcceptedPrivacyPolicy}`);
        console.log(`  - privacyPolicyVersion: ${visitor.consent.privacyPolicyVersion}`);
        console.log(`  - acceptedAt: ${visitor.consent.acceptedAt}`);
      } else {
        console.log('❌ El visitante NO tiene información de consentimiento en el agregado');
      }
    } else {
      console.log('❌ Visitante no encontrado');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Main
const visitorId = process.argv[2];

if (!visitorId) {
  console.error('❌ Error: Debes proporcionar un visitorId');
  console.log('\nUso:');
  console.log('  node scripts/check-consents.js <visitorId>');
  console.log('\nEjemplo:');
  console.log('  node scripts/check-consents.js 4bb44f8d-0e2d-4d5a-8836-8e11f50fb1be');
  process.exit(1);
}

console.log(`🔍 Buscando consentimientos para visitante: ${visitorId}\n`);
checkConsents(visitorId);
