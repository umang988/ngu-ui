import { TestBed } from '@angular/core/testing';
import type { Field } from '@angular/forms/signals';
import { defineForm } from './define';
import { persistable } from './draft';
import { createNguI18n, formatTemporal } from './messages';
import { phoneCountry, splitPhone, toE164 } from './phone';
import { isPlausiblePhone, isWebUrl, withScheme } from './rules';
import type { DynamicField, FormDef, LeafDef } from './types';

declare module './types' {
  interface NguFieldTypeMap {
    mood: number;
  }
  interface NguFieldOptionsMap {
    mood: { faces?: readonly string[] };
  }
}

const COLORS = [
  { value: 'red', label: 'Red' },
  { value: 'green', label: 'Green' },
  { value: 'blue', label: 'Blue' },
];
const SIZES = [
  { value: 1, label: 'S' },
  { value: 2, label: 'M' },
  { value: 3, label: 'L' },
];

const run = <T>(fn: () => T): T => TestBed.runInInjectionContext(fn);

/** First error kind of a field, or undefined when it is valid. */
function kindOf(def: FormDef<any>, key: string): string | undefined {
  const field = (def.tree as unknown as Record<string, Field<unknown>>)[key];
  return field().errors()[0]?.kind;
}

function leaf(def: FormDef<any>, key: string): LeafDef {
  return def.fields[key] as LeafDef;
}

describe('field type catalogue: definitions', () => {
  it('marks list values edited as one field', () => {
    const def = run(() =>
      defineForm(
        { colors: [] as string[], sizes: [] as number[], skills: [] as string[] },
        {
          colors: { label: 'Colors', type: 'checkbox', options: COLORS },
          sizes: { label: 'Sizes', type: 'select', options: SIZES },
          skills: { label: 'Skills', type: 'tags' },
        },
      ),
    );
    expect(leaf(def, 'colors')).toMatchObject({ type: 'checkbox', multiple: true });
    expect(leaf(def, 'sizes')).toMatchObject({ type: 'select', multiple: true });
    expect(leaf(def, 'skills')).toMatchObject({ type: 'tags', multiple: true });
  });

  it('rejects a type that does not fit the value, for untyped callers', () => {
    const define = (initial: object, spec: object) => run(() => defineForm(initial, spec as never));
    expect(() => define({ tags: '' }, { tags: { type: 'tags' } })).toThrow(
      /"tags" has type "tags" and needs a string array/,
    );
    expect(() => define({ plan: '' }, { plan: { type: 'radio' } })).toThrow(/needs "options"/);
    expect(() => define({ picks: [] }, { picks: { type: 'radio', options: COLORS } })).toThrow(
      /use "checkbox" or "select"/,
    );
    expect(() => define({ stay: '' }, { stay: { type: 'daterange' } })).toThrow(
      /needs a \{ from, to \} value/,
    );
    expect(() => define({ ok: false }, { ok: { type: 'consent' } })).toThrow(
      /needs a Date or null value/,
    );
  });

  it('checks spec types at compile time', () => {
    run(() => {
      defineForm(
        {
          colors: [] as string[],
          sizes: [] as number[],
          skills: [] as string[],
          on: false,
          agreed: null as Date | null,
          stay: { from: null as Date | null, to: null as Date | null },
          phone: '',
          volume: 0,
          mood: 0,
        },
        {
          colors: { type: 'checkbox', options: COLORS, min: 1, max: 2 },
          sizes: { type: 'select', options: SIZES },
          skills: { type: 'tags', maxLength: 20, separators: [',', ';'] },
          on: { label: 'On', type: 'switch' },
          agreed: { label: 'I agree', type: 'consent', policy: { href: '/terms', label: 'Terms' } },
          stay: { label: 'Stay', type: 'daterange', min: '2026-01-01', fromLabel: 'Check in' },
          phone: { label: 'Phone', type: 'phone', countries: ['IN', 'US'], country: 'IN' },
          volume: { label: 'Volume', type: 'range', min: 0, max: 11 },
          mood: { label: 'Mood', type: 'mood', faces: ['🙁', '🙂'], min: 1 },
        },
      );
      // Type checks only; never run.
      void (() =>
        defineForm(
          { name: '', count: 0, sizes: [] as number[], on: false, at: new Date(), mood: 0 },
          {
            // @ts-expect-error: tags edit a string array
            name: { type: 'tags' },
            // @ts-expect-error: a one-time code edits a string
            count: { type: 'otp' },
            // @ts-expect-error: options of a number list must be numbers
            sizes: { type: 'checkbox', options: COLORS },
            // @ts-expect-error: consent needs a nullable date
            on: { type: 'consent' },
            // @ts-expect-error: consent needs a nullable date, null meaning "not accepted"
            at: { type: 'consent' },
            // @ts-expect-error: options the custom type did not declare
            mood: { type: 'mood', bogus: true },
          },
        ));
    });
    expect(true).toBe(true);
  });
});

