import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, of } from 'rxjs';
import { driver } from '../testing/helpers';
import { NguDropdown } from './dropdown';
import type { NguDropdownPage, NguDropdownQuery } from './types';

/**
 * A server-mode dropdown narrows its list through `[filters]`, never through what its
 * `fetchFn` closes over. Only whether `fetchFn` is bound is watched (a template arrow is a
 * new closure every pass), so a filter captured by the closure is invisible to the
 * component and the panel keeps offering the previous filter's rows.
 */
interface Row {
  id: number;
  name: string;
}

/** Answers out of disjoint sets, so a stale page is unmistakable. */
class FilteredServer {
  readonly queries: NguDropdownQuery[] = [];

  readonly load = (query: NguDropdownQuery): Observable<NguDropdownPage<Row>> => {
    this.queries.push(query);

    const group = (query.filters['group'] as string | null) ?? 'all';
    const content =
      group === 'all'
        ? [
            { id: 1, name: 'Alpha' },
            { id: 2, name: 'Beta' },
          ]
        : [{ id: group === 'a' ? 1 : 2, name: group === 'a' ? 'Alpha' : 'Beta' }];

    return of({ content, totalElements: content.length });
  };
}

@Component({
  selector: 'test-bound-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NguDropdown],
  template: `
    <ngu-dropdown
      [fetchFn]="server.load"
      [filters]="{ group: group() }"
      [(value)]="picked"
      optionValue="id"
      optionLabel="name"
    />
  `,
})
class BoundHost {
  readonly server = new FilteredServer();
  readonly group = signal<string | null>(null);
  picked: any = null;
}

/** The wrong way, kept to show the difference: the filter is captured, never bound. */
@Component({
  selector: 'test-captured-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NguDropdown],
  template: `<ngu-dropdown
    [fetchFn]="load"
    [(value)]="picked"
    optionValue="id"
    optionLabel="name"
  />`,
})
class CapturedHost {
  readonly server = new FilteredServer();
  readonly group = signal<string | null>(null);
  picked: any = null;

  readonly load = (query: NguDropdownQuery): Observable<NguDropdownPage<Row>> =>
    this.server.load({ ...query, filters: { group: this.group() } });
}

async function mount<T extends BoundHost | CapturedHost>(host: new () => T) {
  const fixture = TestBed.createComponent(host);
  await fixture.whenStable();
  return { fixture, host: fixture.componentInstance, ...driver(fixture) };
}

describe('A server-mode dropdown whose filter changes', () => {
  it('re-asks the server when [filters] changes', async () => {
    const dd = await mount(BoundHost);

    await dd.open();
    expect(dd.labels()).toEqual(['Alpha', 'Beta']);

    await dd.open(); // closes
    dd.host.group.set('b');
    await dd.fixture.whenStable();
    await dd.open();

    expect(dd.labels()).toEqual(['Beta']);
    expect(dd.host.server.queries.at(-1)!.filters).toEqual({ group: 'b' });
  });

  it('re-asks while the panel is still open', async () => {
    const dd = await mount(BoundHost);

    await dd.open();
    expect(dd.labels()).toEqual(['Alpha', 'Beta']);

    dd.host.group.set('a');
    await dd.fixture.whenStable();

    expect(dd.labels()).toEqual(['Alpha']);
  });

  it('does not re-fetch when the filters object is rebuilt with the same values', async () => {
    const dd = await mount(BoundHost);
    await dd.open();
    const asked = dd.host.server.queries.length;

    dd.host.group.set(null);
    dd.fixture.changeDetectorRef.markForCheck();
    await dd.fixture.whenStable();

    expect(dd.host.server.queries.length).toBe(asked);
  });

  /*
   * The failing shape, asserted as failing. If the dropdown ever starts watching its
   * fetcher's identity this flips, and the `fetchFn` docs need revisiting.
   */
  it('goes stale when the filter is captured by the fetchFn instead', async () => {
    const dd = await mount(CapturedHost);

    await dd.open();
    expect(dd.labels()).toEqual(['Alpha', 'Beta']);

    await dd.open(); // closes
    dd.host.group.set('b');
    await dd.fixture.whenStable();
    await dd.open();

    expect(dd.labels()).toEqual(['Alpha', 'Beta']);
  });
});
