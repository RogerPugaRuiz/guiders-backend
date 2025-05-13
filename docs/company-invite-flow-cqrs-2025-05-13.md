# Flujo abstracto para creación de compañía y envío de invitación (CQRS)

1. [x] Recibir desde CLI los datos básicos: nombre de la compañía, dominio, nombre, email y teléfono del administrador (sin password).
2. [~] Enviar un Command para crear la compañía y el usuario administrador asociado (password vacío o placeholder).
3. [ ] Generar un token de invitación único con caducidad (por ejemplo, 24 horas) mediante un Command.
4. [ ] Persistir el token de invitación (en una tabla de invitaciones o como campo en el usuario) mediante un Command.
5. [ ] Enviar un correo al administrador con la URL de invitación que contiene el token (Command o Event).
6. [ ] Consultar el estado de la invitación o la compañía mediante una Query (opcional).
7. [~] (Opcional) Registrar eventos de dominio relevantes para auditar o reaccionar a la creación e invitación.
