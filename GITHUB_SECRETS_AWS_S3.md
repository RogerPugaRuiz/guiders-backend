# Configuración de Secrets AWS S3 en GitHub Actions

Este documento describe los secrets que deben configurarse en GitHub para que la funcionalidad de upload de avatares funcione correctamente en staging y producción.

## Ubicación en GitHub

Ve a tu repositorio → **Settings** → **Secrets and variables** → **Actions** → **Repository secrets**

## Secrets requeridos para Staging

Los siguientes secrets deben configurarse con el prefijo `STAGING_`:

### 1. `STAGING_AWS_ACCESS_KEY_ID`
- **Descripción**: Access Key ID de AWS IAM para staging
- **Ejemplo**: `AKIAIOSFODNN7EXAMPLE`
- **Cómo obtenerlo**: AWS Console → IAM → Users → [tu usuario] → Security credentials → Create access key

### 2. `STAGING_AWS_SECRET_ACCESS_KEY`
- **Descripción**: Secret Access Key de AWS IAM para staging
- **Ejemplo**: `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`
- **Cómo obtenerlo**: Se obtiene junto con el Access Key ID (solo se muestra una vez)

### 3. `STAGING_AWS_REGION` (opcional)
- **Descripción**: Región de AWS donde está el bucket S3
- **Default**: `eu-north-1`
- **Ejemplo**: `eu-north-1`, `us-east-1`, `eu-west-1`

### 4. `STAGING_AWS_S3_BUCKET_NAME`
- **Descripción**: Nombre del bucket S3 para staging
- **Ejemplo**: `guiders-avatars-staging`
- **Cómo crear**: AWS Console → S3 → Create bucket

### 5. `STAGING_AWS_S3_AVATAR_FOLDER` (opcional)
- **Descripción**: Carpeta dentro del bucket donde se guardan avatares
- **Default**: `avatars`
- **Ejemplo**: `avatars`, `user-avatars`, `profile-pictures`

## Secrets requeridos para Producción

Los siguientes secrets deben configurarse con el prefijo `PROD_`:

### 1. `PROD_AWS_ACCESS_KEY_ID`
- **Descripción**: Access Key ID de AWS IAM para producción
- **Ejemplo**: `AKIAIOSFODNN7EXAMPLE`

### 2. `PROD_AWS_SECRET_ACCESS_KEY`
- **Descripción**: Secret Access Key de AWS IAM para producción
- **Ejemplo**: `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`

### 3. `PROD_AWS_REGION` (opcional)
- **Descripción**: Región de AWS donde está el bucket S3
- **Default**: `eu-north-1`

### 4. `PROD_AWS_S3_BUCKET_NAME`
- **Descripción**: Nombre del bucket S3 para producción
- **Ejemplo**: `guiders-avatars-prod`

### 5. `PROD_AWS_S3_AVATAR_FOLDER` (opcional)
- **Descripción**: Carpeta dentro del bucket donde se guardan avatares
- **Default**: `avatars`

## Configuración del Bucket S3 en AWS

### Paso 1: Crear el Bucket
```bash
# Desde AWS CLI (opcional)
aws s3api create-bucket \
  --bucket guiders-avatars-staging \
  --region eu-north-1 \
  --create-bucket-configuration LocationConstraint=eu-north-1
```

### Paso 2: Configurar permisos del Bucket

El bucket debe tener:
- **Block Public Access**: Desactivado (para permitir lectura pública)
- **Bucket Policy**: Permitir lectura pública en la carpeta `avatars/`

Ejemplo de Bucket Policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::guiders-avatars-staging/avatars/*"
    }
  ]
}
```

### Paso 3: Configurar CORS (si es necesario)

Si el frontend necesita subir archivos directamente desde el navegador:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["https://guiders.es", "https://staging.guiders.es"],
    "ExposeHeaders": ["ETag"]
  }
]
```

## Configuración de usuario IAM

### Permisos mínimos requeridos

El usuario IAM debe tener la siguiente política:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::guiders-avatars-staging/avatars/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::guiders-avatars-staging"
    }
  ]
}
```

## Verificación

Una vez configurados los secrets, puedes verificar que funcionan:

1. Haz push a la rama `develop` para staging
2. Ve a **Actions** en GitHub y verifica que el workflow se ejecuta sin errores
3. Verifica que el archivo `.env.staging` se genera con las variables:
   ```
   AWS_ACCESS_KEY_ID=xxx
   AWS_SECRET_ACCESS_KEY=xxx
   AWS_REGION=eu-north-1
   AWS_S3_BUCKET_NAME=guiders-avatars-staging
   AWS_S3_AVATAR_FOLDER=avatars
   ```

## Troubleshooting

### Error: "The AWS Access Key Id you provided does not exist"
- Verifica que `STAGING_AWS_ACCESS_KEY_ID` está correctamente configurado
- Asegúrate de que las credenciales no han expirado

### Error: "Access Denied"
- Verifica que el usuario IAM tiene los permisos correctos
- Verifica que la política del bucket permite escritura

### Error: "The specified bucket does not exist"
- Verifica que `STAGING_AWS_S3_BUCKET_NAME` está correctamente configurado
- Verifica que el bucket existe en la región correcta

## Seguridad

⚠️ **Importante**:
- Nunca commitees las credenciales de AWS en el código
- Usa diferentes credenciales para staging y producción
- Rota las credenciales periódicamente
- Revisa los logs de CloudTrail para detectar accesos no autorizados
- Usa roles de IAM con permisos mínimos

## Referencias

- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [S3 Bucket Policies](https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-policies.html)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
