import { registerLocaleData } from '@angular/common';
import localeEnIn from '@angular/common/locales/en-IN';
import { buildCells, cellText, isNumeric, type CellFormat } from './cells';
import { badgeTone, initialsOf } from './format';
import { resolvePath } from './path';
import { placeFilterPanel } from './table';
import type { NguTableColumn } from './types';

registerLocaleData(localeEnIn);

const row: any = {
  code: 'ORD-1',
  total: 125000.5,
  status: 'ON_HOLD',
  blank: null,
  active: true,
  owner: 'John Doe',
  email: 'a@b.com',
  phone: '+91 (98) 765-4321',
  done: 30,
  raised: '2026-08-31T10:00:00Z',
  rate: 0.155,
  broken: 'not-a-date',
  // Above a lakh, where the two numbering systems start to disagree.
  rupees: 15709450,
  tags: ['red', 'blue'],
};

const columns: NguTableColumn[] = [
  { field: 'code', header: 'Code' },
  { field: 'total', header: 'Value', type: 'currency', currencyCode: 'USD' },
  { field: 'rupees', header: 'Rupees', type: 'currency', currencyCode: 'INR' },
  { field: 'status', header: 'Status', type: 'badge' },
  { field: 'blank', header: 'Blank', type: 'badge' },
  { field: 'active', header: 'Active', type: 'boolean' },
  { field: 'owner', header: 'Owner', type: 'avatar' },
  { field: 'email', header: 'Email', type: 'email' },
  { field: 'phone', header: 'Phone', type: 'phone' },
  { field: 'done', header: 'Done', type: 'progress', progressMax: 60 },
  { field: 'raised', header: 'Raised', type: 'date' },
  { field: 'rate', header: 'Rate', type: 'percent' },
  { field: 'broken', header: 'Broken', type: 'date' },
  { field: 'tags', header: 'Tags' },
];

const FORMAT: CellFormat = {
  empty: '—',
  locale: 'en-US',
  currencyCode: 'USD',
  // Rupees grouped in lakhs and crores, every other currency in thousands.
  currencyLocale: (code) => (code === 'INR' ? 'en-IN' : 'en-US'),
  dateFormat: 'd MMM y',
  datetimeFormat: 'd MMM y, h:mm a',
  badgeTones: {},
  yes: 'Yes',
  no: 'No',
};

const cells = buildCells(row, columns, [], FORMAT);
const at = (header: string) => cells.find((c) => c.column.header === header)!;

describe('buildCells', () => {
  it('formats currency, number-aligns it and leaves plain text alone', () => {
    expect(at('Code').kind).toBe('text');
    expect(at('Value').text).toBe('$125,000.50');
    expect(at('Value').numeric).toBe(true);
    expect(at('Code').numeric).toBe(false);
  });

  it("groups each amount by its own currency's locale when currencyLocale says so", () => {
    expect(at('Rupees').text).toBe('₹1,57,09,450.00');
    expect(at('Value').text).toBe('$125,000.50');
  });

  it("uses the app's locale for every currency without currencyLocale", () => {
    const plain = buildCells(row, columns, [], { ...FORMAT, currencyLocale: null });
    expect(plain.find((c) => c.column.header === 'Rupees')!.text).toBe('₹15,709,450.00');
  });

  it('tones a known status and leaves an empty one as text', () => {
    expect(at('Status').kind).toBe('badge');
    expect(at('Status').badge).toBe('ngu-tbl-badge ngu-tbl-badge--warning');
    expect(at('Blank').kind).toBe('text');
    expect(at('Blank').text).toBe('—');
  });

  it('builds hrefs, stripping a phone number to what a dialer accepts', () => {
    expect(at('Email').href).toBe('mailto:a@b.com');
    expect(at('Phone').href).toBe('tel:+91987654321');
  });

  it('scales progress against the column maximum', () => {
    expect(at('Done').percent).toBe(50);
    expect(at('Done').text).toBe('50%');
  });

  it('renders booleans, avatars, dates and percents', () => {
    expect(at('Active').truthy).toBe(true);
    expect(at('Active').text).toBe('Yes');
    expect(at('Owner').initials).toBe('JD');
    expect(at('Raised').text).toContain('Aug 2026');
    expect(at('Rate').text).toBe('15.5%');
  });

  it('falls back to the raw value rather than throwing on a bad one', () => {
    expect(at('Broken').text).toBe('not-a-date');
  });

  it('joins a list value', () => {
    expect(at('Tags').text).toBe('red, blue');
  });

  it('lets a formatter have the last word', () => {
    const column: NguTableColumn = {
      field: 'total',
      header: 'Total',
      type: 'currency',
      formatter: (value, r) => `${r.code}: ${value}`,
    };
    expect(buildCells(row, [column], [], FORMAT)[0].text).toBe('ORD-1: 125000.5');
  });

  it('falls back to the plain value when a template column has no template', () => {
    const cell = buildCells(
      row,
      [{ field: 'code', header: 'Code', template: true }],
      [],
      FORMAT,
    )[0];
    expect(cell.kind).toBe('text');
    expect(cell.text).toBe('ORD-1');
  });
});

