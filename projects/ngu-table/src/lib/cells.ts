import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
  getCurrencySymbol,
} from '@angular/common';
import type { TemplateRef } from '@angular/core';
import { badgeTone, initialsOf } from './format';
import { resolvePath } from './path';
import type { NguTableCell } from './templates';
import type { NguBadgeTone, NguTableCellContext, NguTableColumn } from './types';

/**
 * Turning a row and a column into a drawn cell.
 *
 * Pure and stateless, which is what lets the table keep the cells per row object. The
 * template reads these fields and nothing else: no pipes, no method calls.
 */
export type CellKind =
  | 'text'
  | 'badge'
  | 'boolean'
  | 'avatar'
  | 'image'
  | 'link'
  | 'mailto'
  | 'tel'
  | 'progress'
  | 'template';

/** One shape for every kind: cheaper to read than a union the template narrows. */
export interface RenderCell<T> {
  column: NguTableColumn<T>;
  kind: CellKind;
  numeric: boolean;
  wrap: boolean;
  text: string;
  badge: string;
  truthy: boolean;
  href: string;
  src: string;
  size: string;
  percent: number;
  initials: string;
  template: TemplateRef<NguTableCellContext<T>> | null;
  context: NguTableCellContext<T> | null;
}

/** Everything formatting needs from the config and the app, resolved once per table. */
export interface CellFormat {
  /** Shown for null, undefined and ''. */
  empty: string;
  locale: string;
  currencyCode: string;
  currencyLocale: ((code: string) => string) | null;
  dateFormat: string;
  datetimeFormat: string;
  badgeTones: Readonly<Record<string, NguBadgeTone>>;
  yes: string;
  no: string;
}

export function isNumeric<T>(column: NguTableColumn<T>): boolean {
  return (
    !!column.numeric ||
    column.type === 'number' ||
    column.type === 'currency' ||
    column.type === 'percent'
  );
}

export function buildCells<T>(
  row: T,
  columns: readonly NguTableColumn<T>[],
  templates: readonly NguTableCell<T>[],
  format: CellFormat,
): RenderCell<T>[] {
  return columns.map((column) => buildCell(row, column, templates, format));
}

function buildCell<T>(
  row: T,
  column: NguTableColumn<T>,
  templates: readonly NguTableCell<T>[],
  format: CellFormat,
): RenderCell<T> {
  const value = resolvePath(row, column.field);
  const cell: RenderCell<T> = {
    column,
    kind: 'text',
    numeric: isNumeric(column),
    wrap: !!column.wrap,
    text: cellText(value, column, row, format),
    badge: '',
    truthy: false,
    href: '',
    src: '',
    size: column.imageSize ?? '36px',
    percent: 0,
    initials: '',
    template: null,
    context: null,
  };

  if (column.template) {
    // A template declared but never projected falls back to the plain value.
    const found = templates.find((t) => t.nguTableCell() === column.field);
    if (found) {
      cell.kind = 'template';
      cell.template = found.template;
      cell.context = { $implicit: value, row, column };
    }
    return cell;
  }

  switch (column.type) {
    case 'badge':
      // An empty cell is not a status, and a chip reading "—" claims it is.
      if (present(value)) {
        cell.kind = 'badge';
        const tone = badgeTone(value, column.badgeMap, format.badgeTones);
        cell.badge = `ngu-tbl-badge ngu-tbl-badge--${tone}`;
      }
      break;

    case 'boolean':
      cell.kind = 'boolean';
      cell.truthy = !!value;
      break;

    case 'avatar':
      cell.kind = 'avatar';
      cell.initials = initialsOf(value);
      cell.src = column.avatarSrc ? String(resolvePath(row, column.avatarSrc) ?? '') : '';
      break;

    case 'image':
      cell.kind = 'image';
      cell.src = present(value) ? String(value) : '';
      break;

    case 'email':
      if (present(value)) {
        cell.kind = 'mailto';
        cell.href = `mailto:${value}`;
      }
      break;

    case 'phone':
      if (present(value)) {
        cell.kind = 'tel';
        // Spaces and brackets stop some dialers resolving a `tel:` URI.
        cell.href = `tel:${String(value).replace(/[^\d+]/g, '')}`;
      }
      break;

    case 'link':
      if (present(value)) cell.kind = 'link';
      break;

    case 'progress':
      cell.kind = 'progress';
      cell.percent = progressPercent(value, column);
      break;
  }

  return cell;
}

/**
 * The text of a cell: the column's `formatter` first, then its type. The CSV export uses the
 * same text, so the file says what the screen says.
 */
export function cellText<T>(
  value: any,
  column: NguTableColumn<T>,
  row: T,
  format: CellFormat,
): string {
  if (column.formatter) return column.formatter(value, row);
  if (column.type === 'boolean') return value ? format.yes : format.no;
  if (!present(value)) return format.empty;

  // These throw. One malformed date must not take out the whole table, so a failure falls
  // through to the raw value.
  try {
    switch (column.type) {
      case 'date':
        return formatDate(value, column.format ?? format.dateFormat, format.locale);
      case 'datetime':
        return formatDate(value, column.format ?? format.datetimeFormat, format.locale);
      case 'currency': {
        const code = column.currencyCode ?? format.currencyCode;
        // An amount can be grouped by its currency rather than the reader's locale, such as
        // rupees in lakhs (`1,57,09,450.00`) next to dollars in thousands.
        const locale = format.currencyLocale?.(code) ?? format.locale;
        return formatCurrency(
          Number(value),
          locale,
          getCurrencySymbol(code, 'narrow', locale),
          code,
          column.digitsInfo ?? '1.2-2',
        );
      }
      case 'number':
        return formatNumber(Number(value), format.locale, column.digitsInfo ?? '1.0-2');
      case 'percent':
        return formatPercent(Number(value), format.locale, column.digitsInfo ?? '1.0-2');
      case 'progress':
        return `${progressPercent(value, column)}%`;
    }
  } catch {
    /* falls through to the raw value */
  }

  return Array.isArray(value) ? value.join(', ') : String(value);
}

function progressPercent<T>(value: unknown, column: NguTableColumn<T>): number {
  const max = column.progressMax || 100;
  return Math.max(0, Math.min(100, Math.round(((Number(value) || 0) / max) * 100)));
}

function present(value: unknown): boolean {
  return value !== null && value !== undefined && value !== '';
}
