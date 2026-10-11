import { EMPTY_WINDOW, furthestPages, pageSpan, virtualWindow } from './virtual';

const ROW = 36;
const VIEWPORT = 288; // eight rows
const OVERSCAN = 4;

const at = (scrollTop: number, count: number) =>
  virtualWindow(scrollTop, VIEWPORT, count, ROW, OVERSCAN);

describe('virtualWindow', () => {
  it('draws nothing before the first response', () => {
    expect(at(0, 0)).toEqual(EMPTY_WINDOW);
    expect(at(0, 0).last).toBeLessThan(at(0, 0).first);
  });

  it('sizes the scroller to the whole result set, not to what was fetched', () => {
    // 40,000 rows on the server and one page of 50 in hand: the thumb has to
    // reflect 40,000 or dragging it can never reach the middle.
    expect(at(0, 40_000).spacer).toBe(40_000 * ROW);
  });

  it('starts at the top with overscan below only', () => {
    const win = at(0, 1000);

    expect(win.first).toBe(0);
    expect(win.offset).toBe(0);
    // Eight visible plus overscan either side, and no negative indices.
    expect(win.last).toBe(8 + OVERSCAN * 2);
  });

  it('moves the window and its offset together as it scrolls', () => {
    const win = at(100 * ROW, 1000);

    expect(win.first).toBe(100 - OVERSCAN);
    expect(win.offset).toBe((100 - OVERSCAN) * ROW);
    expect(win.last - win.first).toBe(8 + OVERSCAN * 2);
  });

  it('renders a bounded number of rows however deep the list is', () => {
    const shallow = at(0, 100);
    const deep = at(30_000 * ROW, 40_000);

    expect(deep.last - deep.first).toBe(shallow.last - shallow.first);
  });

  it('clamps the last index to the end of the set', () => {
    const win = at(995 * ROW, 1000);

    expect(win.last).toBe(999);
  });

  it('treats a rubber-banded scrollTop as the top', () => {
    expect(at(-120, 1000)).toEqual(at(0, 1000));
  });

  it('survives an unmeasured panel and a zero row height', () => {
    expect(virtualWindow(0, 0, 1000, ROW, OVERSCAN).last).toBe(OVERSCAN * 2);
    expect(virtualWindow(0, VIEWPORT, 1000, 0, OVERSCAN)).toEqual(EMPTY_WINDOW);
  });
});

describe('pageSpan', () => {
  it('asks for the one page under the window', () => {
    expect(pageSpan(0, 15, 50)).toEqual({ from: 0, to: 0 });
    expect(pageSpan(600, 615, 50)).toEqual({ from: 12, to: 12 });
  });

  it('asks for both when the window straddles a boundary', () => {
    expect(pageSpan(45, 60, 50)).toEqual({ from: 0, to: 1 });
  });

  it('never asks for the pages a jump-scroll skipped over', () => {
    // The whole point of paging off the window: row 30,000 is page 600, and
    // the 600 pages before it are not requested.
    expect(pageSpan(30_000, 30_016, 50)).toEqual({ from: 600, to: 600 });
  });

  it('collapses an empty window onto page 0', () => {
    expect(pageSpan(0, -1, 50)).toEqual({ from: 0, to: 0 });
  });
});

describe('furthestPages', () => {
  it('keeps everything while under the cap', () => {
    expect(furthestPages([0, 1, 2], 2, 12)).toEqual([]);
  });

  it('drops the pages furthest from the one being looked at', () => {
    const held = [0, 1, 2, 3, 20, 21];

    expect(furthestPages(held, 21, 4).sort((a, b) => a - b)).toEqual([0, 1]);
  });

  it('drops exactly as many as the cap requires', () => {
    const held = Array.from({ length: 20 }, (_, i) => i);

    expect(furthestPages(held, 19, 12)).toHaveLength(8);
  });
});
