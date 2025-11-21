import { Injectable } from '@nestjs/common';

/**
 * Tipos de tokens parseados de la query de búsqueda
 */
export interface SearchFilter {
  field: string;
  operator: ':' | '>' | '<' | '>=' | '<=' | '!=';
  value: string;
}

export interface ParsedSearchQuery {
  filters: SearchFilter[];
  freeText: string;
}

/**
 * Definición de campos filtrables para visitantes
 */
export interface SearchableField {
  key: string;
  label: string;
  type: 'select' | 'text' | 'date' | 'boolean' | 'number';
  values?: string[];
  operators: string[];
  mongoField: string;
}

/**
 * Servicio para parsear queries de búsqueda con sintaxis estilo GitHub/Slack
 * Soporta: field:value, field:>value, field:<value, field:>=value, field:<=value, field:!=value
 */
@Injectable()
export class VisitorSearchParserService {
  /**
   * Campos disponibles para filtrar visitantes
   */
  readonly searchableFields: SearchableField[] = [
    {
      key: 'status',
      label: 'Estado de conexión',
      type: 'select',
      values: ['online', 'offline', 'away', 'chatting'],
      operators: [':', '!='],
      mongoField: 'connectionStatus',
    },
    {
      key: 'lifecycle',
      label: 'Ciclo de vida',
      type: 'select',
      values: ['ANON', 'ENGAGED', 'LEAD', 'CONVERTED'],
      operators: [':', '!='],
      mongoField: 'lifecycle',
    },
    {
      key: 'consent',
      label: 'Consentimiento RGPD',
      type: 'boolean',
      values: ['true', 'false'],
      operators: [':'],
      mongoField: 'hasAcceptedPrivacyPolicy',
    },
    {
      key: 'url',
      label: 'URL actual',
      type: 'text',
      operators: [':', '!='],
      mongoField: 'currentUrl',
    },
    {
      key: 'createdAt',
      label: 'Fecha de creación',
      type: 'date',
      operators: [':', '>', '<', '>=', '<='],
      mongoField: 'createdAt',
    },
    {
      key: 'updatedAt',
      label: 'Última actualización',
      type: 'date',
      operators: [':', '>', '<', '>=', '<='],
      mongoField: 'updatedAt',
    },
    {
      key: 'lastActivity',
      label: 'Última actividad',
      type: 'date',
      operators: [':', '>', '<', '>=', '<='],
      mongoField: 'sessions.lastActivityAt',
    },
    {
      key: 'fingerprint',
      label: 'Huella digital',
      type: 'text',
      operators: [':', '!='],
      mongoField: 'fingerprint',
    },
  ];

  /**
   * Parsea una query string en filtros estructurados
   * Ejemplo: "status:online lifecycle:LEAD texto libre"
   */
  parse(query: string): ParsedSearchQuery {
    const filters: SearchFilter[] = [];
    let freeText = query;

    // Regex para capturar filtros con diferentes operadores
    // Soporta: field:value, field:>value, field:<value, field:>=value, field:<=value, field:!=value
    const filterRegex = /(\w+)(:|>=|<=|>|<|!=)("[^"]*"|\S+)/g;

    let match: RegExpExecArray | null;
    while ((match = filterRegex.exec(query)) !== null) {
      const [fullMatch, field, operator, rawValue] = match;

      // Verificar que el campo es válido
      const fieldDef = this.searchableFields.find((f) => f.key === field);
      if (fieldDef && fieldDef.operators.includes(operator)) {
        // Remover comillas si las tiene
        const value = rawValue.replace(/^"|"$/g, '');

        filters.push({
          field,
          operator: operator as SearchFilter['operator'],
          value,
        });

        // Remover el filtro del texto libre
        freeText = freeText.replace(fullMatch, '');
      }
    }

    // Limpiar texto libre de espacios extra
    freeText = freeText.trim().replace(/\s+/g, ' ');

    return { filters, freeText };
  }

  /**
   * Convierte los filtros parseados a una query de MongoDB
   */
  toMongoQuery(
    parsed: ParsedSearchQuery,
    tenantId: string,
  ): Record<string, unknown> {
    const query: Record<string, unknown> = { tenantId };

    for (const filter of parsed.filters) {
      const fieldDef = this.searchableFields.find((f) => f.key === filter.field);
      if (!fieldDef) continue;

      const mongoField = fieldDef.mongoField;
      let mongoValue: unknown = filter.value;

      // Conversión de tipos según el campo
      if (fieldDef.type === 'boolean') {
        mongoValue = filter.value === 'true';
      } else if (fieldDef.type === 'date') {
        mongoValue = this.parseDateValue(filter.value);
      } else if (fieldDef.type === 'number') {
        mongoValue = parseFloat(filter.value);
      }

      // Aplicar operador
      switch (filter.operator) {
        case ':':
          if (fieldDef.type === 'text' && typeof mongoValue === 'string') {
            // Para texto, usar regex case-insensitive
            query[mongoField] = { $regex: mongoValue, $options: 'i' };
          } else {
            query[mongoField] = mongoValue;
          }
          break;
        case '!=':
          query[mongoField] = { $ne: mongoValue };
          break;
        case '>':
          query[mongoField] = { $gt: mongoValue };
          break;
        case '<':
          query[mongoField] = { $lt: mongoValue };
          break;
        case '>=':
          query[mongoField] = { $gte: mongoValue };
          break;
        case '<=':
          query[mongoField] = { $lte: mongoValue };
          break;
      }
    }

    // Búsqueda de texto libre en campos relevantes
    if (parsed.freeText) {
      query.$or = [
        { currentUrl: { $regex: parsed.freeText, $options: 'i' } },
        { fingerprint: { $regex: parsed.freeText, $options: 'i' } },
      ];
    }

    return query;
  }

