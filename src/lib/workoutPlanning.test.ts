import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  pickFeaturedWorkout,
  sortWorkoutsBySchedule,
  weekdayLabelFrFromIso,
  nextOccurrenceJsWeekday,
  localTodayIso,
} from './workoutPlanning';

describe('pickFeaturedWorkout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 15, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retourne null si la liste est vide', () => {
    expect(pickFeaturedWorkout([])).toBeNull();
    expect(pickFeaturedWorkout(null as unknown as { date?: string }[])).toBeNull();
  });

  it('priorise la séance du jour parmi les non terminées', () => {
    expect(localTodayIso()).toBe('2026-03-15');
    const chosen = pickFeaturedWorkout([
      { date: '2026-03-20', status: 'pending', title: 'future' },
      { date: '2026-03-15', status: 'pending', title: 'aujourdhui' },
    ]);
    expect(chosen?.title).toBe('aujourdhui');
  });

  it('prend la prochaine date future si pas aujourd’hui', () => {
    const chosen = pickFeaturedWorkout([
      { date: '2026-03-20', status: 'pending', title: 'b' },
      { date: '2026-03-18', status: 'pending', title: 'a' },
    ]);
    expect(chosen?.title).toBe('a');
  });

  it('prend la plus récente en retard si pas de futur', () => {
    const chosen = pickFeaturedWorkout([
      { date: '2026-03-01', status: 'pending', title: 'vieux' },
      { date: '2026-03-10', status: 'pending', title: 'moins_vieux' },
    ]);
    expect(chosen?.title).toBe('moins_vieux');
  });

  it('ignore les terminées tant qu’il reste des séances actives', () => {
    const chosen = pickFeaturedWorkout([
      { date: '2026-03-15', status: 'completed', title: 'fait' },
      { date: '2026-03-16', status: 'pending', title: 'a_faire' },
    ]);
    expect(chosen?.title).toBe('a_faire');
  });

  it('retombe sur toutes les séances si tout est terminé', () => {
    const chosen = pickFeaturedWorkout([
      { date: '2026-03-10', status: 'completed', title: 'x' },
    ]);
    expect(chosen?.title).toBe('x');
  });
});

describe('sortWorkoutsBySchedule', () => {
  it('ordonne par date ISO croissante quand les deux ont une date valide', () => {
    const sorted = sortWorkoutsBySchedule([
      { date: '2026-03-20', title: 'b' },
      { date: '2026-03-10', title: 'a' },
    ]);
    expect(sorted.map((w) => w.title)).toEqual(['a', 'b']);
  });
});

describe('weekdayLabelFrFromIso', () => {
  it('retourne une chaîne vide si le format est invalide', () => {
    expect(weekdayLabelFrFromIso('')).toBe('');
    expect(weekdayLabelFrFromIso('bad')).toBe('');
  });

  it('retourne un libellé de jour pour une date valide', () => {
    const label = weekdayLabelFrFromIso('2026-03-15');
    expect(label.length).toBeGreaterThan(2);
  });
});

describe('nextOccurrenceJsWeekday', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 15, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renvoie une date ISO YYYY-MM-DD', () => {
    const iso = nextOccurrenceJsWeekday(1);
    expect(/^\d{4}-\d{2}-\d{2}$/.test(iso)).toBe(true);
  });
});
