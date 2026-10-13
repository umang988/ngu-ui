import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  driver,
  FakeServer,
  PANEL_HEIGHT,
  placeField,
  ROW_HEIGHT,
  type Row,
  SIZE,
  TOTAL,
} from '../testing/helpers';
import { NguDropdown } from './dropdown';

@Component({
  selector: 'test-client-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NguDropdown],
  template: `
    <ngu-dropdown
      [options]="options()"
      [(value)]="picked"
      [optionHeight]="rowHeight"
      [panelMaxHeight]="panelHeight"
      [size]="size()"
    />
  `,
})
class ClientHost {
  readonly rowHeight = ROW_HEIGHT;
  readonly panelHeight = PANEL_HEIGHT;
  readonly size = signal<'md' | 'sm'>('md');
  readonly options = signal(
    Array.from({ length: 3 }, (_, i) => ({ value: `v${i}`, label: `Option ${i}` })),
  );
  picked: any = null;
}

@Component({
  selector: 'test-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NguDropdown],
  template: `
    <ngu-dropdown
      [fetchFn]="server.load"
      [(value)]="picked"
      [pageSize]="size"
      [optionHeight]="rowHeight"
      [panelMaxHeight]="panelHeight"
      [multiple]="multiple()"
      optionValue="id"
      optionLabel="name"
    />
  `,
})
class Host {
  readonly server = new FakeServer();
  readonly size = SIZE;
  readonly rowHeight = ROW_HEIGHT;
  readonly panelHeight = PANEL_HEIGHT;
  readonly multiple = signal(false);
  picked: any = null;
}

/** A bare `string[]`, which needs no `optionValue` at all. */
@Component({
  selector: 'test-plain-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NguDropdown],
  template: `<ngu-dropdown [options]="['North', 'South']" [(value)]="region" />`,
})
class PlainHost {
  region: any = null;
}

async function mount() {
  const fixture = TestBed.createComponent(Host);
  await fixture.whenStable();
  return {
    fixture,
    host: fixture.componentInstance,
    server: fixture.componentInstance.server,
    ...driver(fixture),
  };
}

async function mountClient() {
  const fixture = TestBed.createComponent(ClientHost);
  await fixture.whenStable();
  return { fixture, host: fixture.componentInstance, ...driver(fixture) };
}

const forty = () =>
  Array.from({ length: 40 }, (_, i) => ({ value: `v${i}`, label: `Option ${i}` }));

describe('NguDropdown placement', () => {
  it('drops below the field when there is room', async () => {
    const dd = await mount();
    placeField(dd.el, 100);
    await dd.open();

    const panel = dd.panel()!;
    expect(panel.classList).not.toContain('ngu-dd-panel--above');
    expect(panel.style.top).toBe('140px');
    expect(panel.style.bottom).toBe('');
  });

  it('flips above the field, anchored by its bottom edge', async () => {
    const dd = await mount();
    placeField(dd.el, window.innerHeight - 56);
    await dd.open();

    const panel = dd.panel()!;
    expect(panel.classList).toContain('ngu-dd-panel--above');
    expect(panel.style.top).toBe('');
    expect(panel.style.bottom).toBe('60px');
  });

  it('never grows a flipped panel past the top of the viewport', async () => {
    const dd = await mount();
    Object.defineProperty(window, 'innerHeight', { value: 400, configurable: true });
    try {
      placeField(dd.el, 200);
      await dd.open();

      const panel = dd.panel()!;
      expect(panel.classList).toContain('ngu-dd-panel--above');
      // 200 (top) - 4 (gap) - 8 (viewport margin), not the 288 maximum.
      expect(panel.style.maxHeight).toBe('188px');
    } finally {
      Object.defineProperty(window, 'innerHeight', { value: 768, configurable: true });
    }
  });

  it('aligns right edges on a right-to-left page', async () => {
    const fixture = TestBed.createComponent(NguDropdown);
    fixture.componentRef.setInput('options', ['North', 'South']);
    fixture.componentRef.setInput('panelMinWidth', 300);
    await fixture.whenStable();
    const dd = driver(fixture);

    // The field spans 100–340; a 300px panel ends at its right edge, not its left.
    placeField(dd.el, 100);
    dd.el.querySelector<HTMLElement>('.ngu-dd-field')!.style.direction = 'rtl';
    await dd.open();

    expect(dd.panel()!.style.left).toBe('40px');
    expect(dd.panel()!.style.width).toBe('300px');
  });
});