  /**
   * Parsea valores de fecha relativos o absolutos
   * Soporta: "7d" (7 días), "2w" (2 semanas), "1m" (1 mes), ISO date
   */
  private parseDateValue(value: string): Date {
    // Formato relativo: Xd (días), Xw (semanas), Xm (meses), Xh (horas)
    const relativeMatch = value.match(/^(\d+)([dwmh])$/);
    if (relativeMatch) {
      const amount = parseInt(relativeMatch[1], 10);
      const unit = relativeMatch[2];
      const now = new Date();

      switch (unit) {
        case 'h':
          now.setHours(now.getHours() - amount);
          break;
        case 'd':
          now.setDate(now.getDate() - amount);
          break;
        case 'w':
          now.setDate(now.getDate() - amount * 7);
          break;
        case 'm':
          now.setMonth(now.getMonth() - amount);
          break;
      }

      return now;
    }

    // Formato ISO o fecha absoluta
    return new Date(value);
  }

  /**
   * Obtiene el schema de campos filtrables para el frontend
   */
  getSchema(): {
    fields: Array<{
      key: string;
      label: string;
      type: string;
      values?: string[];
      operators: string[];
    }>;
  } {
    return {
      fields: this.searchableFields.map((field) => ({
        key: field.key,
        label: field.label,
        type: field.type,
        ...(field.values && { values: field.values }),
        operators: field.operators,
      })),
    };
  }

  /**
   * Genera sugerencias de autocompletado basadas en la query actual
   */
  getSuggestions(
    query: string,
  ): Array<{ type: 'field' | 'value' | 'operator'; value: string; label: string }> {
    const suggestions: Array<{
      type: 'field' | 'value' | 'operator';
      value: string;
      label: string;
    }> = [];

    const trimmedQuery = query.trim();

    // Si está vacío, sugerir todos los campos
    if (!trimmedQuery) {
      for (const field of this.searchableFields) {
        suggestions.push({
          type: 'field',
          value: `${field.key}:`,
          label: `Filtrar por ${field.label}`,
        });
      }
      return suggestions.slice(0, 10);
    }

    // Detectar si estamos escribiendo un campo
    const lastToken = trimmedQuery.split(' ').pop() || '';

    // Si termina con un campo y operador, sugerir valores
    const fieldOperatorMatch = lastToken.match(/^(\w+)(:|>=|<=|>|<|!=)$/);
    if (fieldOperatorMatch) {
      const fieldKey = fieldOperatorMatch[1];
      const operator = fieldOperatorMatch[2];
      const fieldDef = this.searchableFields.find((f) => f.key === fieldKey);

      if (fieldDef?.values) {
        for (const val of fieldDef.values) {
          suggestions.push({
            type: 'value',
            value: `${fieldKey}${operator}${val}`,
            label: `${fieldDef.label}: ${val}`,
          });
        }
      } else if (fieldDef?.type === 'date') {
        // Sugerir valores de fecha comunes
        const dateValues = [
          { value: '1h', label: 'Última hora' },
          { value: '24h', label: 'Últimas 24 horas' },
          { value: '7d', label: 'Últimos 7 días' },
          { value: '30d', label: 'Últimos 30 días' },
        ];
        for (const dv of dateValues) {
          suggestions.push({
            type: 'value',
            value: `${fieldKey}${operator}${dv.value}`,
            label: `${fieldDef.label}: ${dv.label}`,
          });
        }
      }

      return suggestions;
    }

    // Si está escribiendo un campo parcial, filtrar campos que coincidan
    if (!lastToken.includes(':')) {
      for (const field of this.searchableFields) {
        if (field.key.toLowerCase().startsWith(lastToken.toLowerCase())) {
          suggestions.push({
            type: 'field',
            value: `${field.key}:`,
            label: `Filtrar por ${field.label}`,
          });
        }
      }

      // Si hay pocas sugerencias, añadir todos los campos
      if (suggestions.length === 0) {
        for (const field of this.searchableFields) {
          suggestions.push({
            type: 'field',
            value: `${field.key}:`,
            label: `Filtrar por ${field.label}`,
          });
        }
      }
    }

    // Si está escribiendo un valor parcial
    const partialValueMatch = lastToken.match(/^(\w+)(:|>=|<=|>|<|!=)(\S*)$/);
    if (partialValueMatch) {
      const fieldKey = partialValueMatch[1];
      const operator = partialValueMatch[2];
      const partialValue = partialValueMatch[3];
      const fieldDef = this.searchableFields.find((f) => f.key === fieldKey);

      if (fieldDef?.values) {
        for (const val of fieldDef.values) {
          if (val.toLowerCase().startsWith(partialValue.toLowerCase())) {
            suggestions.push({
              type: 'value',
              value: `${fieldKey}${operator}${val}`,
              label: `${fieldDef.label}: ${val}`,
            });
          }
        }
      }
    }

    return suggestions.slice(0, 10);
  }
}
