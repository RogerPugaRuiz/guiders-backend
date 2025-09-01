# Configuración de Secrets de GitHub para Staging

Esta guía te ayudará a configurar los GitHub Secrets necesarios para activar el deploy real a staging.

## 🔐 **Secrets Requeridos**

Ve a `Settings > Secrets and variables > Actions` en tu repositorio de GitHub y configura:

### **🌐 Servidor y Conexión**
```
STAGING_HOST=staging.tu-dominio.com
STAGING_USER=ubuntu
STAGING_SSH_PASSWORD=tu_password_ssh
```

### **🔒 VPN (Opcional)**
```
STAGING_OVPN_CONFIG=contenido_completo_del_archivo_ovpn
```

### **💾 Base de Datos PostgreSQL**
```
STAGING_DATABASE_HOST=localhost
STAGING_DATABASE_PORT=5432
STAGING_DATABASE_USERNAME=guiders_staging
STAGING_DATABASE_PASSWORD=staging_db_password_seguro
STAGING_DATABASE=guiders_staging
```

### **🗄️ MongoDB**
```
STAGING_MONGODB_DATABASE=guiders_staging
STAGING_MONGODB_PORT=27017
STAGING_MONGODB_ROOT_USERNAME=admin_staging
STAGING_MONGODB_ROOT_PASSWORD=staging_mongo_password_seguro
```

### **⚡ Redis**
```
STAGING_REDIS_PORT=6379
STAGING_REDIS_URL=redis://localhost:6379
```

### **🔑 Aplicación**
```
STAGING_PORT=3000
STAGING_APP_URL=https://staging-api.tu-dominio.com
STAGING_JWKS_BASE_URL=https://staging-api.tu-dominio.com # (Opcional) Si se quiere desacoplar del APP_URL
STAGING_ENCRYPTION_KEY=clave_encriptacion_muy_segura_32_caracteres
STAGING_GLOBAL_TOKEN_SECRET=jwt_secret_muy_seguro_64_caracteres
STAGING_ACCESS_TOKEN_EXPIRATION=15m
STAGING_REFRESH_TOKEN_EXPIRATION=7d
```

## 🚀 **Activar Deploy Real**

Una vez configurados todos los secrets:

1. **Edita el workflow** `.github/workflows/deploy-staging.yml`

2. **Descomenta las líneas reales** y comenta las simuladas:

```yaml
# Cambiar esto:
echo "scp deploy-staging.tar.gz ..."

# Por esto:
sshpass -p "$SSH_PASSWORD" scp -o StrictHostKeyChecking=no deploy-staging.tar.gz .env.staging docker-compose.yml $STAGING_USER@$STAGING_HOST:/var/www/guiders-backend-staging/
```

3. **Actualizar configuración de environment**

```yaml
# Reemplazar valores hardcoded por secrets:
echo 'PORT=${{ secrets.STAGING_PORT }}' > .env.staging
echo 'DATABASE_HOST=${{ secrets.STAGING_DATABASE_HOST }}' >> .env.staging
# ... etc
```

## 📋 **Lista de Verificación**

- [ ] ✅ Servidor de staging configurado y accesible
- [ ] ✅ SSH configurado con usuario y password
- [ ] ✅ Docker y Docker Compose instalados en servidor
- [ ] ✅ PM2 instalado globalmente en servidor
- [ ] ✅ Node.js 20 instalado en servidor
- [ ] ✅ Todos los secrets configurados en GitHub
- [ ] ✅ VPN configurada (si es necesaria)
- [ ] ✅ Dominio staging apuntando al servidor
- [ ] ✅ Comandos sshpass descomentados en workflow

## 🔧 **Comandos de Preparación del Servidor**

En tu servidor de staging, ejecuta:

```bash
# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo apt-get update
sudo apt-get install docker-compose-plugin

# Instalar PM2
sudo npm install -g pm2

# Crear directorio de la aplicación
sudo mkdir -p /var/www/guiders-backend-staging
sudo chown $USER:$USER /var/www/guiders-backend-staging

# Configurar PM2 para arranque automático
pm2 startup
pm2 save
```

## 🌐 **Configuración de Nginx (Opcional)**

Si usas Nginx como proxy reverso:

```nginx
server {
    listen 80;
    server_name staging.tu-dominio.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🔍 **Verificación**

Una vez configurado todo:

1. **Push a develop** - El workflow debería ejecutarse automáticamente
2. **Verificar logs** - Revisar que no hay errores en Actions
3. **Probar URL** - Acceder a `https://staging.tu-dominio.com`
4. **Health check** - Verificar `/api/health` endpoint

## 📞 **Troubleshooting**

\n### Error de conexión SSH\n
```bash
# Verificar conectividad
ssh usuario@staging.tu-dominio.com

# Verificar known_hosts
ssh-keyscan staging.tu-dominio.com
```

\n### Error de Docker\n
```bash
# Verificar servicios
docker ps
docker-compose logs

# Reiniciar servicios
docker-compose down && docker-compose up -d
```

\n### Error de PM2\n
```bash
# Ver procesos
pm2 list

# Ver logs
pm2 logs guiders-backend-staging

# Reiniciar
pm2 restart guiders-backend-staging
```

---

## 🎯 **Diferencias con Producción**

| Aspecto | Staging | Producción |
|---------|---------|------------|
| **Environment** | `NODE_ENV=staging` | `NODE_ENV=production` |
| **Logs** | `LOG_LEVEL=debug` | `LOG_LEVEL=info` |
| **Swagger** | `ENABLE_SWAGGER=true` | `ENABLE_SWAGGER=false` |
| **Secrets** | `STAGING_*` | `PROD_*` |
| **Dominio** | `staging.tu-dominio.com` | `api.tu-dominio.com` |
| **PM2 App** | `guiders-backend-staging` | `guiders-backend` |

Esta configuración te permitirá tener un entorno de staging completamente funcional que replica el comportamiento de producción pero con configuraciones específicas para testing y desarrollo.
