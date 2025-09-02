import { Injectable } from '@nestjs/common';
import { Chat } from '../../domain/entities/chat';
import { ChatSchema } from '../schemas/chat.schema';

/**
 * Mapper para convertir entre entidades Chat del dominio y esquemas MongoDB
 */
@Injectable()
export class ChatMapper {
  /**
   * Convierte una entidad de dominio Chat a esquema MongoDB
   */
  toSchema(chat: Chat): ChatSchema {
    const schema = new ChatSchema();
    const chatPrimitives = chat.toPrimitives();

    schema.id = chat.id.value;
    schema.status = chat.status.value;
    schema.priority = chat.priority.value;
    schema.assignedCommercialId = chatPrimitives.assignedCommercialId;
    schema.availableCommercialIds = chatPrimitives.availableCommercialIds;
    schema.createdAt = chat.createdAt;
    schema.assignedAt = chatPrimitives.firstResponseTime || undefined;
    schema.closedAt = chatPrimitives.closedAt;
    schema.lastMessageDate = chatPrimitives.lastMessageDate;
    schema.totalMessages = chat.totalMessages;
    schema.unreadMessagesCount = 0; // Se calculará desde los mensajes
    schema.isActive = !chatPrimitives.closedAt;

    // Mapear VisitorInfo usando toPrimitives
    const visitorInfoData = chatPrimitives.visitorInfo;
    schema.visitorInfo = {
      id: chatPrimitives.visitorId,
      name: visitorInfoData.name,
      email: visitorInfoData.email,
      phone: visitorInfoData.phone,
      location:
        visitorInfoData.location?.city || visitorInfoData.location?.country,
      additionalData: {
        company: visitorInfoData.company,
        ipAddress: visitorInfoData.ipAddress,
        userAgent: visitorInfoData.userAgent,
        referrer: visitorInfoData.referrer,
      },
    };

    // Mapear ChatMetadata usando toPrimitives
    const metadataData = chatPrimitives.metadata || {
      department: 'general',
      source: 'website',
    };

    schema.metadata = {
      department: metadataData.department || 'general',
      source: metadataData.source || 'website',
      initialUrl: undefined, // No disponible en domain metadata
      userAgent: visitorInfoData.userAgent,
      referrer: visitorInfoData.referrer,
      tags: metadataData.customFields || {},
      customFields: metadataData.customFields || {},
    };

    // Campos derivados para optimización
    schema.visitorId = chatPrimitives.visitorId;
    schema.department = metadataData.department || 'general';
    schema.tags = metadataData.tags || [];

    return schema;
  }

  /**
   * Convierte un esquema MongoDB a entidad de dominio Chat
   */
  toDomain(schema: ChatSchema): Chat {
    return Chat.fromPrimitives({
      id: schema.id,
      status: schema.status,
      priority: schema.priority,
      visitorId: schema.visitorId,
      assignedCommercialId: schema.assignedCommercialId,
      availableCommercialIds: schema.availableCommercialIds || [], // Se cargarán por separado si es necesario
      lastMessageDate: schema.lastMessageDate,
      lastMessageContent: undefined,
      lastMessageSenderId: undefined,
      totalMessages: schema.totalMessages,
      firstResponseTime: schema.assignedAt,
      responseTimeSeconds: undefined,
      closedAt: schema.closedAt,
      closedReason: undefined,
      visitorInfo: {
        name: schema.visitorInfo.name,
        email: schema.visitorInfo.email,
        phone: schema.visitorInfo.phone,
        company: schema.visitorInfo.additionalData?.company as string,
        ipAddress: schema.visitorInfo.additionalData?.ipAddress as string,
        location: schema.visitorInfo.location
          ? { city: schema.visitorInfo.location }
          : undefined,
        referrer: schema.visitorInfo.additionalData?.referrer as string,
        userAgent: schema.visitorInfo.additionalData?.userAgent as string,
      },
      metadata: {
        department: schema.metadata.department,
        source: schema.metadata.source,
        tags: Array.isArray(schema.tags) ? schema.tags : [],
        customFields: schema.metadata.customFields || {},
      },
      createdAt: schema.createdAt,
      updatedAt: schema.updatedAt || schema.createdAt,
    });
  }

  /**
   * Convierte múltiples esquemas a entidades de dominio
   */
  toDomainList(schemas: ChatSchema[]): Chat[] {
    return schemas.map((schema) => this.toDomain(schema));
  }

  /**
   * Convierte múltiples entidades de dominio a esquemas
   */
  toSchemaList(chats: Chat[]): ChatSchema[] {
    return chats.map((chat) => this.toSchema(chat));
  }

  /**
   * Actualiza un esquema existente con datos de una entidad de dominio
   */
  updateSchema(existingSchema: ChatSchema, chat: Chat): ChatSchema {
    const chatPrimitives = chat.toPrimitives();

    existingSchema.status = chat.status.value;
    existingSchema.priority = chat.priority.value;
    existingSchema.assignedCommercialId = chatPrimitives.assignedCommercialId;
    existingSchema.assignedAt = chatPrimitives.firstResponseTime || undefined;
    existingSchema.closedAt = chatPrimitives.closedAt;
    existingSchema.lastMessageDate = chatPrimitives.lastMessageDate;
    existingSchema.totalMessages = chat.totalMessages;
    existingSchema.isActive = !chatPrimitives.closedAt;
    existingSchema.updatedAt = new Date();

    // Actualizar metadatos si han cambiado
    const metadataData = chatPrimitives.metadata || {
      department: 'general',
      source: 'website',
    };

    existingSchema.metadata = {
      department: metadataData.department || 'general',
      source: metadataData.source || 'website',
      initialUrl: existingSchema.metadata.initialUrl, // Mantener valor existente
      userAgent: existingSchema.metadata.userAgent, // Mantener valor existente
      referrer: existingSchema.metadata.referrer, // Mantener valor existente
      tags: metadataData.customFields || {},
      customFields: metadataData.customFields || {},
    };

    // Actualizar campos derivados
    existingSchema.department = metadataData.department || 'general';
    existingSchema.tags = metadataData.tags || [];

    return existingSchema;
  }
}
