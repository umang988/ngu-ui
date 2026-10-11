/**
 * The arithmetic behind the virtual scroller and the sparse page buffer. Pure functions, so
 * the component drives them from computed signals and the specs need no DOM.
 */

/** Which indices to draw, where to put them, and how tall the scroller is. */
export interface VirtualWindow {
  /** First index to render. */
  first: number;
  /** Last index to render, inclusive. `-1` when there is nothing to draw. */
  last: number;
  /** How far down the spacer the window sits, in px. */
  offset: number;
  /** The scrollable height of the whole result set, not of what has been fetched. */
  spacer: number;
}

/** An inclusive span of page indices. */
export interface PageSpan {
  from: number;
  to: number;
}

export const EMPTY_WINDOW: VirtualWindow = { first: 0, last: -1, offset: 0, spacer: 0 };

/**
 * The window for a scroll position. `overscan` rows are drawn on each side so a fast scroll
 * does not show empty panel. `spacer` is `count × rowHeight`, sized to the server's total from
 * the first response, so dragging the thumb to row 30,000 asks for one page, not 600.
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
  const first = Math.max(0, Math.floor(top / rowHeight) - overscan);
  const span = Math.ceil(Math.max(0, viewportHeight) / rowHeight) + overscan * 2;

  return {
    first,
    last: Math.min(count - 1, first + span),
    offset: first * rowHeight,
    spacer: count * rowHeight,
  };
}

/** The pages a window touches: usually one, two when it straddles a boundary. */
export function pageSpan(first: number, last: number, size: number): PageSpan {
  const from = Math.max(0, Math.floor(Math.max(0, first) / size));

  return { from, to: Math.max(from, Math.floor(Math.max(0, last, first) / size)) };
}

/**
 * Which cached pages to drop to get back to `max`, furthest from `around` (the page just
 * read) first. Returned rather than deleted so the caller owns the map.
 */
export function furthestPages(held: Iterable<number>, around: number, max: number): number[] {
  const keys = [...held];
  if (keys.length <= max) return [];

  return keys
    .sort((a, b) => Math.abs(b - around) - Math.abs(a - around))
    .slice(0, keys.length - max);
}