describe('NguDropdown, client mode', () => {
  it('needs no fetchFn, and hides the search box over a short list', async () => {
    const dd = await mountClient();
    await dd.open();

    expect(dd.search()).toBeNull();
    expect(dd.labels()).toEqual(['Option 0', 'Option 1', 'Option 2']);
  });

  it('shows the search box once the list is long enough to need one', async () => {
    const dd = await mountClient();
    dd.host.options.set(forty());
    await dd.fixture.whenStable();
    await dd.open();

    expect(dd.search()).not.toBeNull();
    expect(dd.spacer()!.style.height).toBe(`${40 * ROW_HEIGHT}px`);
    expect(dd.options().length).toBeLessThan(40);
  });

  it('filters in the browser and resizes the scroller', async () => {
    const dd = await mountClient();
    dd.host.options.set(forty());
    await dd.fixture.whenStable();
    await dd.open();
    await dd.type('Option 3');

    // 3, and 30 through 39.
    expect(dd.spacer()!.style.height).toBe(`${11 * ROW_HEIGHT}px`);
    expect(dd.options()[0].textContent).toContain('Option 3');
  });

  it('ignores accents and case when filtering', async () => {
    const dd = await mountClient();
    dd.host.options.set([
      ...forty(),
      { value: 'zh', label: 'Zürich' },
      { value: 'sp', label: 'São Paulo' },
    ]);
    await dd.fixture.whenStable();
    await dd.open();
    await dd.type('zurich');

    expect(dd.labels()).toEqual(['Zürich']);
  });

  it('takes the small control height on request', async () => {
    const dd = await mountClient();
    expect(dd.root().classList.contains('ngu-dropdown--sm')).toBe(false);

    dd.host.size.set('sm');
    await dd.fixture.whenStable();
    expect(dd.root().classList.contains('ngu-dropdown--sm')).toBe(true);
  });

  it('keeps naming the selection while a search term hides it', async () => {
    const dd = await mountClient();
    dd.host.options.set(forty());
    dd.host.picked = 'v1';
    dd.fixture.changeDetectorRef.markForCheck();
    await dd.fixture.whenStable();
    await dd.open();
    await dd.type('Option 22');

    expect(dd.trigger().textContent).toContain('Option 1');
  });

  it('resolves a plain value list with no configured paths', async () => {
    const fixture = TestBed.createComponent(PlainHost);
    await fixture.whenStable();
    const dd = driver(fixture);
    await dd.open();

    expect(dd.labels()).toEqual(['North', 'South']);

    dd.options()[1].click();
    await fixture.whenStable();
    expect(fixture.componentInstance.region).toBe('South');
  });
});

