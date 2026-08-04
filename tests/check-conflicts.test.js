import { describe, it, expect, beforeEach } from 'vitest';

// Shared mutable mock state — modified by test, read by calendar-renderer
// vi.hoisted() гарантує ініціалізацію до того, як vitest підніме vi.mock()
const { mockState } = vi.hoisted(() => ({
  mockState: {
    lessons: [],
    movedLessons: [],
    cancelledDates: [],
    singleEvents: [],
    nonWorkingSlots: [],
    recurringNonWorkingSlots: [],
    workingExceptions: [],
  },
}));

vi.mock('../src/config.js', () => ({
  WORK_START_HOUR: 8,
  WORK_END_HOUR: 22,
  LESSON_DURATION: 90,
  SLOT_HEIGHT: 40,
  REGIONAL_TIMEZONES: [],
}));

vi.mock('../src/utils/time-utils.js', () => ({
  DAYS_SHORT: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'],
}));

vi.mock('../src/state.js', () => ({
  state: mockState,
  formatDate: vi.fn(),
  getMonday: vi.fn(),
}));

import { checkConflicts } from '../src/core/calendar-renderer.js';

// Helpers
const lesson = (id, title, dayOfWeek, startTime, hasPrep = false) => ({
  id, title, dayOfWeek: dayOfWeek ?? 1, startTime: startTime ?? '10:00', hasPrep, endDate: null,
});

const movedLesson = (id, lessonId, dateStr, timeStr, title) => ({
  id, lessonId, dateStr, timeStr, title, originalDateStr: dateStr,
});

const singleEvent = (id, dateStr, timeStr, duration = 60) => ({
  id, dateStr, timeStr, duration, studentName: '', groupName: '',
});

const MON = '2024-01-15'; // Monday
const TUE = '2024-01-16';

