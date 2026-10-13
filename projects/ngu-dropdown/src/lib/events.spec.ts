import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { driver, showPopovers, type Row } from '../testing/helpers';
import { NguDropdown } from './dropdown';

const ROWS: Row[] = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, name: `Row ${i + 1}` }));

/** Twelve options, so the search box shows and focus moves into the panel. */
@Component({
  selector: 'test-events-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NguDropdown],
  template: `
    <button type="button" class="outside">Outside</button>
    <ngu-dropdown
      [options]="rows()"
      optionValue="id"
      optionLabel="name"
      [multiple]="multiple()"
      [(value)]="value"
      (selectionChange)="log('selectionChange', $event)"
      (added)="log('added', $event)"
      (removed)="log('removed', $event)"
      (cleared)="log('cleared')"
      (focused)="log('focused')"
      (blurred)="log('blurred')"
      (opened)="log('opened')"
      (closed)="log('closed')"
      (keydown)="log('keydown', $any($event).key)"
      (click)="log('click')"
    />
  `,
})
class EventsHost {
  readonly rows = signal(ROWS);
  readonly multiple = signal(false);
  readonly value = signal<unknown>(null);
  readonly events: unknown[][] = [];

  log(name: string, payload?: unknown): void {
    this.events.push(payload === undefined ? [name] : [name, payload]);
  }
}

describe('NguDropdown events', () => {
  let restore: () => void;
  beforeEach(() => (restore = showPopovers()));
  afterEach(() => restore());

  async function mount(setup: (host: EventsHost) => void = () => undefined) {
    const fixture = TestBed.createComponent(EventsHost);
    setup(fixture.componentInstance);
    await fixture.whenStable();
    const host = fixture.componentInstance;
    return {
      fixture,
      host,
      ...driver(fixture),
      /** The events logged so far with one of these names, in order. */
      only: (...names: string[]) => host.events.filter(([name]) => names.includes(name as string)),
      outside: () => fixture.nativeElement.querySelector('.outside') as HTMLButtonElement,
    };
  }

  describe('focused and blurred', () => {
    it('fire once for the whole control, not for each move between its parts', async () => {
      const dd = await mount();

      dd.trigger().focus();
      await dd.open();
      expect(document.activeElement).toBe(dd.search());

      // Escape puts focus back on the trigger: another move inside.
      await dd.key(dd.search()!, 'Escape');
      expect(document.activeElement).toBe(dd.trigger());

      dd.outside().focus();
      await dd.fixture.whenStable();

      expect(dd.only('focused', 'blurred')).toEqual([['focused'], ['blurred']]);
    });

    it('emit the FocusEvent, whose relatedTarget says where focus came from or went', async () => {
      const dd = await mount();
      const events: FocusEvent[] = [];
      const component = dd.fixture.debugElement.query(By.directive(NguDropdown))
        .componentInstance as NguDropdown;
      component.focused.subscribe((event) => events.push(event));
      component.blurred.subscribe((event) => events.push(event));

      dd.outside().focus();
      dd.trigger().focus();
      dd.outside().focus();

      expect(events.map((e) => [e.type, e.relatedTarget])).toEqual([
        ['focusin', dd.outside()],
        ['focusout', dd.outside()],
      ]);
    });

    it('keep focus in the search box when the footer is clicked', async () => {
      const dd = await mount();
      await dd.open();

      const footer = dd.el.querySelector<HTMLElement>('.ngu-dd-foot')!;
      const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
      footer.dispatchEvent(down);

      // A mousedown that is not prevented would move focus to the page and fire blurred.
      expect(down.defaultPrevented).toBe(true);

      const inBox = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
      dd.search()!.dispatchEvent(inBox);
      expect(inBox.defaultPrevented).toBe(false);
    });

    it('keep focus inside when the clear button or the open field is pressed', async () => {
      const dd = await mount((host) => host.value.set(3));
      const press = (el: HTMLElement) => {
        const down = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
        el.dispatchEvent(down);
        return down.defaultPrevented;
      };

      expect(press(dd.clear()!)).toBe(true);
      // Closed, the field takes focus the usual way.
      expect(press(dd.trigger())).toBe(false);

      await dd.open();
      expect(press(dd.trigger())).toBe(true);
    });

    it('focus the field on click, which Safari and jsdom do not do for a button', async () => {
      const dd = await mount((host) => host.rows.set(ROWS.slice(0, 5)));

      // Five options: no search box, so the keys go to the field itself.
      await dd.open();
      expect(dd.search()).toBeNull();
      expect(document.activeElement).toBe(dd.trigger());

      await dd.open();
      expect(dd.panel()).toBeNull();
      expect(document.activeElement).toBe(dd.trigger());
      expect(dd.only('focused', 'blurred')).toEqual([['focused']]);
    });
  });

  describe('added, removed and cleared', () => {
    it('name the one row that joined or left a multiple selection', async () => {
      const dd = await mount((host) => host.multiple.set(true));
      await dd.open();

      dd.options()[1].click();
      await dd.fixture.whenStable();
      dd.options()[1].click();
      await dd.fixture.whenStable();

      expect(dd.only('added', 'removed')).toEqual([
        ['added', ROWS[1]],
        ['removed', ROWS[1]],
      ]);
    });

    it('replace the old row with the new one in single mode', async () => {
      const dd = await mount((host) => host.value.set(3));
      await dd.open();

      dd.options()[4].click();
      await dd.fixture.whenStable();

      expect(dd.only('selectionChange', 'removed', 'added')).toEqual([
        ['selectionChange', ROWS[4]],
        ['removed', ROWS[2]],
        ['added', ROWS[4]],
      ]);
    });

    it('report a clear as each removed row, then cleared', async () => {
      const dd = await mount((host) => {
        host.multiple.set(true);
        host.value.set([1, 2]);
      });

      dd.clear()!.click();
      await dd.fixture.whenStable();

      expect(dd.only('selectionChange', 'removed', 'cleared')).toEqual([
        ['selectionChange', []],
        ['removed', ROWS[0]],
        ['removed', ROWS[1]],
        ['cleared'],
      ]);
      expect(dd.host.value()).toEqual([]);
    });

    it('stay quiet when the value is written in code or by a form', async () => {
      const dd = await mount((host) => host.multiple.set(true));

      dd.host.value.set([1, 2]);
      await dd.fixture.whenStable();
      dd.host.value.set([2]);
      await dd.fixture.whenStable();

      expect(dd.only('selectionChange', 'added', 'removed', 'cleared')).toEqual([]);
    });
  });

  it('includes rows chosen before the user arrived in selectionChange', async () => {
    const dd = await mount((host) => {
      host.multiple.set(true);
      host.value.set([1, 2]);
    });
    await dd.open();

    dd.options()[2].click();
    await dd.fixture.whenStable();

    expect(dd.only('selectionChange')).toEqual([['selectionChange', [ROWS[0], ROWS[1], ROWS[2]]]]);
  });

  describe('DOM events on the tag', () => {
    it('receive keys and clicks from inside the panel, which stays in the tag', async () => {
      const dd = await mount();
      await dd.open();

      await dd.key(dd.search()!, 'ArrowDown');
      dd.options()[0].click();
      await dd.fixture.whenStable();

      expect(dd.only('keydown', 'click')).toEqual([['click'], ['keydown', 'ArrowDown'], ['click']]);
    });

    it('do not receive Escape, which closes only the dropdown', async () => {
      const dd = await mount();
      await dd.open();

      await dd.key(dd.search()!, 'Escape');

      expect(dd.only('keydown', 'closed')).toEqual([['closed']]);
    });
  });
});