describe('NguDropdown, server mode', () => {
  it('asks for nothing until it is opened', async () => {
    const dd = await mount();

    expect(dd.server.queries).toHaveLength(0);
    expect(dd.panel()).toBeNull();
    expect(dd.trigger().textContent).toContain('Select…');
  });

  it('opens on the first page alone and renders a window, not the result set', async () => {
    const dd = await mount();
    await dd.open();

    expect(dd.server.pagesAsked).toEqual([0]);

    const drawn = dd.options().length;
    expect(drawn).toBeGreaterThan(0);
    expect(drawn).toBeLessThan(SIZE);
    expect(dd.options()[0].textContent).toContain('Row 0');
  });

  it('sizes the scroller to the server total, not to what it has fetched', async () => {
    const dd = await mount();
    await dd.open();

    expect(dd.spacer()!.style.height).toBe(`${TOTAL * ROW_HEIGHT}px`);
  });

  it('tells assistive tech each row’s place in the whole set', async () => {
    const dd = await mount();
    await dd.open();
    await dd.scrollTo(6000 * ROW_HEIGHT);

    const first = dd.options()[0];
    expect(first.getAttribute('aria-setsize')).toBe(String(TOTAL));
    expect(first.getAttribute('aria-posinset')).toBe('5997');
  });

  it('fetches only the pages the window touches, never the ones it skipped', async () => {
    const dd = await mount();
    await dd.open();
    await dd.scrollTo(6000 * ROW_HEIGHT);

    // The window starts at 5996 (row 6000 less the overscan), so it straddles the page
    // boundary at 6000. The 118 pages in between are never asked for.
    expect(dd.server.pagesAsked).toEqual([0, 119, 120]);
    expect(dd.options()[0].textContent).toContain('Row 5996');
  });

  it('never asks for more than the window plus its overscan', async () => {
    const dd = await mount();
    await dd.open();

    for (let i = 1; i <= 20; i++) await dd.scrollTo(i * 400 * ROW_HEIGHT);

    expect(dd.server.queries.length).toBeLessThanOrEqual(1 + 20 * 2);
  });

  it('draws a full-height placeholder for a page still in flight', async () => {
    const dd = await mount();
    await dd.open();

    dd.server.hold = true;
    await dd.scrollTo(500 * ROW_HEIGHT);

    expect(dd.server.pagesAsked).toContain(9);
    expect(dd.options()).toHaveLength(0);
    expect(dd.loading().length).toBeGreaterThan(0);
    expect(dd.loading()[0].style.height).toBe(`${ROW_HEIGHT}px`);
    expect(dd.spacer()!.style.height).toBe(`${TOTAL * ROW_HEIGHT}px`);
  });

  /*
   * A request that never answers leaves the row count and scroll position unchanged, so
   * without the reset counter the fetching effect would not re-run for a new term.
   */
  it('asks for a new term typed while the first page is still in flight', async () => {
    const dd = await mount();
    dd.server.hold = true;
    await dd.open();

    expect(dd.server.queries).toHaveLength(1);

    await dd.type('abc');

    expect(dd.server.queries).toHaveLength(2);
    expect(dd.server.queries.at(-1)!.search).toBe('abc');
  });

  it('answers a term typed after an unanswered one, and draws it', async () => {
    const dd = await mount();
    dd.server.hold = true;
    await dd.open();
    await dd.type('abc');

    dd.server.hold = false;
    await dd.type('abcd');

    expect(dd.server.queries.at(-1)!.search).toBe('abcd');
    expect(dd.options().length).toBeGreaterThan(0);
  });

  it('reloads when the notice on a failed first load is retried', async () => {
    const dd = await mount();
    dd.server.fail = true;
    await dd.open();

    expect(dd.notice()).not.toBeNull();
    const asked = dd.server.queries.length;

    dd.server.fail = false;
    dd.retry()!.click();
    await dd.fixture.whenStable();

    expect(dd.server.queries.length).toBeGreaterThan(asked);
    expect(dd.options().length).toBeGreaterThan(0);
    expect(dd.notice()).toBeNull();
  });

  it('keeps memory bounded as the whole list is scrolled past', async () => {
    const dd = await mount();
    await dd.open();

    for (let page = 0; page < 60; page++) await dd.scrollTo(page * SIZE * ROW_HEIGHT);
    const asked = dd.server.queries.length;

    // Page 0 was evicted long ago, so going back asks for it again.
    await dd.scrollTo(0);
    expect(dd.server.queries.length).toBeGreaterThan(asked);
    expect(dd.options()[0].textContent).toContain('Row 0');
  });

  it('re-asks from page 0 when the search changes, and resizes the list', async () => {
    const dd = await mount();
    await dd.open();
    await dd.scrollTo(6000 * ROW_HEIGHT);
    await dd.type('row');

    const last = dd.server.queries.at(-1)!;
    expect(last.page).toBe(0);
    expect(last.search).toBe('row');
    expect(dd.spacer()!.style.height).toBe(`${(TOTAL / 10) * ROW_HEIGHT}px`);
  });

  it('opens at the top again after being closed deep in the list', async () => {
    const dd = await mount();
    await dd.open();
    await dd.scrollTo(6000 * ROW_HEIGHT);

    await dd.open(); // closes
    await dd.open();

    // The new list element starts at scrollTop 0, so the window must too.
    expect(dd.options()[0].textContent).toContain('Row 0');
  });

  it('picks a row, closes, and shows its label rather than its key', async () => {
    const dd = await mount();
    await dd.open();

    dd.options()[3].click();
    await dd.fixture.whenStable();

    expect(dd.host.picked).toBe(3);
    expect(dd.panel()).toBeNull();
    expect(dd.trigger().textContent).toContain('Row 3');
  });

  it('keeps the panel open and toggles keys in multiple mode', async () => {
    const dd = await mount();
    dd.host.multiple.set(true);
    await dd.fixture.whenStable();
    await dd.open();

    dd.options()[1].click();
    await dd.fixture.whenStable();
    dd.options()[2].click();
    await dd.fixture.whenStable();

    expect(dd.host.picked).toEqual([1, 2]);
    expect(dd.panel()).not.toBeNull();
    expect(dd.trigger().textContent).toContain('Row 1');

    dd.options()[1].click();
    await dd.fixture.whenStable();
    expect(dd.host.picked).toEqual([2]);
  });

  it('keeps focus in the search box when an option is pressed', async () => {
    const dd = await mount();
    dd.host.multiple.set(true);
    await dd.fixture.whenStable();
    await dd.open();

    const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    dd.options()[1].dispatchEvent(press);

    expect(press.defaultPrevented).toBe(true);
  });

  it('names a value written in after its page has loaded', async () => {
    const server = new FakeServer();
    const fixture = TestBed.createComponent(NguDropdown<Row>);
    fixture.componentRef.setInput('fetchFn', server.load);
    fixture.componentRef.setInput('optionValue', 'id');
    fixture.componentRef.setInput('optionLabel', 'name');
    await fixture.whenStable();
    const dd = driver(fixture);
    await dd.open();
    await dd.open(); // closes, keeping page 0

    fixture.componentRef.setInput('value', 7);
    await fixture.whenStable();

    expect(dd.trigger().textContent).toContain('Row 7');
    expect(server.queries).toHaveLength(1);
  });

  it('does not open when read-only', async () => {
    const fixture = TestBed.createComponent(NguDropdown);
    fixture.componentRef.setInput('options', ['North', 'South']);
    fixture.componentRef.setInput('readonly', true);
    await fixture.whenStable();
    const dd = driver(fixture);

    await dd.open();

    expect(dd.panel()).toBeNull();
    expect(dd.trigger().getAttribute('aria-readonly')).toBe('true');
  });

  it('clears the selection from the field', async () => {
    const dd = await mount();
    await dd.open();
    dd.options()[0].click();
    await dd.fixture.whenStable();

    dd.clear()!.click();
    await dd.fixture.whenStable();

    expect(dd.host.picked).toBeNull();
    expect(dd.trigger().textContent).toContain('Select…');
  });

  it('closes on a click outside, even one whose propagation is stopped', async () => {
    const dd = await mount();
    const outside = document.createElement('div');
    outside.addEventListener('click', (event) => event.stopPropagation());
    document.body.append(outside);
    try {
      await dd.open();
      outside.click();
      await dd.fixture.whenStable();

      expect(dd.panel()).toBeNull();
    } finally {
      outside.remove();
    }
  });
});

