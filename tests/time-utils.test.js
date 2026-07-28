import { describe, it, expect } from 'vitest';
import {
  calcMinutesFromBase,
  calcTopPx,
  calcHeightPx,
  calcLessonPosition,
  DAYS_SHORT,
} from '../time-utils.js';

describe('DAYS_SHORT', () => {
  it('has 7 day labels', () => {
    expect(DAYS_SHORT).toHaveLength(7);
    expect(DAYS_SHORT).toEqual(['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']);
  });
});

describe('calcMinutesFromBase', () => {
  it('returns 0 for 8:00 (base hour)', () => {
    expect(calcMinutesFromBase(8, 0)).toBe(0);
  });

  it('returns 30 for 8:30', () => {
    expect(calcMinutesFromBase(8, 30)).toBe(30);
  });

  it('returns 60 for 9:00', () => {
    expect(calcMinutesFromBase(9, 0)).toBe(60);
  });

  it('returns 780 for 21:00', () => {
    expect(calcMinutesFromBase(21, 0)).toBe(780);
  });

  it('handles zero minutes correctly', () => {
    expect(calcMinutesFromBase(10, 0)).toBe(120);
  });

  it('works with non-zero minutes', () => {
    expect(calcMinutesFromBase(14, 30)).toBe(390);
  });
});

describe('calcTopPx', () => {
  it('returns 0 for 0 minutes from base', () => {
    expect(calcTopPx(0)).toBe(0);
  });

  it('returns 40 for 30 minutes (one slot)', () => {
    expect(calcTopPx(30)).toBe(40);
  });

  it('returns 80 for 60 minutes', () => {
    expect(calcTopPx(60)).toBe(80);
  });

  it('linearly scales with SLOT_HEIGHT=40', () => {
    expect(calcTopPx(390)).toBe(520);
    expect(calcTopPx(780)).toBe(1040);
  });
});

describe('calcHeightPx', () => {
  it('returns 40 for 30 min', () => {
    expect(calcHeightPx(30)).toBe(40);
  });

  it('returns 80 for 60 min', () => {
    expect(calcHeightPx(60)).toBe(80);
  });

  it('returns 120 for 90 min (lesson)', () => {
    expect(calcHeightPx(90)).toBe(120);
  });

  it('returns 160 for 120 min', () => {
    expect(calcHeightPx(120)).toBe(160);
  });
});

describe('calcLessonPosition', () => {
  it('returns correct position for 8:00', () => {
    expect(calcLessonPosition(8, 0)).toEqual({ topPx: 0, heightPx: 120 });
  });

  it('returns correct position for 10:00', () => {
    expect(calcLessonPosition(10, 0)).toEqual({ topPx: 160, heightPx: 120 });
  });

  it('returns correct position for 14:30', () => {
    expect(calcLessonPosition(14, 30)).toEqual({ topPx: 520, heightPx: 120 });
  });

  it('returns correct position for 21:00 (last start hour)', () => {
    expect(calcLessonPosition(21, 0)).toEqual({ topPx: 1040, heightPx: 120 });
  });
});
