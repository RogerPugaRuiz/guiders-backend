import { Cursor } from '../criteria';

// Utility to convert a cursor object to a Base64 string

/**
 * Convierte un objeto cursor a una cadena Base64, incluyendo dirección de orden.
 * @param cursor - Objeto cursor a codificar.
 * @returns Cadena Base64 del cursor.
 */
export function cursorToBase64<T>(cursor: Cursor<T>): string {
  const cursorString = JSON.stringify(cursor);
  return Buffer.from(cursorString).toString('base64');
}
