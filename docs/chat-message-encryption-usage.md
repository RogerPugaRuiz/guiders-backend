# Uso del Servicio de Encriptación de Mensajes de Chat

## Descripción
El servicio `ChatMessageEncryptorService` proporciona funcionalidad para encriptar y desencriptar mensajes de chat utilizando el algoritmo AES-256-CBC con vectores de inicialización (IV) únicos.

## Configuración

### Variable de Entorno
Asegúrate de configurar la variable de entorno `ENCRYPTION_KEY` con una clave de 64 caracteres hexadecimales (32 bytes):

```bash
ENCRYPTION_KEY=a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2
```

### Generación de Clave
Puedes generar una clave válida usando Node.js:

```javascript
const crypto = require('crypto');
const key = crypto.randomBytes(32).toString('hex');
console.log(key); // Resultado: 64 caracteres hexadecimales
```

## Uso del Servicio

### Inyección de Dependencias
```typescript
import { Injectable } from '@nestjs/common';
import { ChatMessageEncryptorService } from '../infrastructure/chat-message-encryptor.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly chatMessageEncryptor: ChatMessageEncryptorService,
  ) {}
}
```

### Encriptar un Mensaje
```typescript
async encryptMessage(message: string): Promise<string> {
  try {
    const encryptedMessage = await this.chatMessageEncryptor.encrypt(message);
    console.log('Mensaje encriptado:', encryptedMessage);
    // Formato: v1:iv:datos_encriptados
    return encryptedMessage;
  } catch (error) {
    console.error('Error al encriptar:', error);
    throw error;
  }
}
```

### Desencriptar un Mensaje
```typescript
async decryptMessage(encryptedMessage: string): Promise<string> {
  try {
    const decryptedMessage = await this.chatMessageEncryptor.decrypt(encryptedMessage);
    console.log('Mensaje desencriptado:', decryptedMessage);
    return decryptedMessage;
  } catch (error) {
    console.error('Error al desencriptar:', error);
    throw error;
  }
}
```

### Ejemplo Completo
```typescript
async handleChatMessage(originalMessage: string): Promise<void> {
  // 1. Encriptar el mensaje antes de guardarlo
  const encryptedMessage = await this.chatMessageEncryptor.encrypt(originalMessage);
  
  // 2. Guardar el mensaje encriptado en la base de datos
  await this.chatRepository.save({
    content: encryptedMessage,
    timestamp: new Date(),
  });
  
  // 3. Para mostrar el mensaje, desencriptarlo
  const decryptedMessage = await this.chatMessageEncryptor.decrypt(encryptedMessage);
  
  console.log('Original:', originalMessage);
  console.log('Encriptado:', encryptedMessage);
  console.log('Desencriptado:', decryptedMessage);
}
```

## Formatos Soportados

### Formato Actual (v1)
```
v1:a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6:ZGF0b3NfZW5jcmlwdGFkb3M=
```
- `v1`: Versión del formato
- `a1b2...`: Vector de inicialización (IV) en hexadecimal
- `ZGF0...`: Datos encriptados en Base64

### Formato Legacy (compatibilidad hacia atrás)
```
a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6:ZGF0b3NfZW5jcmlwdGFkb3M=
```
- `a1b2...`: Vector de inicialización (IV) en hexadecimal
- `ZGF0...`: Datos encriptados en Base64

## Seguridad

### Características de Seguridad
- **AES-256-CBC**: Algoritmo de encriptación robusto
- **IV único**: Cada encriptación usa un vector de inicialización diferente
- **Validación de clave**: La clave debe ser exactamente de 32 bytes (64 hex chars)
- **Manejo de errores**: Logging seguro sin exponer datos sensibles

### Buenas Prácticas
1. **Rotar claves**: Cambia la clave de encriptación periódicamente
2. **Backup seguro**: Mantén respaldos seguros de las claves de encriptación
3. **Variables de entorno**: Nunca hardcodees la clave en el código
4. **Logging**: Los logs no exponen mensajes desencriptados ni claves

## Logging y Auditoría

El servicio registra automáticamente:
- Operaciones de encriptación exitosas
- Errores de desencriptación (sin exponer datos sensibles)
- Metadata de contexto (userId, messageId cuando estén disponibles)

Ejemplo de log:
```
[ChatMessageEncryptorService] Mensaje de chat encriptado exitosamente
[ChatMessageEncryptorService] Error al desencriptar mensaje de chat
```

## Manejo de Errores

### Errores Comunes
- `ENCRYPTION_KEY must be 64 hexadecimal characters (32 bytes)`: Clave inválida
- `Invalid encrypted message format`: Formato de mensaje encriptado incorrecto
- `Decryption failed`: Error durante el proceso de desencriptación

### Recomendaciones
- Siempre usar try-catch para manejar errores de encriptación/desencriptación
- Validar el formato de los mensajes encriptados antes de intentar desencriptarlos
- Implementar fallbacks para mensajes que no se puedan desencriptar

---
*Fecha: 06/06/2025*
*Versión: 1.0*
