import { describe, expect, it } from 'vitest';
import { calculateTaskDueAt, getSlaStatus } from '../src/services/slaService.js';

describe('slaService', () => {
  it('calculates due date with priority mapping', () => {
    const base = new Date('2026-04-17T00:00:00.000Z');
    const due = calculateTaskDueAt(1, base);
    expect(new Date(due).toISOString()).toBe('2026-04-18T00:00:00.000Z');
  });

  it('returns overdue status when due date has passed', () => {
    const now = new Date('2026-04-19T00:00:00.000Z');
    expect(getSlaStatus('2026-04-18T00:00:00.000Z', null, now)).toBe('overdue');
  });
});
