# Stage 1: Build
FROM node:slim AS builder

# Directorio de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias de desarrollo y producción
RUN npm install --legacy-peer-deps

# Copiar el resto del código fuente
COPY . .

# Compilar la aplicación NestJS
RUN npm run build

# Stage 2: Producción
FROM node:slim AS production

WORKDIR /app

# Copiar solo los archivos necesarios desde el builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist

# Instalar solo dependencias de producción
RUN npm install --only=production --legacy-peer-deps

# Copiar el archivo de entorno si existe (opcional, se puede montar desde fuera)
# COPY .env.production .env.production

# Exponer el puerto de la app
EXPOSE 3000

# Comando de inicio
CMD ["npm", "run", "start:prod"]
