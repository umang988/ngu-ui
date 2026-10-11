import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { driver, FakeServer, PANEL_HEIGHT, ROW_HEIGHT, showPopovers } from '../testing/helpers';
import { NguDropdown } from './dropdown';

const FRUIT = ['Apple', 'Banana', 'Cherry', 'Blueberry', 'Date'];

/** Five options: under the search threshold, so focus stays on the trigger. */
@Component({
  selector: 'test-short-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NguDropdown],
  template: `
    <div (keydown)="parentKeys.push($event.key)">
      <ngu-dropdown
        [options]="fruit"
        [(value)]="picked"
        [optionHeight]="36"
        [panelMaxHeight]="288"
      />
    </div>
  `,
})
class ShortHost {
  readonly fruit = FRUIT;
  readonly parentKeys: string[] = [];
  picked: string | null = null;
}

@Component({
  selector: 'test-server-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NguDropdown],
  template: `
    <ngu-dropdown
      [fetchFn]="server.load"
      [(value)]="picked"
      [optionHeight]="rowHeight"
      [panelMaxHeight]="panelHeight"
      optionValue="id"
      optionLabel="name"
    />
  `,
})
class ServerHost {
  readonly server = new FakeServer();
  readonly rowHeight = ROW_HEIGHT;
  readonly panelHeight = PANEL_HEIGHT;
  readonly picked = signal<number | null>(null);
}

async function mountShort(picked: string | null = null) {
  const fixture = TestBed.createComponent(ShortHost);
  fixture.componentInstance.picked = picked;
  await fixture.whenStable();
  const dd = driver(fixture);
  dd.trigger().focus();
  return { fixture, host: fixture.componentInstance, ...dd };
}

const activeLabel = (el: HTMLElement) =>
  el.querySelector('.ngu-dd-option--active')?.textContent?.trim() ?? null;

describe('NguDropdown keyboard, no search box', () => {
  it('opens with ArrowDown and moves the active option from the trigger', async () => {
    const dd = await mountShort();

    await dd.key(dd.trigger(), 'ArrowDown');
    expect(dd.panel()).not.toBeNull();
    expect(dd.search()).toBeNull();
    expect(activeLabel(dd.el)).toBe('Apple');

    await dd.key(dd.trigger(), 'ArrowDown');
    expect(activeLabel(dd.el)).toBe('Banana');

    // Focus stays on the trigger, so it names the active option.
    const active = dd.el.querySelector('.ngu-dd-option--active')!;
    expect(dd.trigger().getAttribute('aria-activedescendant')).toBe(active.id);
  });

  it('picks with Enter, closes, and keeps focus on the trigger', async () => {
    const dd = await mountShort();

    await dd.key(dd.trigger(), 'ArrowDown');
    await dd.key(dd.trigger(), 'ArrowDown');
    await dd.key(dd.trigger(), 'Enter');

    expect(dd.host.picked).toBe('Banana');
    expect(dd.panel()).toBeNull();
    expect(document.activeElement).toBe(dd.trigger());
  });

  it('opens and picks with Space, and stops the button clicking on keyup', async () => {
    const dd = await mountShort();

    const down = await dd.key(dd.trigger(), ' ');
    expect(down.defaultPrevented).toBe(true);
    expect(dd.panel()).not.toBeNull();

    const up = new KeyboardEvent('keyup', { key: ' ', bubbles: true, cancelable: true });
    dd.trigger().dispatchEvent(up);
    expect(up.defaultPrevented).toBe(true);

    await dd.key(dd.trigger(), ' ');
    expect(dd.host.picked).toBe('Apple');
  });

  it('opens at the current selection', async () => {
    const dd = await mountShort('Cherry');

    await dd.key(dd.trigger(), 'ArrowDown');

    expect(activeLabel(dd.el)).toBe('Cherry');
  });

  it('jumps to the ends with Home and End', async () => {
    const dd = await mountShort();
    await dd.key(dd.trigger(), 'ArrowDown');

    await dd.key(dd.trigger(), 'End');
    expect(activeLabel(dd.el)).toBe('Date');

    await dd.key(dd.trigger(), 'Home');
    expect(activeLabel(dd.el)).toBe('Apple');
  });

  it('finds an option by typing its first letters', async () => {
    const dd = await mountShort();
    await dd.key(dd.trigger(), 'ArrowDown');

    await dd.key(dd.trigger(), 'b');
    expect(activeLabel(dd.el)).toBe('Banana');

    // The same letter again cycles through the matches.
    await dd.key(dd.trigger(), 'b');
    expect(activeLabel(dd.el)).toBe('Blueberry');

    await new Promise((done) => setTimeout(done, 600));
    await dd.key(dd.trigger(), 'd');
    expect(activeLabel(dd.el)).toBe('Date');
  });

  it('closes this list only on Escape, not the dialog or panel around it', async () => {
    const dd = await mountShort();
    await dd.key(dd.trigger(), 'ArrowDown');
    dd.host.parentKeys.length = 0;

    const escape = await dd.key(dd.trigger(), 'Escape');

    expect(dd.panel()).toBeNull();
    expect(escape.defaultPrevented).toBe(true);
    expect(dd.host.parentKeys).toEqual([]);
    expect(document.activeElement).toBe(dd.trigger());
  });

  it('closes on Tab and marks nothing picked', async () => {
    const dd = await mountShort();
    await dd.key(dd.trigger(), 'ArrowDown');

    await dd.key(dd.trigger(), 'Tab');

    expect(dd.panel()).toBeNull();
    expect(dd.host.picked).toBeNull();
  });
});

describe('NguDropdown keyboard, with a search box', () => {
  let restore: () => void;
  beforeEach(() => (restore = showPopovers()));
  afterEach(() => restore());

  async function mountServer() {
    const fixture = TestBed.createComponent(ServerHost);
    await fixture.whenStable();
    const dd = driver(fixture);
    dd.trigger().focus();
    await dd.key(dd.trigger(), 'Enter');
    return { fixture, host: fixture.componentInstance, ...dd };
  }

  it('moves focus into the search box, which names the active option', async () => {
    const dd = await mountServer();
    const search = dd.search()!;

    expect(document.activeElement).toBe(search);

    await dd.key(search, 'ArrowDown');
    await dd.key(search, 'ArrowDown');

    const active = dd.el.querySelector('.ngu-dd-option--active')!;
    expect(active.textContent).toContain('Row 1');
    expect(search.getAttribute('aria-activedescendant')).toBe(active.id);
    expect(dd.trigger().hasAttribute('aria-activedescendant')).toBe(false);
  });

  it('picks with Enter and leaves Space and Home to the text box', async () => {
    const dd = await mountServer();
    const search = dd.search()!;

    await dd.key(search, 'ArrowDown');
    expect((await dd.key(search, ' ')).defaultPrevented).toBe(false);
    expect((await dd.key(search, 'Home')).defaultPrevented).toBe(false);

    await dd.key(search, 'Enter');
    expect(dd.host.picked()).toBe(0);
  });

  it('moves a screenful with PageDown', async () => {
    const dd = await mountServer();
    const search = dd.search()!;

    await dd.key(search, 'ArrowDown');
    await dd.key(search, 'PageDown');

    // 288 / 36 = 8 rows visible; a page moves one less, so the last row stays in view.
    expect(dd.el.querySelector('.ngu-dd-option--active')!.textContent).toContain('Row 7');
  });
});
