import { VisitorConnectionTime } from '../visitor-connection-time';

describe('VisitorConnectionTime', () => {
  describe('constructor', () => {
    it('should create a valid connection time with positive integer', () => {
      const connectionTime = new VisitorConnectionTime(5000);
      expect(connectionTime.value).toBe(5000);
    });

    it('should create a valid connection time with zero', () => {
      const connectionTime = new VisitorConnectionTime(0);
      expect(connectionTime.value).toBe(0);
    });

    it('should throw error for negative values', () => {
      expect(() => new VisitorConnectionTime(-1)).toThrow(
        'El tiempo de conexión debe ser un número entero positivo en milisegundos',
      );
    });

    it('should throw error for non-integer values', () => {
      expect(() => new VisitorConnectionTime(1000.5)).toThrow(
        'El tiempo de conexión debe ser un número entero positivo en milisegundos',
      );
    });

    it('should throw error for non-numeric values', () => {
      expect(() => new VisitorConnectionTime('1000' as any)).toThrow(
        'El tiempo de conexión debe ser un número entero positivo en milisegundos',
      );
    });
  });

  describe('toSeconds', () => {
    it('should convert milliseconds to seconds correctly', () => {
      const connectionTime = new VisitorConnectionTime(5000);
      expect(connectionTime.toSeconds()).toBe(5);
    });

    it('should round down partial seconds', () => {
      const connectionTime = new VisitorConnectionTime(5999);
      expect(connectionTime.toSeconds()).toBe(5);
    });
  });

  describe('toMinutes', () => {
    it('should convert milliseconds to minutes correctly', () => {
      const connectionTime = new VisitorConnectionTime(300000); // 5 minutes
      expect(connectionTime.toMinutes()).toBe(5);
    });

    it('should round down partial minutes', () => {
      const connectionTime = new VisitorConnectionTime(359999); // 5:59
      expect(connectionTime.toMinutes()).toBe(5);
    });
  });

  describe('toHumanReadable', () => {
    it('should format seconds only when less than a minute', () => {
      const connectionTime = new VisitorConnectionTime(30000); // 30 seconds
      expect(connectionTime.toHumanReadable()).toBe('30s');
    });

    it('should format minutes and seconds when over a minute', () => {
      const connectionTime = new VisitorConnectionTime(90000); // 1:30
      expect(connectionTime.toHumanReadable()).toBe('1m 30s');
    });

    it('should handle exact minutes', () => {
      const connectionTime = new VisitorConnectionTime(300000); // 5:00
      expect(connectionTime.toHumanReadable()).toBe('5m 0s');
    });

    it('should handle zero time', () => {
      const connectionTime = new VisitorConnectionTime(0);
      expect(connectionTime.toHumanReadable()).toBe('0s');
    });
  });
});
