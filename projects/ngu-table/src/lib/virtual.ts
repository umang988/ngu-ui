/**
 * The arithmetic behind virtual scrolling and the sparse page buffer, the same as
 * ngu-dropdown's. Pure functions, so the component drives them from computed signals and the
 * specs need no layout.
 */

/** Which rows to draw and how much empty space stands in for the rest. */
export interface VirtualWindow {
  /** First row index to draw. */
  first: number;
  /** Last row index to draw, inclusive. `-1` when there is nothing to draw. */
  last: number;
  /** Height of the space above the drawn rows, in px. */
  before: number;
  /** Height of the space below the drawn rows, in px. */
  after: number;
}

/** An inclusive span of page indices. */
export interface PageSpan {
  from: number;
  to: number;
}

export const EMPTY_WINDOW: VirtualWindow = { first: 0, last: -1, before: 0, after: 0 };

/**
 * The rows for a scroll position. `overscan` rows are drawn on each side so a fast scroll does
 * not show blank space. The two spaces add up to the whole result set's height, so the
 * scrollbar is sized to every row from the start and dragging it to row 30,000 draws that row.
 */
export function virtualWindow(
  scrollTop: number,
  viewportHeight: number,
  count: number,
  rowHeight: number,
  overscan: number,
): VirtualWindow {
  if (count <= 0 || rowHeight <= 0) return EMPTY_WINDOW;

  // A negative scrollTop is iOS rubber-banding, not a request for row -3.
  const top = Math.max(0, scrollTop);
  const span = Math.ceil(Math.max(0, viewportHeight) / rowHeight) + overscan * 2;
  // Past the end (a scroll position from before the rows shrank) still draws the last rows.
  const first = Math.max(0, Math.min(Math.floor(top / rowHeight) - overscan, count - span));
  const last = Math.min(count - 1, first + span);

  return {
    first,
    last,
    before: first * rowHeight,
    after: (count - 1 - last) * rowHeight,
  };
}

/** Whether two windows draw the same rows, so a scroll inside one row draws nothing new. */
export function sameWindow(a: VirtualWindow, b: VirtualWindow): boolean {
  return a.first === b.first && a.last === b.last && a.before === b.before && a.after === b.after;
}

/** The pages a window touches: usually one, two when it straddles a boundary. */
export function pageSpan(first: number, last: number, size: number): PageSpan {
  const from = Math.max(0, Math.floor(Math.max(0, first) / size));

  return { from, to: Math.max(from, Math.floor(Math.max(0, last, first) / size)) };
}

/**
 * Which held pages to drop to get back to `max`, furthest from `around` (the page just read)
 * first. Returned rather than deleted so the caller owns the map.
 */
export function furthestPages(held: Iterable<number>, around: number, max: number): number[] {
  const keys = [...held];
  if (keys.length <= max) return [];

  return keys
    .sort((a, b) => Math.abs(b - around) - Math.abs(a - around))
    .slice(0, keys.length - max);
}