describe('NguDropdown labels', () => {
  interface Assignment {
    id: number;
    employee: { name: string };
  }

  interface Sku {
    skuCode: string;
    description: string;
  }

  const skus: Sku[] = Array.from({ length: 12 }, (_, i) => ({
    skuCode: `SKU-${String(i + 1).padStart(4, '0')}`,
    description: i === 7 ? 'Steel bolt M8' : `Part ${i + 1}`,
  }));

  it('reads a nested path such as employee.name', async () => {
    const fixture = TestBed.createComponent(NguDropdown<Assignment>);
    fixture.componentRef.setInput('options', [
      { id: 1, employee: { name: 'Asha Rao' } },
      { id: 2, employee: { name: 'Vikram Shah' } },
    ]);
    fixture.componentRef.setInput('optionValue', 'id');
    fixture.componentRef.setInput('optionLabel', 'employee.name');
    fixture.componentRef.setInput('value', 2);
    await fixture.whenStable();
    const dd = driver(fixture);

    expect(dd.trigger().textContent).toContain('Vikram Shah');
    await dd.open();
    expect(dd.labels()).toEqual(['Asha Rao', 'Vikram Shah']);
  });

  it('builds a label from several fields with a function, and searches it', async () => {
    const fixture = TestBed.createComponent(NguDropdown<Sku>);
    fixture.componentRef.setInput('options', skus);
    fixture.componentRef.setInput('optionValue', 'skuCode');
    fixture.componentRef.setInput('optionLabel', (s: Sku) => `${s.skuCode} - ${s.description}`);
    fixture.componentRef.setInput('value', 'SKU-0003');
    await fixture.whenStable();
    const dd = driver(fixture);

    expect(dd.trigger().textContent).toContain('SKU-0003 - Part 3');

    // The description is part of the label, so a client search finds it.
    await dd.open();
    await dd.type('bolt');
    expect(dd.labels()).toEqual(['SKU-0008 - Steel bolt M8']);
  });

  it('uses the function label for chips too', async () => {
    const fixture = TestBed.createComponent(NguDropdown<Sku>);
    fixture.componentRef.setInput('options', skus);
    fixture.componentRef.setInput('multiple', true);
    fixture.componentRef.setInput('optionValue', 'skuCode');
    fixture.componentRef.setInput('optionLabel', (s: Sku) => `${s.skuCode} - ${s.description}`);
    fixture.componentRef.setInput('value', ['SKU-0001', 'SKU-0008']);
    await fixture.whenStable();

    const chips = [...fixture.nativeElement.querySelectorAll('.ngu-dd-chip')].map(
      (c: HTMLElement) => c.textContent!.trim(),
    );
    expect(chips).toEqual(['SKU-0001 - Part 1', 'SKU-0008 - Steel bolt M8']);
  });
});

