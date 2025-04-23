// Utility to convert a cursor object to a Base64 string

/**
 * Converts a cursor object to a Base64-encoded string.
 * @param cursor - The cursor object to encode.
 * @returns A Base64-encoded string representation of the cursor.
 */
export function cursorToBase64<T>(cursor: {
  field: keyof T;
  value: unknown;
}): string {
  const cursorString = JSON.stringify(cursor);
  return Buffer.from(cursorString).toString('base64');
}
