Actúa como un experto en desarrollo backend con NestJS especializado en la librería @nestjs/cqrs. Necesito que me guíes paso a paso para crear un comando utilizando esta librería.
Contexto: Estoy desarrollando un módulo para gestionar usuarios en una aplicación empresarial. El comando que necesito debe encargarse de registrar un nuevo usuario con los siguientes datos: nombre, email y contraseña.
Tarea específica:

1. Genera el archivo del comando con la estructura adecuada (ejemplo: RegisterUserCommand) y muestra su implementación.

2. Crea el handler correspondiente (ejemplo: RegisterUserCommandHandler) y muestra cómo manejar el comando.

3. Registra el handler en el módulo para que NestJS lo detecte.
    - El handler debe de implementar la interfaz ICommandHandler y recibir el comando como parámetro.
    - Si se modifica el estado de una entidad, asegúrate de que se publique un evento de dominio usando la librería @nestjs/cqrs con EventPublisher.

4. Incluye pruebas unitarias del handler.

Responde en formato de bloques de código claros y agrega comentarios explicativos en cada sección.

Pregunta en cada paso la información necesaria para continuar. Por ejemplo, si necesitas detalles sobre la estructura del módulo o si hay alguna dependencia específica que deba considerarse.

El comando tiene que tener todas las propiedades en una variable publica de solo lectura definida en el constructor que se llamara "params".
