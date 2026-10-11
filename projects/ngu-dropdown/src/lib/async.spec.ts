import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, type NgControl } from '@angular/forms';
import { of } from 'rxjs';
import { driver, FakeServer, page, type Row } from '../testing/helpers';
import { provideNguDropdownConfig, type NguDropdownRowMemory } from './config';
import { NguDropdown } from './dropdown';
import type { NguDropdownFetchContext, NguDropdownPage, NguDropdownQuery } from './types';

const settle = () => new Promise((done) => setTimeout(done));

@Component({
  selector: 'test-async-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NguDropdown],
  template: `
    <ngu-dropdown
      [fetchFn]="fetch"
      [lookupFn]="lookup"
      [(value)]="picked"
      optionValue="id"
      optionLabel="name"
      (loadError)="errors.push($event)"
    />
  `,
})
class AsyncHost {
  readonly server = new FakeServer();
  readonly looked: unknown[][] = [];
  readonly errors: unknown[] = [];
  readonly picked = signal<number | number[] | null>(null);

  /** A Promise, as `fetch()` would give. */
  readonly fetch = (query: NguDropdownQuery, context: NguDropdownFetchContext) => {
    this.server.queries.push(query);
    this.server.signals.push(context.signal);
    return Promise.resolve(page(query));
  };

  readonly lookup = (keys: readonly unknown[]) => {
    this.looked.push([...keys]);
    return of(keys.map((id) => ({ id: id as number, name: `Looked up ${id}` })));
  };
}

async function mount() {
  const fixture = TestBed.createComponent(AsyncHost);
  await fixture.whenStable();
  return { fixture, host: fixture.componentInstance, ...driver(fixture) };
}

describe('NguDropdown fetchFn results', () => {
  it('takes a Promise as well as an Observable', async () => {
    const dd = await mount();
    await dd.open();
    await settle();
    await dd.fixture.whenStable();

    expect(dd.options()[0].textContent).toContain('Row 0');
  });

  it('aborts the requests a new search makes stale', async () => {
    const fixture = TestBed.createComponent(NguDropdown<Row>);
    const server = new FakeServer();
    server.hold = true;
    fixture.componentRef.setInput('fetchFn', server.load);
    await fixture.whenStable();
    const dd = driver(fixture);

    await dd.open();
    await dd.type('abc');

    expect(server.signals[0].aborted).toBe(true);
    expect(server.signals.at(-1)!.aborted).toBe(false);
  });

  it('shows the retry notice and emits loadError when the source completes empty', async () => {
    const fixture = TestBed.createComponent(NguDropdown<Row>);
    const errors: unknown[] = [];
    fixture.componentInstance.loadError.subscribe((e) => errors.push(e));
    fixture.componentRef.setInput('fetchFn', () => of<NguDropdownPage<Row>>());
    await fixture.whenStable();
    const dd = driver(fixture);

    await dd.open();

    expect(dd.notice()?.textContent).toContain('Could not load these options');
    expect(errors).toHaveLength(1);
  });

  it('treats a fetchFn that throws as a failed load', async () => {
    const fixture = TestBed.createComponent(NguDropdown<Row>);
    fixture.componentRef.setInput('fetchFn', () => {
      throw new Error('bad query');
    });
    await fixture.whenStable();
    const dd = driver(fixture);

    await dd.open();

    expect(dd.notice()).not.toBeNull();
  });
});

describe('NguDropdown lookupFn', () => {
  it('names a value set from outside without opening the list', async () => {
    const dd = await mount();

    dd.host.picked.set(4821);
    await dd.fixture.whenStable();

    expect(dd.host.looked).toEqual([[4821]]);
    expect(dd.trigger().textContent).toContain('Looked up 4821');
    expect(dd.host.server.queries).toHaveLength(0);
  });

  it('asks only for the keys nothing has named yet, once each', async () => {
    const dd = await mount();
    await dd.open();
    await settle();
    await dd.fixture.whenStable();
    dd.options()[2].click();
    await dd.fixture.whenStable();

    // Row 2 was picked from the list; only 9000 is unknown.
    dd.host.picked.set([2, 9000] as never);
    await dd.fixture.whenStable();
    dd.host.picked.set(9000);
    await dd.fixture.whenStable();

    expect(dd.host.looked).toEqual([[9000]]);
  });
});

describe('provideNguDropdownConfig', () => {
  @Component({
    selector: 'test-config-host',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NguDropdown],
    template: `<ngu-dropdown [options]="rows" [(value)]="picked" multiple />`,
  })
  class ConfigHost {
    readonly rows = [
      { id: 1, name: 'One' },
      { id: 2, name: 'Two' },
      { id: 3, name: 'Three' },
    ];
    readonly picked = signal<number[]>([1, 2, 3]);
  }

  it('sets option paths and replaces messages, merging nested providers', async () => {
    const lang = signal<'en' | 'fr'>('en');
    TestBed.configureTestingModule({
      providers: [
        provideNguDropdownConfig({
          optionValue: 'id',
          optionLabel: 'name',
          messages: { placeholder: 'Choose' },
        }),
      ],
    });
    TestBed.overrideComponent(ConfigHost, {
      add: {
        providers: [
          provideNguDropdownConfig({
            messages: signal({
              more: (n: number) => (lang() === 'fr' ? `+${n} de plus` : `+${n} more`),
            }),
          }),
        ],
      },
    });
    const fixture = TestBed.createComponent(ConfigHost);
    await fixture.whenStable();
    const dd = driver(fixture);

    expect(dd.trigger().textContent).toContain('One');
    expect(dd.trigger().textContent).toContain('+1 more');

    lang.set('fr');
    await fixture.whenStable();
    expect(dd.trigger().textContent).toContain('+1 de plus');

    fixture.componentInstance.picked.set([]);
    await fixture.whenStable();
    expect(dd.trigger().textContent).toContain('Choose');
  });
});

describe('NguDropdown row memory', () => {
  @Component({
    selector: 'test-memory-host',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NguDropdown, ReactiveFormsModule],
    template: `<ngu-dropdown
      [fetchFn]="server.load"
      [formControl]="control"
      optionValue="id"
      optionLabel="name"
    />`,
  })
  class MemoryHost {
    readonly server = new FakeServer();
    readonly control = new FormControl<number | null>(null);
  }

  it('remembers picked rows and names a restored value from them', async () => {
    const store = new Map<unknown, unknown>();
    const memory: NguDropdownRowMemory = {
      remember: (_control: NgControl, key, row) => store.set(key, row),
      recall: (_control: NgControl, key) => store.get(key),
    };
    TestBed.configureTestingModule({
      providers: [provideNguDropdownConfig({ rowMemory: memory })],
    });

    const first = TestBed.createComponent(MemoryHost);
    await first.whenStable();
    const a = driver(first);
    await a.open();
    a.options()[5].click();
    await first.whenStable();
    expect(store.get(5)).toEqual({ id: 5, name: 'Row 5' });
    first.destroy();

    // A second form restored with the same value: named without any request.
    const second = TestBed.createComponent(MemoryHost);
    second.componentInstance.control.setValue(5);
    await second.whenStable();

    expect(driver(second).trigger().textContent).toContain('Row 5');
    expect(second.componentInstance.server.queries).toHaveLength(0);
  });
});
