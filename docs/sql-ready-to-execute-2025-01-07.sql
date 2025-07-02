-- CONSULTA SQL PARA EJECUTAR DIRECTAMENTE EN LA BASE DE DATOS
-- Equivalente al Criteria de find-chat-list-with-filters.query-handler.ts
-- Fecha: 7 de enero de 2025

-- 🔥 CONSULTA PRINCIPAL - Copia y ejecuta esta consulta
SELECT DISTINCT
    chat.id,
    chat."companyId",
    chat.status,
    chat."lastMessage",
    chat."lastMessageAt",
    chat."createdAt"
FROM chats chat
INNER JOIN chat_participants cp ON chat.id = cp.chat_id
WHERE cp.participant_id = 'commercial-user-uuid'  -- 👈 REEMPLAZA ESTO con tu participantId real
ORDER BY 
    chat."lastMessageAt" DESC NULLS LAST,  -- Primer criterio de ordenamiento
    chat.id DESC                           -- Segundo criterio para consistencia
LIMIT 50;

-- 📊 CONSULTA PARA OBTENER EL TOTAL
SELECT COUNT(DISTINCT chat.id) as total
FROM chats chat
INNER JOIN chat_participants cp ON chat.id = cp.chat_id
WHERE cp.participant_id = 'commercial-user-uuid';  -- 👈 REEMPLAZA ESTO con tu participantId real

-- 🔍 CONSULTA PARA VER TODOS LOS PARTICIPANTES (para encontrar IDs válidos)
SELECT DISTINCT p.id, p.name, p."isCommercial", p."isVisitor"
FROM participants p
LIMIT 20;

-- 💬 CONSULTA COMPLETA CON INFORMACIÓN DE PARTICIPANTES
SELECT DISTINCT
    chat.id as chat_id,
    chat."companyId",
    chat.status,
    chat."lastMessage",
    chat."lastMessageAt",
    chat."createdAt",
    -- Información de participantes
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
WHERE cp.participant_id = 'commercial-user-uuid'  -- 👈 REEMPLAZA ESTO con tu participantId real
ORDER BY 
    chat."lastMessageAt" DESC NULLS LAST,
    chat.id DESC
LIMIT 50;

-- 🧪 CONSULTA PARA PROBAR CON CUALQUIER PARTICIPANTE
-- Esta consulta te mostrará los chats del primer participante que encuentre
SELECT DISTINCT
    chat.id,
    chat."companyId", 
    chat.status,
    chat."lastMessage",
    chat."lastMessageAt",
    chat."createdAt",
    cp.participant_id
FROM chats chat
INNER JOIN chat_participants cp ON chat.id = cp.chat_id
WHERE cp.participant_id = (
    SELECT p.id 
    FROM participants p 
    LIMIT 1
)
ORDER BY 
    chat."lastMessageAt" DESC NULLS LAST,
    chat.id DESC
LIMIT 50;

-- INSTRUCCIONES DE USO:
-- 1. Ejecuta primero la consulta de participantes para obtener un ID válido
-- 2. Reemplaza 'commercial-user-uuid' con un ID real
-- 3. Ejecuta la consulta principal
-- 4. Las comillas dobles son necesarias para PostgreSQL si usas camelCase

-- NOTAS IMPORTANTES:
-- - Usar comillas dobles para nombres de columnas en camelCase (ej: "lastMessageAt")
-- - NULLS LAST garantiza que los registros sin lastMessageAt aparezcan al final
-- - DISTINCT evita duplicados cuando un chat tiene múltiples participantes
-- - El ORDER BY replica exactamente el comportamiento del código TypeScript
