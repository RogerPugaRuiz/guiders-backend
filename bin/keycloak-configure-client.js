#!/usr/bin/env node
/*
  Configura automáticamente el cliente OIDC en Keycloak para entorno local:
  - Establece redirectUris y webOrigins
  - Asegura cliente público y flujo estándar habilitado

  Uso:
    node bin/keycloak-configure-client.js
*/
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Carga simple de .env (sin dependencia externa)
function loadEnvFromDotEnv() {
  try {
    const envPath = path.resolve(__dirname, '..', '.env');
    const content = fs.readFileSync(envPath, 'utf-8');
    content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
      .forEach((line) => {
        const eq = line.indexOf('=');
        if (eq === -1) return;
        const k = line.substring(0, eq).trim();
        let v = line.substring(eq + 1).trim();
        // Quitar comillas si existieran
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.substring(1, v.length - 1);
        }
        if (!process.env[k]) process.env[k] = v;
      });
  } catch (_) {
    // ignore
  }
}

loadEnvFromDotEnv();

async function main() {
  const base = process.env.KEYCLOAK_URL || `http://localhost:${process.env.KEYCLOAK_PORT || '8080'}`;
  const realm = process.env.KEYCLOAK_REALM || 'guiders';
  const adminUser = process.env.KEYCLOAK_ADMIN_USERNAME || 'admin';
  const adminPass = process.env.KEYCLOAK_ADMIN_PASSWORD || 'admin123';
  const clientId = process.env.KEYCLOAK_CLIENT_ID || process.env.OIDC_CLIENT_ID || 'console';

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const redirectUri = process.env.OIDC_REDIRECT_URI || `${appUrl.replace(/\/$/, '')}/api/bff/auth/callback/${clientId}`;

  // En local añadimos orígenes típicos
  const webOrigins = [appUrl, 'http://localhost:4200'];
  // Permitimos comodín solo en desarrollo (no recomendado en prod)
  if ((process.env.NODE_ENV || 'development') !== 'production') {
    webOrigins.push('*');
  }

  const redirectUris = [redirectUri];
  if ((process.env.NODE_ENV || 'development') !== 'production') {
    redirectUris.push('http://localhost:3000/*');
  }

  // Obtener token admin (realm master)
  const tokenRes = await axios.post(
    `${base}/realms/master/protocol/openid-connect/token`,
    new URLSearchParams({
      grant_type: 'password',
      client_id: 'admin-cli',
      username: adminUser,
      password: adminPass,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
  );
  const accessToken = tokenRes.data.access_token;

  const kc = axios.create({
    baseURL: `${base}/admin/realms/${encodeURIComponent(realm)}`,
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  // Buscar cliente
  const search = await kc.get(`/clients`, { params: { clientId } });
  let client = search.data && search.data[0];

  if (!client) {
    // Crear cliente público con flujo estándar
    const createRes = await kc.post('/clients', {
      clientId,
      protocol: 'openid-connect',
      publicClient: true,
      standardFlowEnabled: true,
      directAccessGrantsEnabled: false,
      serviceAccountsEnabled: false,
      redirectUris,
      webOrigins,
      attributes: { 'pkce.code.challenge.method': 'S256' },
    });
    // Obtenerlo de nuevo para conseguir id
    const after = await kc.get(`/clients`, { params: { clientId } });
    client = after.data && after.data[0];
    if (!client) throw new Error('No se pudo crear el cliente en Keycloak');
    console.log(`Cliente creado: ${client.clientId}`);
  } else {
    // Actualizar cliente existente
    const id = client.id;
    // Mezclar con valores actuales para no borrar otros campos críticos
    const updated = {
      ...client,
      publicClient: true,
      standardFlowEnabled: true,
      directAccessGrantsEnabled: false,
      serviceAccountsEnabled: false,
      redirectUris: Array.from(new Set([...(client.redirectUris || []), ...redirectUris])),
      webOrigins: Array.from(new Set([...(client.webOrigins || []), ...webOrigins])),
      attributes: { ...(client.attributes || {}), 'pkce.code.challenge.method': 'S256' },
    };
    await kc.put(`/clients/${encodeURIComponent(id)}`, updated);
    console.log(`Cliente actualizado: ${client.clientId}`);
  }

  console.log('Resumen configuración aplicada:');
  console.log(`- Realm: ${realm}`);
  console.log(`- Client ID: ${clientId}`);
  console.log(`- redirectUris: ${JSON.stringify(redirectUris)}`);
  console.log(`- webOrigins: ${JSON.stringify(webOrigins)}`);
  console.log('Listo. Reintenta el login desde /api/bff/auth/login');
}

main().catch((e) => {
  console.error('Error configurando Keycloak:', e.response?.data || e.message || e);
  process.exit(1);
});
