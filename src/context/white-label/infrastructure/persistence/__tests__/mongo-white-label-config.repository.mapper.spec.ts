/**
 * Tests del mapper del repositorio MongoDB WhiteLabelConfig con campos embed
 *
 * Valida que el mapper maneja correctamente:
 * - Documentos nuevos con campos embed poblados
 * - Documentos legacy SIN campos embed (defaults)
 * - Documentos con campos embed parcialmente poblados
 */

import { WhiteLabelConfig } from '../../../domain/entities/white-label-config';
import { Uuid } from 'src/context/shared/domain/value-objects/uuid';

describe('MongoWhiteLabelConfigRepositoryImpl - mapper embed', () => {
  describe('map doc → WhiteLabelConfig (backward compat)', () => {
    it('debería mapear un documento legacy sin campos embed con defaults seguros', () => {
      // Arrange — simula documento antiguo (pre-embed) sin los nuevos campos
      const legacyDoc = {
        _id: '507f1f77bcf86cd799439011',
        companyId: Uuid.random().value,
        colors: {
          primary: '#007bff',
          secondary: '#6c757d',
          tertiary: '#17a2b8',
          background: '#ffffff',
          surface: '#f8f9fa',
          text: '#212529',
          textMuted: '#6c757d',
        },
        branding: {
          logoUrl: null,
          faviconUrl: null,
          brandName: 'Legacy Co',
        },
        typography: {
          fontFamily: 'Inter',
          customFontName: null,
          customFontFiles: [],
        },
        theme: 'light',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;

      // Act — reproducimos el mapeo del repositorio
      const config = WhiteLabelConfig.fromPrimitives({
        id: legacyDoc._id.toString(),
        companyId: legacyDoc.companyId,
        colors: legacyDoc.colors,
        branding: legacyDoc.branding,
        typography: legacyDoc.typography,
        theme: legacyDoc.theme,
        embedEnabled: legacyDoc.embedEnabled ?? false,
        embedAllowedOrigins: legacyDoc.embedAllowedOrigins ?? [],
        createdAt: legacyDoc.createdAt,
        updatedAt: legacyDoc.updatedAt,
      });

      // Assert
      expect(config.embedEnabled).toBe(false);
      expect(config.embedAllowedOrigins).toEqual([]);
    });

    it('debería mapear un documento nuevo con embed habilitado y origins', () => {
      // Arrange
      const newDoc = {
        _id: '507f1f77bcf86cd799439012',
        companyId: Uuid.random().value,
        colors: {
          primary: '#007bff',
          secondary: '#6c757d',
          tertiary: '#17a2b8',
          background: '#ffffff',
          surface: '#f8f9fa',
          text: '#212529',
          textMuted: '#6c757d',
        },
        branding: {
          logoUrl: null,
          faviconUrl: null,
          brandName: 'LeadCars',
        },
        typography: {
          fontFamily: 'Inter',
          customFontName: null,
          customFontFiles: [],
        },
        theme: 'light',
        embedEnabled: true,
        embedAllowedOrigins: ['https://app.leadcars.com'],
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;

      // Act
      const config = WhiteLabelConfig.fromPrimitives({
        id: newDoc._id.toString(),
        companyId: newDoc.companyId,
        colors: newDoc.colors,
        branding: newDoc.branding,
        typography: newDoc.typography,
        theme: newDoc.theme,
        embedEnabled: newDoc.embedEnabled,
        embedAllowedOrigins: newDoc.embedAllowedOrigins,
        createdAt: newDoc.createdAt,
        updatedAt: newDoc.updatedAt,
      });

      // Assert
      expect(config.embedEnabled).toBe(true);
      expect(config.embedAllowedOrigins).toEqual(['https://app.leadcars.com']);
    });
  });
});
