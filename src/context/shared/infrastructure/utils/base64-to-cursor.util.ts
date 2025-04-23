// Utility to decode a Base64 string back to a cursor object

/**
 * Decodifica una cadena Base64 a un objeto cursor, incluyendo dirección de orden.
 * @param base64String - Cadena Base64 a decodificar.
 * @returns Objeto cursor original.
 */
export function base64ToCursor<T>(base64String: string): {
  field: keyof T;
  value: unknown;
  direction: 'ASC' | 'DESC';
} {
  const decodedString = Buffer.from(base64String, 'base64').toString('utf-8');
  const parsedObject = JSON.parse(decodedString) as {
    field: keyof T;
    value: unknown;
    direction: 'ASC' | 'DESC';
  };

  // Validar la estructura del objeto
  if (
    typeof parsedObject !== 'object' ||
    parsedObject === null ||
    !('field' in parsedObject) ||
    !('value' in parsedObject) ||
    !('direction' in parsedObject)
  ) {
    throw new Error('Invalid cursor format');
  }

  return parsedObject;
}
