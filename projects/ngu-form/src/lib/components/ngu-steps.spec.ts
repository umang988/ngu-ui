import { Location } from '@angular/common';
import { provideLocationMocks, SpyLocation } from '@angular/common/testing';
import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { defineForm } from '../define';
import { NguForm } from './ngu-form';

interface Booking {
  guest: { name: string; email: string };
  room: { kind: string; nights: number; parking: boolean };
  car: { plate: string };
  pay: { method: string };
}

const blank = (): Booking => ({
  guest: { name: '', email: '' },
  room: { kind: '', nights: 1, parking: false },
  car: { plate: '' },
  pay: { method: '' },
});

function booking(initial: Booking, review: boolean, stepParam?: string) {
  return defineForm<Booking>(
    initial,
    {
      guest: {
        title: 'Guest',
        fields: { name: { label: 'Name', required: true }, email: { label: 'Email', type: 'email' } },
      },
      room: {
        title: 'Room',
        fields: {
          kind: { label: 'Room type', type: 'select', required: true, options: [{ value: 'twin', label: 'Twin' }] },
          nights: { label: 'Nights', min: 1 },
          parking: 'Parking',
        },
      },
      car: { title: 'Car', hidden: (m) => !m.room.parking, fields: { plate: { label: 'Plate', required: true } } },
      pay: {
        title: 'Payment',
        fields: { method: { label: 'Method', required: (m) => m.guest.email === '' } },
      },
    },
    { layout: 'steps', review, stepParam },
  );
}

@Component({
  imports: [NguForm],
  template: `<ngu-form [form]="form" submitLabel="Book" (submitted)="sent.set($event)" />`,
})
class Host {
  readonly sent = signal<Booking | undefined>(undefined);
  readonly form = booking(blank(), false);
}

@Component({
  imports: [NguForm],
  template: `<ngu-form [form]="form" submitLabel="Book" />`,
})
class ReviewHost {
  readonly form = booking(
    { guest: { name: 'Asha', email: 'a@x.in' }, room: { kind: 'twin', nights: 2, parking: false }, car: { plate: '' }, pay: { method: '' } },
    true,
  );
}

@Component({
  imports: [NguForm],
  template: `<ngu-form [form]="form" submitLabel="Book" />`,
})
class UrlHost {
  readonly form = booking(
    { guest: { name: 'Asha', email: '' }, room: { kind: '', nights: 1, parking: false }, car: { plate: '' }, pay: { method: '' } },
    false,
    'step',
  );
}

async function render<T>(type: new () => T): Promise<{ fixture: ComponentFixture<T>; el: HTMLElement }> {
  const fixture = TestBed.createComponent(type);
  const el = fixture.nativeElement as HTMLElement;
  document.body.appendChild(el);
  await fixture.whenStable();
  return { fixture, el };
}

const visibleStep = (el: HTMLElement) => el.querySelector<HTMLElement>('.ngu-step:not([hidden])')!;
const heading = (el: HTMLElement) => visibleStep(el).querySelector('.ngu-step__title')!.textContent!.replace(/\s+/g, ' ').trim();
const button = (el: HTMLElement, text: string) =>
  Array.from(el.querySelectorAll<HTMLButtonElement>('.ngu-actions button')).find((b) => b.textContent?.trim() === text);
const field = (el: HTMLElement, label: string) => {
  const l = Array.from(el.querySelectorAll('label')).find((x) => x.textContent?.replace('*', '').trim() === label)!;
  return el.querySelector<HTMLInputElement | HTMLSelectElement>(`#${l.htmlFor}`)!;
};
const type = (input: HTMLInputElement | HTMLSelectElement, value: string) => {
  input.value = value;
  input.dispatchEvent(new Event(input instanceof HTMLSelectElement ? 'change' : 'input'));
};
const live = (el: HTMLElement) => el.querySelector('[aria-live="polite"].ngu-sr-only')!.textContent?.trim();

