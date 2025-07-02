-- Consulta SQL equivalente al Criteria de find-chat-list-with-filters.query-handler.ts
-- Fecha: 7 de enero de 2025
-- 
-- ⚠️  IMPORTANTE: En PostgreSQL, usar comillas dobles para nombres de columnas en camelCase
-- ✅  Correcto: chat."lastMessageAt"
-- ❌  Incorrecto: chat.lastMessageAt
-- 
-- Esta consulta reproduce el comportamiento del siguiente código TypeScript:
-- 
-- let criteria = new Criteria<Chat>(filters)
--   .orderByField('lastMessageAt', 'DESC')
--   .orderByField('id', 'DESC') // Añadir id como orden secundario para consistencia
--   .setLimit(limit || 50);
-- 
-- Donde filters = [new Filter<Chat>('participants', Operator.EQUALS, participantId)]

-- 🚀 CONSULTA LIMPIA PARA EJECUTAR (sin comentarios que puedan causar problemas)
SELECT DISTINCT
    chat.id,
    chat."companyId", 
    chat.status,
    chat."lastMessage",
    chat."lastMessageAt",
    chat."createdAt"
FROM chats chat
INNER JOIN chat_participants cp ON chat.id = cp.chat_id  
WHERE cp.participant_id = 'REEMPLAZAR_CON_ID_REAL'
ORDER BY 
    chat."lastMessageAt" DESC NULLS LAST,
    chat.id DESC
LIMIT 50;

-- Consulta principal con ordenamiento múltiple
SELECT DISTINCT
    chat.id,
    chat."companyId",
    chat.status,
    chat."lastMessage",
    chat."lastMessageAt",
    chat."createdAt"
FROM chats chat
INNER JOIN chat_participants cp ON chat.id = cp.chat_id
WHERE cp.participant_id = $1
ORDER BY 
    chat."lastMessageAt" DESC NULLS LAST,
    chat.id DESC
LIMIT 50;

-- Ejemplo con valores reales (reemplazar los UUIDs por valores reales):
-- 
-- SELECT DISTINCT
--     chat.id,
--     chat."companyId",
--     chat.status,
--     chat."lastMessage",
--     chat."lastMessageAt",
--     chat."createdAt"
-- FROM chats chat
-- INNER JOIN chat_participants cp ON chat.id = cp.chat_id
-- WHERE cp.participant_id = 'b1a2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6'  -- ID del participante
-- ORDER BY 
--     chat."lastMessageAt" DESC NULLS LAST,
--     chat.id DESC
-- LIMIT 50;

-- Para obtener también la información de los participantes (como hace el QueryBuilder con innerJoinAndSelect):
SELECT DISTINCT
    chat.id,
    chat."companyId",
    chat.status,
    chat."lastMessage",
    chat."lastMessageAt",
    chat."createdAt",
    -- Información de participantes (opcional, para debugging)
    p.id as participant_id,
    p.name as participant_name,
    p."isCommercial",
    p."isVisitor",
    p."isOnline",
    p."isViewing",
    p."isTyping",
    p."isAnonymous",
    p."assignedAt",
    p."lastSeenAt"
FROM chats chat
INNER JOIN chat_participants cp ON chat.id = cp.chat_id
INNER JOIN participants p ON cp.participant_id = p.id
WHERE cp.participant_id = $1  -- Reemplazar $1 con el participantId real
ORDER BY 
    chat."lastMessageAt" DESC NULLS LAST,
    chat.id DESC
LIMIT 50;

-- Para probar con datos de ejemplo, usar:
-- WHERE cp.participant_id = 'commercial-user-uuid'  -- O el ID real del usuario

-- Consulta adicional para obtener el total (sin paginación):
SELECT COUNT(DISTINCT chat.id) as total
FROM chats chat
INNER JOIN chat_participants cp ON chat.id = cp.chat_id
WHERE cp.participant_id = $1;  -- Reemplazar $1 con el participantId real

-- Consulta para verificar hasMore (si hay más chats disponibles después del cursor):
-- Esta consulta se ejecuta cuando se necesita verificar si hay más registros
-- usando el cursor generado desde el último chat de la página anterior
SELECT DISTINCT
    chat.id,
    chat."lastMessageAt"
FROM chats chat
INNER JOIN chat_participants cp ON chat.id = cp.chat_id
WHERE cp.participant_id = $1  -- Reemplazar $1 con el participantId real
  AND (
    chat."lastMessageAt" < $2 OR  -- Reemplazar $2 con lastMessageAt del cursor
    (chat."lastMessageAt" = $2 AND chat.id < $3)  -- Reemplazar $3 con id del cursor
  )
ORDER BY 
    chat."lastMessageAt" DESC NULLS LAST,
    chat.id DESC
LIMIT 1;

-- Explicación del cursor:
-- El cursor contiene { lastMessageAt, id } del último chat de la página
-- Para obtener la siguiente página, se filtra por:
-- 1. lastMessageAt menor que el del cursor, O
-- 2. lastMessageAt igual y id menor que el del cursor
-- Esto garantiza paginación consistente y determinista

-- =========================================================================
-- CONSULTA FINAL LIMPIA - COPIA Y PEGA ESTA VERSIÓN SIN ERRORES
-- =========================================================================

SELECT DISTINCT
    chat.id,
    chat."companyId",
    chat.status,
    chat."lastMessage",
    chat."lastMessageAt",
    chat."createdAt"
FROM chats chat
INNER JOIN chat_participants cp ON chat.id = cp.chat_id
WHERE cp.participant_id = 'REEMPLAZA_CON_TU_ID'
ORDER BY 
    chat."lastMessageAt" DESC NULLS LAST,
    chat.id DESC
LIMIT 50;
