-- CONSULTA SQL LIMPIA GARANTIZADA - 7 enero 2025
-- Equivalente al Criteria de find-chat-list-with-filters.query-handler.ts

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
