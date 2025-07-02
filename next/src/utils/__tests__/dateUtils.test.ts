import { formatDate, formatDateShort, formatDateTime, isValidDate, formatDuration } from '../dateUtils';

describe('dateUtils', () => {
  describe('formatDate', () => {
    it('should return "N/A" for null or undefined input', () => {
      expect(formatDate(null)).toBe('N/A');
      expect(formatDate(undefined)).toBe('N/A');
      expect(formatDate('')).toBe('N/A');
    });

    it('should format Unix timestamps correctly', () => {
      const timestamp = '1672531200'; // 2023-01-01 00:00:00 UTC
      const result = formatDate(timestamp);
      expect(result).toContain('2023');
    });

    it('should format ISO date strings correctly', () => {
      const isoDate = '2023-01-01T00:00:00.000Z';
      const result = formatDate(isoDate);
      expect(result).toContain('2023');
    });

    it('should return "Invalid Date" for invalid date strings', () => {
      expect(formatDate('invalid-date')).toBe('Invalid Date');
      expect(formatDate('not-a-date')).toBe('Invalid Date');
    });

    it('should handle regular date strings', () => {
      const dateString = '2023-01-01';
      const result = formatDate(dateString);
      expect(result).toContain('2023');
    });
  });

  describe('formatDateShort', () => {
    it('should return "N/A" for null or undefined input', () => {
      expect(formatDateShort(null)).toBe('N/A');
      expect(formatDateShort(undefined)).toBe('N/A');
      expect(formatDateShort('')).toBe('N/A');
    });

    it('should format Unix timestamps to short date format', () => {
      const timestamp = '1672531200'; // 2023-01-01 00:00:00 UTC
      const result = formatDateShort(timestamp);
      expect(result).toContain('2023');
    });

    it('should format ISO date strings to short format', () => {
      const isoDate = '2023-01-01T00:00:00.000Z';
      const result = formatDateShort(isoDate);
      expect(result).toContain('2023');
    });

    it('should return "Invalid Date" for invalid date strings', () => {
      expect(formatDateShort('invalid-date')).toBe('Invalid Date');
    });
  });

  describe('formatDateTime', () => {
    it('should return "N/A" for null or undefined input', () => {
      expect(formatDateTime(null)).toBe('N/A');
      expect(formatDateTime(undefined)).toBe('N/A');
      expect(formatDateTime('')).toBe('N/A');
    });

    it('should format Unix timestamps correctly', () => {
      const timestamp = '1672531200';
      const result = formatDateTime(timestamp);
      expect(result).toContain('2023');
    });

    it('should format ISO date strings correctly', () => {
      const isoDate = '2023-01-01T00:00:00.000Z';
      const result = formatDateTime(isoDate);
      expect(result).toContain('2023');
    });

    it('should return "Invalid Date" for invalid date strings', () => {
      expect(formatDateTime('invalid-date')).toBe('Invalid Date');
    });
  });

  describe('isValidDate', () => {
    it('should return true for valid dates', () => {
      expect(isValidDate('2023-01-01')).toBe(true);
      expect(isValidDate('2023-01-01T00:00:00.000Z')).toBe(true);
      expect(isValidDate('1672531200')).toBe(true); // Unix timestamp
    });

    it('should return false for invalid dates', () => {
      expect(isValidDate('invalid-date')).toBe(false);
      expect(isValidDate('not-a-date')).toBe(false);
      expect(isValidDate('')).toBe(false);
      expect(isValidDate(null)).toBe(false);
      expect(isValidDate(undefined)).toBe(false);
    });
  });

  describe('formatDuration', () => {
    it('should format duration with hours, minutes, and seconds', () => {
      expect(formatDuration(3661)).toBe('1h 1m 1s');
      expect(formatDuration(3600)).toBe('1h 0m 0s');
      expect(formatDuration(7265)).toBe('2h 1m 5s');
    });

    it('should format duration with minutes and seconds only', () => {
      expect(formatDuration(65)).toBe('1m 5s');
      expect(formatDuration(600)).toBe('10m 0s');
      expect(formatDuration(125)).toBe('2m 5s');
    });

    it('should format duration with seconds only', () => {
      expect(formatDuration(30)).toBe('30s');
      expect(formatDuration(5)).toBe('5s');
      expect(formatDuration(0)).toBe('0s');
    });
  });
});