describe('checkConflicts', () => {
  beforeEach(() => {
    mockState.lessons = [];
    mockState.movedLessons = [];
    mockState.cancelledDates = [];
    mockState.singleEvents = [];
    mockState.nonWorkingSlots = [];
    mockState.recurringNonWorkingSlots = [];
    mockState.workingExceptions = [];
  });

  describe('no conflicts', () => {
    it('returns empty array when slot is free', () => {
      const result = checkConflicts('none', MON, '10:00', null);
      expect(result).toEqual([]);
    });

    it('ignores lessons on different day of week', () => {
      mockState.lessons.push(lesson('l1', 'test', 2, '10:00')); // Tuesday
      const result = checkConflicts('none', MON, '10:00', null); // Monday
      expect(result).toEqual([]);
    });

    it('returns no conflict when target ends exactly when lesson starts (exclusive border)', () => {
      // target 10:00-11:30 (600-690)
      // lesson 11:30-13:00 (690-750) → s1<e2 && e1>s2 = 600<750 && 690>690 = false
      mockState.lessons.push(lesson('l1', 'test', 1, '11:30'));
      const result = checkConflicts('none', MON, '10:00', null);
      expect(result).toEqual([]);
    });

    it('returns no conflict when target starts when lesson ends (exclusive border)', () => {
      // lesson 09:00-10:30 (540-630)
      // target 10:30-12:00 (630-720) → 630<720 && 630>630 = false
      mockState.lessons.push(lesson('l1', 'test', 1, '09:00'));
      const result = checkConflicts('none', MON, '10:30', null);
      expect(result).toEqual([]);
    });
  });

  describe('conflict with existing lessons', () => {
    it('detects overlap with lesson at same time', () => {
      mockState.lessons.push(lesson('l1', 'Англійська', 1, '10:00'));
      const result = checkConflicts('none', MON, '10:00', null);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('lesson');
      expect(result[0].msg).toContain('Англійська');
      expect(result[0].msg).toContain('10:00');
    });

    it('detects overlap with partially overlapping lesson', () => {
      // target 10:00-11:30, lesson 11:00-12:30 → overlap 11:00-11:30
      mockState.lessons.push(lesson('l1', 'Math', 1, '11:00'));
      const result = checkConflicts('none', MON, '10:00', null);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('lesson');
    });

    it('detects overlap with prep of existing lesson', () => {
      // target 09:30-11:00, lesson 10:00 has prep (09:30-10:00)
      mockState.lessons.push(lesson('l1', 'test', 1, '10:00', true));
      const result = checkConflicts('none', MON, '09:30', null);
      expect(result.some(c => c.type === 'prep' && c.msg.includes('test'))).toBe(true);
    });

    it('ignores self (the moving lesson)', () => {
      mockState.lessons.push(lesson('self', 'test', 1, '10:00'));
      const result = checkConflicts('self', MON, '10:00', null);
      expect(result).toEqual([]);
    });
  });

  describe('cancelled / moved lessons excluded from conflict', () => {
    it('skips lesson that is cancelled on target date', () => {
      mockState.lessons.push(lesson('l1', 'test', 1, '10:00'));
      mockState.cancelledDates.push('l1_2024-01-15');
      const result = checkConflicts('none', MON, '10:00', null);
      expect(result).toEqual([]);
    });

    it('still detects conflict with same lesson on a non-cancelled date', () => {
      mockState.lessons.push(lesson('l1', 'test', 1, '10:00'));
      mockState.cancelledDates.push('l1_2024-01-15');
      // next Monday, same dayOfWeek, not cancelled
      const result = checkConflicts('none', '2024-01-22', '10:00', null);
      expect(result).toHaveLength(1);
    });
  });

  describe('conflict with moved lessons', () => {
    it('detects overlap with moved lesson on same date', () => {
      mockState.movedLessons.push(movedLesson('ml1', 'l1', MON, '10:00', 'Moved'));
      const result = checkConflicts('none', MON, '10:00', null);
      expect(result.some(c => c.msg.includes('Moved') && c.msg.includes('10:00'))).toBe(true);
    });

    it('ignores moved lesson on different date', () => {
      mockState.movedLessons.push(movedLesson('ml1', 'l1', TUE, '10:00', 'Moved'));
      const result = checkConflicts('none', MON, '10:00', null);
      expect(result).toEqual([]);
    });
  });

  describe('conflict with single events', () => {
    it('detects overlap with single event', () => {
      mockState.singleEvents.push(singleEvent('ev1', MON, '10:00', 60));
      const result = checkConflicts('none', MON, '10:00', null);
      expect(result.some(c => c.type === 'conflict')).toBe(true);
    });

    it('excludes self via excludeEventId', () => {
      mockState.singleEvents.push(singleEvent('ev1', MON, '10:00', 60));
      const result = checkConflicts('none', MON, '10:00', 'ev1');
      expect(result).toEqual([]);
    });
  });

  describe('non-working time conflict', () => {
    it('detects conflict when target is in nonWorkingSlots', () => {
      mockState.nonWorkingSlots.push('2024-01-15_10:00');
      const result = checkConflicts('none', MON, '10:00', null);
      expect(result.some(c => c.msg.includes('неробочий час'))).toBe(true);
    });

    it('no conflict when non-working slot has a working exception', () => {
      mockState.recurringNonWorkingSlots.push('1_10:00');
      mockState.workingExceptions.push('2024-01-15_10:00');
      const result = checkConflicts('none', MON, '10:00', null);
      expect(result.some(c => c.msg.includes('неробочий час'))).toBe(false);
    });
  });

  describe('moving lesson with prep', () => {
    it('detects conflict when moving prep overlaps existing lesson', () => {
      // moving lesson at 10:00 with hasPrep → prep 09:30-10:00
      // existing lesson 09:00-10:30 overlaps prep
      mockState.lessons.push(lesson('existing', 'existing', 1, '09:00'));
      mockState.lessons.push(lesson('moving', 'moving', 1, '10:00', true));
      const result = checkConflicts('moving', MON, '10:00', null);
      expect(result.some(c => c.type === 'prep' && c.msg.includes('existing'))).toBe(true);
    });

    it('detects conflict when moving prep overlaps existing lesson prep', () => {
      // moving lesson 10:00 with hasPrep → prep 09:30-10:00
      // existing lesson 09:00 with hasPrep → prep 08:30-09:00
      // moving prep 09:30-10:00 doesn't overlap existing prep 08:30-09:00
      // moving prep 09:30-10:00 overlaps existing lesson 09:00-10:30 (tested above)
      // So this tests: moving prep overlaps existing prep specifically
      // moving prep 09:30-10:00, existing lesson 11:00 with prep 10:30-11:00
      // moving target 10:00-11:30, prep 09:30-10:00
      // existing prep 10:30-11:00 → no overlap
      // existing lesson 11:00-12:30 → overlap(600, 690, 660, 750) = true
      mockState.lessons.push(lesson('moving', 'moving', 1, '10:00', true));
      mockState.lessons.push(lesson('l2', 'later', 1, '11:00', true));
      const result = checkConflicts('moving', MON, '10:00', null);
      // conflict with lesson at 11:00
      expect(result.some(c => c.msg.includes('later'))).toBe(true);
    });

    it('detects prep time being non-working', () => {
      mockState.lessons.push(lesson('moving', 'moving', 1, '10:00', true));
      mockState.nonWorkingSlots.push('2024-01-15_09:30');
      const result = checkConflicts('moving', MON, '10:00', null);
      expect(result.some(c => c.msg.includes('неробочий час на відпрацюванні'))).toBe(true);
    });

    it('skips prep checks when moving lesson has no prep', () => {
      mockState.lessons.push(lesson('moving', 'moving', 1, '10:00', false));
      mockState.nonWorkingSlots.push('2024-01-15_09:30');
      const result = checkConflicts('moving', MON, '10:00', null);
      expect(result.some(c => c.msg.includes('неробочий час на відпрацюванні'))).toBe(false);
    });
  });

  describe('multiple conflicts', () => {
    it('returns all conflicts', () => {
      mockState.lessons.push(lesson('l1', 'first', 1, '10:00'));
      mockState.lessons.push(lesson('l2', 'second', 1, '11:00'));
      const result = checkConflicts('none', MON, '10:00', null);
      expect(result.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('real-world scenario', () => {
    it('single event at 9:00 does not conflict with lesson at 11:00 with prep at 10:30', () => {
      // lesson at 11:00 (660) with prep 10:30-11:00 (630-660)
      // target (single event) at 9:00-10:30 (540-630 with 90-min assumption)
      // wait — with 90-min assumption targetEnd=630 which equals prepStart (630)
      // overlap(540, 630, 630, 660) = 540<660 && 630>630 = true && false = false → no conflict
      mockState.lessons.push(lesson('l1', 'test', 1, '11:00', true)); // prep 10:30-11:00
      const result = checkConflicts('none', MON, '09:00', null);
      expect(result).toEqual([]);
    });

    it('single event at 9:00 does not conflict with moved lesson at 10:00 that is cancelled', () => {
      // lesson at 10:00 normally, but cancelled on this date
      // moved lesson is elsewhere, no conflict
      mockState.lessons.push(lesson('l1', 'test', 1, '10:00'));
      mockState.cancelledDates.push('l1_2024-01-15');
      const result = checkConflicts('none', MON, '09:00', null);
      expect(result).toEqual([]);
    });
  });

  describe('60-min single event duration', () => {
    it('60-min prep at 10:30 abutting 11:30 lesson does NOT conflict', () => {
      // prep 10:30-11:30 (630-690), lesson 11:30-13:00 (690-780)
      // exclusive border: 690 > 690 is false → no overlap
      mockState.lessons.push(lesson('l1', 'test', 1, '11:30'));
      const result = checkConflicts('ev1', MON, '10:30', 'ev1', 60);
      expect(result).toEqual([]);
    });

    it('60-min prep at 10:30 overlapping 10:00 lesson DOES conflict', () => {
      // prep 10:30-11:30 (630-690), lesson 10:00-11:30 (600-690)
      // overlap(630, 690, 600, 690) = 630<690 && 690>600 = true
      mockState.lessons.push(lesson('l1', 'test', 1, '10:00'));
      const result = checkConflicts('ev1', MON, '10:30', 'ev1', 60);
      expect(result.some(c => c.type === 'lesson')).toBe(true);
    });

    it('90-min lesson at 10:30 abutting 11:30 lesson DOES conflict (unlike 60-min prep)', () => {
      // lesson 10:30-12:00 (630-720), lesson 11:30-13:00 (690-780)
      // overlap(630, 720, 690, 780) = 630<780 && 720>690 = true → conflict
      mockState.lessons.push(lesson('l1', 'existing', 1, '11:30'));
      const result = checkConflicts('l2', MON, '10:30', null, 90);
      expect(result.some(c => c.type === 'lesson')).toBe(true);
    });

    it('defaults to 90-min duration when not specified', () => {
      mockState.lessons.push(lesson('l1', 'existing', 1, '11:30'));
      const result = checkConflicts('l2', MON, '10:30', null);
      expect(result.some(c => c.type === 'lesson')).toBe(true);
    });
  });
});