describe('field type catalogue: rules', () => {
  it('counts chosen options and requires at least one when required', () => {
    const def = run(() =>
      defineForm(
        { colors: [] as string[], sizes: [] as number[] },
        {
          colors: {
            label: 'Colors',
            type: 'checkbox',
            options: COLORS,
            required: true,
            min: 2,
            max: 2,
          },
          sizes: { label: 'Sizes', type: 'select', options: SIZES, max: 1 },
        },
      ),
    );
    expect(kindOf(def, 'colors')).toBe('required');
    def.patch({ colors: ['red'] });
    expect(kindOf(def, 'colors')).toBe('minSelected');
    def.patch({ colors: ['red', 'green', 'blue'] });
    expect(kindOf(def, 'colors')).toBe('maxSelected');
    def.patch({ colors: ['red', 'blue'], sizes: [1, 2] });
    expect(kindOf(def, 'colors')).toBeUndefined();
    expect(kindOf(def, 'sizes')).toBe('maxSelected');
  });

  it('counts tags as entries, and an optional empty list is valid', () => {
    const def = run(() =>
      defineForm(
        { skills: [] as string[] },
        { skills: { label: 'Skills', type: 'tags', min: 2, max: 3 } },
      ),
    );
    expect(kindOf(def, 'skills')).toBeUndefined();
    def.patch({ skills: ['a'] });
    expect(kindOf(def, 'skills')).toBe('minItems');
    def.patch({ skills: ['a', 'b', 'c', 'd'] });
    expect(kindOf(def, 'skills')).toBe('maxItems');
  });

  it('checks web addresses, colors, codes and phone numbers', () => {
    const def = run(() =>
      defineForm(
        { site: 'example', color: '#12345', code: '123', phone: '+9198765' },
        {
          site: { label: 'Site', type: 'url' },
          color: { label: 'Color', type: 'color' },
          code: { label: 'Code', type: 'otp', length: 4 },
          phone: { label: 'Phone', type: 'phone' },
        },
      ),
    );
    expect(kindOf(def, 'site')).toBe('url');
    expect(kindOf(def, 'color')).toBe('pattern');
    expect(kindOf(def, 'code')).toBe('mask');
    expect(kindOf(def, 'phone')).toBe('phone');
    def.patch({
      site: 'https://example.com/a?b=1',
      color: '#AABBCC',
      code: '1234',
      phone: '+919876543210',
    });
    expect([
      kindOf(def, 'site'),
      kindOf(def, 'color'),
      kindOf(def, 'code'),
      kindOf(def, 'phone'),
    ]).toEqual([undefined, undefined, undefined, undefined]);
  });

  it('bounds and formats time, month and week values in their own format', () => {
    const def = run(() =>
      defineForm(
        { start: '08:30', month: '2026-13', week: '2026-W01', slot: '2026-05-01T18:00' },
        {
          start: { label: 'Start', type: 'time', min: '09:00', max: '17:30' },
          month: { label: 'Month', type: 'month' },
          week: { label: 'Week', type: 'week', min: '2026-W02' },
          slot: { label: 'Slot', type: 'datetime-local', max: '2026-05-01T17:00' },
        },
      ),
    );
    expect(kindOf(def, 'start')).toBe('minDate');
    expect(kindOf(def, 'month')).toBeUndefined(); // the shape is right; the browser rejects month 13
    expect(kindOf(def, 'week')).toBe('minDate');
    expect(kindOf(def, 'slot')).toBe('maxDate');
    def.patch({ month: 'Jan 2026' });
    expect(kindOf(def, 'month')).toBe('pattern');

    const i18n = createNguI18n();
    const error = (def.tree as any).start().errors()[0];
    expect(i18n.error(error, leaf(def, 'start'))).toBe('Start must be on or after 9:00 AM');
    expect(formatTemporal('2026-01', 'month', 'en-US')).toBe('January 2026');
    expect(formatTemporal('2026-05-01T17:00', 'datetime-local', 'en-US')).toBe(
      'May 1, 2026, 5:00 PM',
    );
    expect(formatTemporal('2026-W05', 'week', 'en-US')).toBe('2026-W05');
  });

  it('checks date ranges: both ends, order and bounds', () => {
    const d = (iso: string) => new Date(`${iso}T00:00:00Z`);
    const def = run(() =>
      defineForm(
        {
          stay: { from: null as Date | null, to: null as Date | null },
          trip: { from: '', to: '' },
        },
        {
          stay: { label: 'Stay', type: 'daterange', required: true, min: '2026-01-01' },
          trip: { label: 'Trip', type: 'daterange' },
        },
      ),
    );
    expect(kindOf(def, 'stay')).toBe('required');
    expect(kindOf(def, 'trip')).toBeUndefined();
    def.patch({ stay: { from: d('2026-03-10'), to: null } });
    expect(kindOf(def, 'stay')).toBe('dateRangeIncomplete');
    def.patch({ stay: { from: d('2026-03-10'), to: d('2026-03-01') } });
    expect(kindOf(def, 'stay')).toBe('dateRange');
    def.patch({ stay: { from: d('2025-12-30'), to: d('2026-03-01') } });
    expect(kindOf(def, 'stay')).toBe('minDate');
    def.patch({
      stay: { from: d('2026-03-01'), to: d('2026-03-01') },
      trip: { from: '2026-04-02', to: '2026-04-01' },
    });
    expect(kindOf(def, 'stay')).toBeUndefined();
    expect(kindOf(def, 'trip')).toBe('dateRange');
  });

  it('treats a zero rating as empty and its max as the star count', () => {
    const def = run(() =>
      defineForm(
        { stars: 0 },
        { stars: { label: 'Stars', type: 'rating', required: true, max: 5 } },
      ),
    );
    expect(kindOf(def, 'stars')).toBe('required');
    def.patch({ stars: 4 });
    expect(kindOf(def, 'stars')).toBeUndefined();
  });

  it('requires consent and captchas with their own messages', () => {
    const def = run(() =>
      defineForm(
        { agreed: null as Date | null, human: '' },
        {
          agreed: { label: 'I accept the terms', type: 'consent', required: true },
          human: { type: 'captcha', captcha: { render: () => ({ reset: () => undefined }) } },
        },
      ),
    );
    const i18n = createNguI18n();
    const tree = def.tree as any;
    expect(i18n.error(tree.agreed().errors()[0], leaf(def, 'agreed'))).toBe(
      'Accept this to continue',
    );
    expect(i18n.error(tree.human().errors()[0], leaf(def, 'human'))).toBe(
      'Complete the check to show you are not a robot',
    );
    def.patch({ agreed: new Date(), human: 'token' });
    expect(def.valid()).toBe(true);
  });

  it('applies the same rules to run-time fields', () => {
    const fields: DynamicField[] = [
      { key: 'site', type: 'url' },
      { key: 'topics', type: 'tags', max: 1 },
      { key: 'colors', type: 'checkbox', options: COLORS, min: 2 },
      { key: 'notify', type: 'switch' },
      { key: 'stars', type: 'rating', max: 5 },
      { key: 'start', type: 'time', min: '09:00' },
    ];
    const def = run(() =>
      defineForm({ answers: {} as Record<string, unknown> }, { answers: { fields } }),
    );
    expect(def.model().answers).toEqual({
      site: '',
      topics: [],
      colors: [],
      notify: false,
      stars: 0,
      start: '',
    });
    def.patch({ answers: { site: 'nope', topics: ['a', 'b'], colors: ['red'], start: '08:00' } });
    const answers = (def.tree as any).answers;
    expect(answers.site().errors()[0]?.kind).toBe('url');
    expect(answers.topics().errors()[0]?.kind).toBe('maxItems');
    expect(answers.colors().errors()[0]?.kind).toBe('minSelected');
    expect(answers.start().errors()[0]?.kind).toBe('minDate');
    expect(answers.stars().errors()).toEqual([]);
  });

  it('keeps one-time codes and captcha tokens out of drafts and changes', () => {
    const def = run(() =>
      defineForm(
        { name: '', code: '', human: '' },
        {
          name: 'Name',
          code: { type: 'otp' },
          human: { type: 'captcha', captcha: { render: () => ({ reset: () => undefined }) } },
        },
      ),
    );
    expect(persistable(def.fields, { name: 'Ann', code: '123456', human: 'tok' })).toEqual({
      name: 'Ann',
    });
    def.model.set({ name: 'Ann', code: '', human: 'tok' });
    expect(def.changes()).toEqual({ name: 'Ann' });
  });
});

