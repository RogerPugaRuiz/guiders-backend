## Reglas

1. Los nombres de las variables y funciones deben ser descriptivos, escritos en inglés y seguir la convención camelCase.
2. Los nombres de los archivos deben estar en inglés y seguir la convención kebab-case.
3. Los comentarios deben ser claros y concisos, explicando el propósito del código.
4. Los nombres de las clases deben estar en inglés y seguir la convención PascalCase.
5. Utilizamos la versión 11 de NestJS.
6. Si no sabes cómo hacer algo, puedes buscar en internet, pero no copies y pegues el código. Debes entenderlo y adaptarlo a nuestro proyecto; si aún no sabes cómo hacerlo, pregunta.
7. No utilices código innecesario o redundante.
8. No uses código de otras personas sin darles crédito.
9. Antes de escribir código, asegúrate de entender el problema, la solución que estás implementando y que tienes toda la información necesaria.
10. Para organizar el proyecto si tienes que crear una nueva carpeta quiero que esta exprese el propósito de su contenido y no sea una carpeta técnica como "utils" o "helpers". Por ejemplo "email" o "auth".
11. Nombres de eventHandlers tienen que tener la siguiente estructura: <newAction>On<oldAction>EventHandler. Por ejemplo: CreateUserOnCreateUserEventHandler.
12. Utiliza DDD (Domain Driven Design) y CQRS (Command Query Responsibility Segregation) para estructurar el código.
13. Para CQRS utiliza la librería @nestjs/cqrs.  
14. Código siempre en inglés pero los comentarios en español.
15. La carpeta `application` debe seguir esta estructura:  
  - application  
  - create  
  - delete  
  - update  
  - find  
  - find-all  
  - events  
16. En los tests, si se requiere un uuid, este debe generarse utilizando la clase `Uuid` ubicada en `src/context/shared/domain/value-objects/uuid.ts`.ç
17. Si modificas un archivo asegúrate que de modificar también su test correspondiente y que el test pase.