describe('cellText for the CSV', () => {
  it('writes what the screen shows for booleans and progress, not true or 30', () => {
    const active = columns.find((c) => c.field === 'active')!;
    const done = columns.find((c) => c.field === 'done')!;

    expect(cellText(true, active, row, FORMAT)).toBe('Yes');
    expect(cellText(false, active, row, FORMAT)).toBe('No');
    expect(cellText(30, done, row, FORMAT)).toBe('50%');
  });

  it('uses the translated words', () => {
    const active = columns.find((c) => c.field === 'active')!;
    expect(cellText(true, active, row, { ...FORMAT, yes: 'Ja' })).toBe('Ja');
  });
});

describe('helpers', () => {
  it('resolves dot paths through missing segments', () => {
    expect(resolvePath({ a: { b: 'c' } }, 'a.b')).toBe('c');
    expect(resolvePath({ a: null }, 'a.b')).toBe(null);
    expect(resolvePath({ a: 0 }, 'a')).toBe(0);
  });

  it('normalizes status words before matching', () => {
    expect(badgeTone('ON_HOLD')).toBe('warning');
    expect(badgeTone('In-Progress')).toBe('warning');
    expect(badgeTone('AWAITING_PICKUP')).toBe('neutral');
    expect(badgeTone('AWAITING_PICKUP', { AWAITING_PICKUP: 'info' })).toBe('info');
  });

  it("checks the app's tones after the column's map and before the built-in words", () => {
    const app = { awaitingpickup: 'accent', active: 'info' } as const;

    expect(badgeTone('AWAITING_PICKUP', undefined, app)).toBe('accent');
    expect(badgeTone('ACTIVE', undefined, app)).toBe('info');
    expect(badgeTone('ACTIVE', { ACTIVE: 'danger' }, app)).toBe('danger');
  });

  it('initials a name from its first and last word', () => {
    expect(initialsOf('Mary Jane Watson')).toBe('MW');
    expect(initialsOf('alice')).toBe('AL');
    expect(initialsOf(null)).toBe('?');
  });

  it('treats the numeric types as numeric without being told', () => {
    expect(isNumeric({ field: 'a', header: 'A', type: 'percent' })).toBe(true);
    expect(isNumeric({ field: 'a', header: 'A' })).toBe(false);
  });
});

describe('placeFilterPanel', () => {
  const trigger = { top: 100, bottom: 140, right: 900 };

  it('opens below, right-aligned to the trigger', () => {
    const pos = placeFilterPanel(trigger, 1200, 800);

    expect(pos.top).toBe(148);
    expect(pos.bottom).toBe(null);
    expect(pos.left).toBe(580); // 900 - 320
    expect(pos.maxHeight).toBe(644); // 800 - 140 - 16
  });

  it('flips above when the room below runs out', () => {
    // 60px below the trigger, 700 above it.
    const pos = placeFilterPanel({ top: 700, bottom: 740, right: 900 }, 1200, 800);

    expect(pos.top).toBe(null);
    expect(pos.bottom).toBe(108); // 800 - 700 + 8
    expect(pos.maxHeight).toBe(684);
  });

  it('stays inside the right edge', () => {
    expect(placeFilterPanel({ ...trigger, right: 1195 }, 1200, 800).left).toBe(872);
  });

  it('stays inside the left edge on a viewport narrower than the panel', () => {
    expect(placeFilterPanel({ ...trigger, right: 280 }, 300, 800).left).toBe(8);
  });
});
