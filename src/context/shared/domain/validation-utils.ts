// Valida que un string no sea vacío ni solo espacios
export const validateStringNotEmpty = (value: string): boolean => {
  return typeof value === 'string' && value.trim().length > 0;
};

// Valida que un array contenga solo strings no vacíos ni solo espacios
export const validateArrayOfStrings = (value: unknown): boolean => {
  if (!Array.isArray(value)) return false;
  return value.every(
    (item) => typeof item === 'string' && item.trim().length > 0,
  );
};

// Valida que un array contenga solo strings no vacíos ni solo espacios

export const validateEmail = (value: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
};

// Valida la fecha de un objeto Date
export const validateDate = (value: Date): boolean => {
  return value instanceof Date && !isNaN(value.getTime());
};
