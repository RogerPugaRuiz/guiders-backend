// Utility to decode a Base64 string back to a cursor object

/**
 * Decodes a Base64-encoded string back to a cursor object.
 * @param base64String - The Base64 string to decode.
 * @returns The original cursor object.
 */
export function base64ToCursor<T>(base64String: string): {
  field: keyof T;
  value: unknown;
} {
  const decodedString = Buffer.from(base64String, 'base64').toString('utf-8');
  const parsedObject = JSON.parse(decodedString) as {
    field: keyof T;
    value: unknown;
  };

  // Validate the structure of the parsed object
  if (
    typeof parsedObject !== 'object' ||
    parsedObject === null ||
    !('field' in parsedObject) ||
    !('value' in parsedObject)
  ) {
    throw new Error('Invalid cursor format');
  }

  return parsedObject as {
    field: keyof T;
    value: unknown;
  };
}