describe('NguDropdown inputs', () => {
  @Component({
    selector: 'test-state-host',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NguDropdown],
    template: `
      <ngu-dropdown
        [options]="options"
        [(value)]="picked"
        [optionValue]="valuePath()"
        [disabled]="disabled()"
        [readonly]="locked()"
      />
    `,
  })
  class StateHost {
    readonly options = [
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta' },
    ];
    readonly valuePath = signal<string | undefined>(undefined);
    readonly disabled = signal(false);
    readonly locked = signal(false);
    picked: any = 'b';
  }

  it('reads undefined optionValue as the default path', async () => {
    const fixture = TestBed.createComponent(StateHost);
    await fixture.whenStable();
    expect(driver(fixture).trigger().textContent).toContain('Beta');
  });

  it('closes the open panel when it becomes disabled or read-only', async () => {
    const fixture = TestBed.createComponent(StateHost);
    await fixture.whenStable();
    const d = driver(fixture);
    await d.open();
    expect(d.panel()).not.toBeNull();
    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();
    expect(d.panel()).toBeNull();

    fixture.componentInstance.disabled.set(false);
    await fixture.whenStable();
    await d.open();
    expect(d.panel()).not.toBeNull();
    fixture.componentInstance.locked.set(true);
    await fixture.whenStable();
    expect(d.panel()).toBeNull();
  });
});

