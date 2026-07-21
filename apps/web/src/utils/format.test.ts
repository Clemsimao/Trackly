import { describe, expect, it } from 'vitest';
import { formatHoursFromSeconds, formatMinutes } from './format';

describe('formatHoursFromSeconds', () => {
  it('grandes durées arrondies à l’heure', () => {
    expect(formatHoursFromSeconds(180000)).toBe('50 h');
  });

  it('petites durées avec minutes', () => {
    expect(formatHoursFromSeconds(5400)).toBe('1 h 30');
    expect(formatHoursFromSeconds(3600)).toBe('1 h');
  });

  it('moins d’une heure → minutes', () => {
    expect(formatHoursFromSeconds(1800)).toBe('30 min');
  });
});

describe('formatMinutes', () => {
  it('formate en h et min', () => {
    expect(formatMinutes(136)).toBe('2 h 16');
    expect(formatMinutes(120)).toBe('2 h');
    expect(formatMinutes(45)).toBe('45 min');
  });
});