describe('field type catalogue: helpers', () => {
  it('reads web addresses and adds a missing scheme', () => {
    expect(isWebUrl('https://example.com')).toBe(true);
    expect(isWebUrl('javascript:alert(1)')).toBe(false);
    expect(isWebUrl('example.com')).toBe(false);
    expect(withScheme('example.com/about')).toBe('https://example.com/about');
    expect(withScheme('http://example.com')).toBe('http://example.com');
    expect(withScheme('not a url')).toBe('not a url');
    expect(withScheme('')).toBe('');
  });

  it('converts phone numbers to and from E.164', () => {
    const india = phoneCountry('in')!;
    expect(toE164(india, '098765 43210')).toBe('+919876543210');
    expect(toE164(phoneCountry('IT')!, '06 1234 5678')).toBe('+390612345678');
    expect(toE164(india, '')).toBe('');
    expect(splitPhone('+447911123456')).toEqual({
      country: { code: 'GB', dial: '44' },
      national: '7911123456',
    });
    expect(splitPhone('+14165550123', undefined, 'CA')?.country.code).toBe('CA');
    expect(splitPhone('+14165550123')?.country.code).toBe('US');
    expect(isPlausiblePhone('+14155552671')).toBe(true);
    expect(isPlausiblePhone('+1415555267')).toBe(false);
    expect(isPlausiblePhone('+3531234567')).toBe(true);
    expect(isPlausiblePhone('919876543210')).toBe(false);
  });
});
