import { describe, it, expect } from 'vitest';
import { getMonday, formatDate } from '../src/utils/dates.js';

describe('getMonday', () => {
  it('returns same day for Monday', () => {
    const monday = new Date('2024-01-15T12:00:00');
    const result = getMonday(monday);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(15);
  });

  it('returns Monday for Wednesday', () => {
    const wednesday = new Date('2024-01-17T12:00:00');
    const result = getMonday(wednesday);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(15);
  });

  it('returns Monday for Sunday (previous week)', () => {
    const sunday = new Date('2024-01-21T12:00:00');
    const result = getMonday(sunday);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(15);
  });

  it('returns Monday for Saturday', () => {
    const saturday = new Date('2024-01-20T12:00:00');
    const result = getMonday(saturday);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(15);
  });

  it('handles month boundary (end of month)', () => {
    const date = new Date('2024-01-31T12:00:00');
    const result = getMonday(date);
    expect(result.getDay()).toBe(1);
    expect(result.getDate()).toBe(29);
  });

  it('handles year boundary', () => {
    const date = new Date('2024-01-01T12:00:00');
    const result = getMonday(date);
    expect(result.getDay()).toBe(1);
    // Jan 1, 2024 is Monday
    expect(result.getDate()).toBe(1);
    expect(result.getMonth()).toBe(0);
  });

  it('returns a copy, not the original', () => {
    const original = new Date('2024-01-17T12:00:00');
    const result = getMonday(original);
    original.setDate(1);
    expect(result.getDate()).toBe(15);
  });
});

describe('formatDate', () => {
  it('formats date to YYYY-MM-DD', () => {
    const date = new Date('2024-01-15T12:00:00');
    expect(formatDate(date)).toBe('2024-01-15');
  });

  it('pads month and day with zeros', () => {
    const date = new Date('2024-03-05T12:00:00');
    expect(formatDate(date)).toBe('2024-03-05');
  });

  it('handles single-digit month and day', () => {
    const date = new Date('2024-09-01T12:00:00');
    expect(formatDate(date)).toBe('2024-09-01');
  });

  it('handles December', () => {
    const date = new Date('2024-12-25T12:00:00');
    expect(formatDate(date)).toBe('2024-12-25');
  });
});