describe('wizard', () => {
  afterEach(() => document.body.querySelectorAll('[ng-version], .ngu-form').forEach((n) => n.remove()));

  it('shows one step at a time with its position, and a step list', async () => {
    const { el } = await render(Host);
    expect(heading(el)).toBe('Step 1 of 3 Guest');
    expect(el.querySelectorAll('.ngu-step').length).toBe(3);
    const items = Array.from(el.querySelectorAll('.ngu-steps__button'));
    expect(items.map((b) => b.querySelector('.ngu-steps__marker')!.textContent!.trim())).toEqual(['1', '2', '3']);
    expect(items.map((b) => b.querySelector('.ngu-steps__title')!.textContent)).toEqual(['Guest', 'Room', 'Payment']);
    expect(items[0].querySelector('.ngu-steps__marker')!.getAttribute('aria-hidden')).toBe('true');
    expect(items[0].getAttribute('aria-current')).toBe('step');
    expect((items[1] as HTMLButtonElement).disabled).toBe(true);
    expect(el.querySelector('.ngu-steps__list')!.getAttribute('aria-label')).toBe('Steps');
    expect(button(el, 'Back')).toBeUndefined();
    expect(button(el, 'Next')).toBeTruthy();
    expect(button(el, 'Book')).toBeUndefined();
  });

  it('keeps the user on an invalid step, shows only its errors and focuses the first', async () => {
    const { fixture, el } = await render(Host);
    button(el, 'Next')!.click();
    await fixture.whenStable();
    expect(heading(el)).toBe('Step 1 of 3 Guest');
    expect(visibleStep(el).querySelectorAll('.ngu-field--invalid').length).toBe(1);
    expect(el.querySelectorAll('.ngu-field--invalid').length).toBe(1);
    expect(document.activeElement).toBe(field(el, 'Name'));
    expect(live(el)).toBe('1 field needs attention.');
  });

  it('moves on when the step is valid, focuses the new heading, and Back keeps the values', async () => {
    const { fixture, el } = await render(Host);
    type(field(el, 'Name') as HTMLInputElement, 'Asha');
    button(el, 'Next')!.click();
    await fixture.whenStable();
    expect(heading(el)).toBe('Step 2 of 3 Room');
    expect(document.activeElement).toBe(visibleStep(el).querySelector('.ngu-step__title'));
    expect(el.querySelector('.ngu-steps__item--done')?.textContent).toContain('completed');
    // Errors of a step not yet tried stay quiet.
    expect(visibleStep(el).querySelectorAll('.ngu-field--invalid').length).toBe(0);

    button(el, 'Back')!.click();
    await fixture.whenStable();
    expect(heading(el)).toBe('Step 1 of 3 Guest');
    expect((field(el, 'Name') as HTMLInputElement).value).toBe('Asha');
  });

  it('treats Enter in a field as Next until the last step', async () => {
    const { fixture, el } = await render(Host);
    type(field(el, 'Name') as HTMLInputElement, 'Asha');
    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    expect(heading(el)).toBe('Step 2 of 3 Room');
    expect(fixture.componentInstance.sent()).toBeUndefined();
  });

  it('adds a skipped step when its condition turns off', async () => {
    const { fixture, el } = await render(Host);
    const form = fixture.componentInstance.form;
    form.tree.room.parking().value.set(true);
    await fixture.whenStable();
    expect(Array.from(el.querySelectorAll('.ngu-steps__title')).map((t) => t.textContent)).toEqual([
      'Guest',
      'Room',
      'Car',
      'Payment',
    ]);
    expect(heading(el)).toBe('Step 1 of 4 Guest');
  });

  it('submits on the last step, returning to the first step with problems when refused', async () => {
    const { fixture, el } = await render(Host);
    const form = fixture.componentInstance.form;
    form.patch({ guest: { name: 'Asha', email: 'a@x.in' }, room: { kind: 'twin' } });
    form.steps.goTo('pay');
    await fixture.whenStable();
    expect(button(el, 'Book')).toBeTruthy();

    // Breaking step 1 after reaching the last step sends the user back there on submit.
    form.tree.guest.name().value.set('');
    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    expect(heading(el)).toBe('Step 1 of 3 Guest');
    expect(document.activeElement).toBe(field(el, 'Name'));

    type(field(el, 'Name') as HTMLInputElement, 'Asha');
    form.steps.goTo('pay');
    await fixture.whenStable();
    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    expect(fixture.componentInstance.sent()?.guest.name).toBe('Asha');
  });
});

describe('review step', () => {
  afterEach(() => document.body.querySelectorAll('.ngu-form').forEach((n) => n.remove()));

  it('summarises every step with an Edit button that returns to the review', async () => {
    const { fixture, el } = await render(ReviewHost);
    const form = fixture.componentInstance.form;
    form.steps.goTo('$review');
    await fixture.whenStable();
    expect(heading(el)).toBe('Step 4 of 4 Check your answers');
    const parts = Array.from(visibleStep(el).querySelectorAll('.ngu-review'));
    expect(parts.map((p) => p.querySelector('h3')!.textContent)).toEqual(['Guest', 'Room', 'Payment']);
    const room = parts[1];
    const pairs = Array.from(room.querySelectorAll('.ngu-view__item')).map(
      (i) => `${i.querySelector('dt')!.textContent!.trim()}: ${i.querySelector('dd')!.textContent!.trim()}`,
    );
    expect(pairs).toEqual(['Room type: Twin', 'Nights: 2', 'Parking: No']);
    expect(parts[2].querySelector('dd')!.textContent).toContain('Not provided');
    expect(button(el, 'Book')).toBeTruthy();

    const edit = room.querySelector<HTMLButtonElement>('.ngu-review__edit')!;
    expect(edit.textContent?.replace(/\s+/g, ' ').trim()).toBe('Edit Room');
    edit.click();
    await fixture.whenStable();
    expect(heading(el)).toBe('Step 2 of 4 Room');
    const back = button(el, 'Back to review')!;
    expect(back).toBeTruthy();
    back.click();
    await fixture.whenStable();
    expect(heading(el)).toBe('Step 4 of 4 Check your answers');
  });
});

describe('URL-synced steps', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideLocationMocks()] }));
  afterEach(() => document.body.querySelectorAll('.ngu-form').forEach((n) => n.remove()));

  it('adds a history entry per step, and Back in the browser goes to the previous step', async () => {
    const { fixture, el } = await render(UrlHost);
    const location = TestBed.inject(Location) as SpyLocation;
    expect(location.path()).toBe('');

    button(el, 'Next')!.click();
    await fixture.whenStable();
    expect(location.path()).toBe('/?step=room');

    location.back();
    await fixture.whenStable();
    expect(heading(el)).toBe('Step 1 of 3 Guest');
  });

  it('opens the step from the URL on load when the steps before it are valid', async () => {
    const location = TestBed.inject(Location) as SpyLocation;
    location.replaceState('/book?step=room');
    const { el } = await render(UrlHost);
    expect(heading(el)).toBe('Step 2 of 3 Room');
  });

  it('stops at the first step that still needs answers', async () => {
    const location = TestBed.inject(Location) as SpyLocation;
    location.replaceState('/book?step=pay');
    const { el } = await render(UrlHost);
    expect(heading(el)).toBe('Step 2 of 3 Room');
    expect(location.path()).toBe('/book?step=room');
  });
});
