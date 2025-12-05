/**
 * Value Object para la configuración de White Label por empresa
 */

/**
 * Primitivos para colores
 */
export interface WhiteLabelColorsPrimitives {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textMuted: string;
}

/**
 * Primitivos para branding
 */
export interface WhiteLabelBrandingPrimitives {
  logoUrl: string | null;
  faviconUrl: string | null;
  brandName: string;
}

/**
 * Primitivos para archivo de fuente
 */
export interface WhiteLabelFontFilePrimitives {
  name: string;
  url: string;
}

/**
 * Primitivos para tipografía
 */
export interface WhiteLabelTypographyPrimitives {
  fontFamily: string;
  customFontName?: string | null;
  customFontFiles: WhiteLabelFontFilePrimitives[];
}

/**
 * Primitivos de la configuración White Label
 */
export interface WhiteLabelConfigPrimitives {
  id: string;
  companyId: string;
  colors: WhiteLabelColorsPrimitives;
  branding: WhiteLabelBrandingPrimitives;
  typography: WhiteLabelTypographyPrimitives;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Valores por defecto de colores
 */
const DEFAULT_COLORS: WhiteLabelColorsPrimitives = {
  primary: '#007bff',
  secondary: '#6c757d',
  background: '#ffffff',
  surface: '#f8f9fa',
  text: '#212529',
  textMuted: '#6c757d',
};

/**
 * Valores por defecto de tipografía
 */
const DEFAULT_TYPOGRAPHY: WhiteLabelTypographyPrimitives = {
  fontFamily: 'Inter',
  customFontName: null,
  customFontFiles: [],
};

/**
 * Fuentes predefinidas permitidas
 */
export const ALLOWED_FONT_FAMILIES = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Poppins',
  'Montserrat',
  'custom',
] as const;

export type AllowedFontFamily = (typeof ALLOWED_FONT_FAMILIES)[number];

/**
 * Value Object para configuración White Label por empresa
 */
export class WhiteLabelConfig {
  private constructor(
    private readonly _id: string,
    private readonly _companyId: string,
    private readonly _colors: WhiteLabelColorsPrimitives,
    private readonly _branding: WhiteLabelBrandingPrimitives,
    private readonly _typography: WhiteLabelTypographyPrimitives,
    private readonly _createdAt: Date,
    private readonly _updatedAt: Date,
  ) {}

  /**
   * Crea una nueva configuración con valores por defecto
   */
  static createDefault(
    id: string,
    companyId: string,
    brandName: string,
  ): WhiteLabelConfig {
    const now = new Date();
    return new WhiteLabelConfig(
      id,
      companyId,
      { ...DEFAULT_COLORS },
      {
        logoUrl: null,
        faviconUrl: null,
        brandName,
      },
      { ...DEFAULT_TYPOGRAPHY },
      now,
      now,
    );
  }

  /**
   * Crea una configuración desde primitivos
   */
  static create(props: WhiteLabelConfigPrimitives): WhiteLabelConfig {
    return new WhiteLabelConfig(
      props.id,
      props.companyId,
      props.colors,
      props.branding,
      props.typography,
      props.createdAt || new Date(),
      props.updatedAt || new Date(),
    );
  }

  /**
   * Reconstruye desde primitivos
   */
  static fromPrimitives(data: WhiteLabelConfigPrimitives): WhiteLabelConfig {
    return WhiteLabelConfig.create(data);
  }

  /**
   * Serializa a primitivos
   */
  toPrimitives(): WhiteLabelConfigPrimitives {
    return {
      id: this._id,
      companyId: this._companyId,
      colors: { ...this._colors },
      branding: { ...this._branding },
      typography: {
        ...this._typography,
        customFontFiles: [...this._typography.customFontFiles],
      },
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get companyId(): string {
    return this._companyId;
  }

  get colors(): WhiteLabelColorsPrimitives {
    return { ...this._colors };
  }

  get branding(): WhiteLabelBrandingPrimitives {
    return { ...this._branding };
  }

  get typography(): WhiteLabelTypographyPrimitives {
    return {
      ...this._typography,
      customFontFiles: [...this._typography.customFontFiles],
    };
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  /**
   * Crea una copia con propiedades actualizadas
   */
  update(updates: {
    colors?: Partial<WhiteLabelColorsPrimitives>;
    branding?: Partial<WhiteLabelBrandingPrimitives>;
    typography?: Partial<WhiteLabelTypographyPrimitives>;
  }): WhiteLabelConfig {
    return new WhiteLabelConfig(
      this._id,
      this._companyId,
      updates.colors ? { ...this._colors, ...updates.colors } : this._colors,
      updates.branding
        ? { ...this._branding, ...updates.branding }
        : this._branding,
      updates.typography
        ? {
            ...this._typography,
            ...updates.typography,
            customFontFiles:
              updates.typography.customFontFiles ??
              this._typography.customFontFiles,
          }
        : this._typography,
      this._createdAt,
      new Date(),
    );
  }

  /**
   * Actualiza la URL del logo
   */
  updateLogoUrl(logoUrl: string | null): WhiteLabelConfig {
    return this.update({
      branding: { ...this._branding, logoUrl },
    });
  }

  /**
   * Actualiza la URL del favicon
   */
  updateFaviconUrl(faviconUrl: string | null): WhiteLabelConfig {
    return this.update({
      branding: { ...this._branding, faviconUrl },
    });
  }

  /**
   * Añade un archivo de fuente
   */
  addFontFile(fontFile: WhiteLabelFontFilePrimitives): WhiteLabelConfig {
    const existingFiles = this._typography.customFontFiles.filter(
      (f) => f.name !== fontFile.name,
    );
    return this.update({
      typography: {
        ...this._typography,
        fontFamily: 'custom',
        customFontFiles: [...existingFiles, fontFile],
      },
    });
  }

  /**
   * Elimina un archivo de fuente
   */
  removeFontFile(fileName: string): WhiteLabelConfig {
    const updatedFiles = this._typography.customFontFiles.filter(
      (f) => f.name !== fileName,
    );
    return this.update({
      typography: {
        ...this._typography,
        customFontFiles: updatedFiles,
        // Si no quedan fuentes custom, volver a Inter
        fontFamily:
          updatedFiles.length === 0 ? 'Inter' : this._typography.fontFamily,
      },
    });
  }

  /**
   * Elimina todos los archivos de fuente
   */
  removeAllFontFiles(): WhiteLabelConfig {
    return this.update({
      typography: {
        ...this._typography,
        fontFamily: 'Inter',
        customFontName: null,
        customFontFiles: [],
      },
    });
  }

  /**
   * Verifica si tiene fuentes personalizadas
   */
  hasCustomFonts(): boolean {
    return this._typography.customFontFiles.length > 0;
  }

  /**
   * Verifica si tiene logo
   */
  hasLogo(): boolean {
    return this._branding.logoUrl !== null;
  }

  /**
   * Verifica si tiene favicon
   */
  hasFavicon(): boolean {
    return this._branding.faviconUrl !== null;
  }
}
