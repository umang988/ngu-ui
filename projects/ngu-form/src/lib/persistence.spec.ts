import { ApplicationRef, Component, Injector, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NguForm } from './components/ngu-form';
import { defineForm } from './define';
import { fitDraft, persistable } from './draft';
import { changedPaths } from './history';
import type { DraftStorage, FormDefinition } from './types';

/** In-memory storage that records what was saved. */
function memoryStorage(initial: Record<string, unknown> = {}) {
  const data = new Map(Object.entries(initial));
  const storage: DraftStorage = {
    load: (key) => data.get(key),
    save: (key, value) => void data.set(key, JSON.parse(JSON.stringify(value))),
    remove: (key) => void data.delete(key),
  };
  return { storage, data };
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function type(input: HTMLInputElement, value: string) {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function controlFor(el: HTMLElement, label: string): HTMLInputElement {
  const lbl = Array.from(el.querySelectorAll('label')).find((l) => l.textContent?.trim().startsWith(label))!;
  return el.querySelector<HTMLInputElement>(`#${lbl.htmlFor}`)!;
}

describe('draft helpers', () => {
  const fields = TestBed.runInInjectionContext(
    () =>
      defineForm(
        { name: '', password: '', card: '', when: new Date('2026-01-01'), items: [{ sku: '', secret: '' }] },
        {
          name: 'Name',
          password: { label: 'Password', type: 'password' },
          card: { label: 'Card', persist: false },
          when: 'When',
          items: { item: { sku: 'SKU', secret: { label: 'Secret', type: 'password' } }, newItem: { sku: '', secret: '' } },
        },
      ).fields,
  ) as FormDefinition;

  it('leaves out passwords and fields with persist: false', () => {
    expect(
      persistable(fields, { name: 'Ana', password: 'x', card: '4111', when: null, items: [{ sku: 'A', secret: 's' }] }),
    ).toEqual({ name: 'Ana', when: null, items: [{ sku: 'A' }] });
  });

  it('fits a stored draft onto the current shape and refuses mismatched types', () => {
    const current = { name: '', password: 'kept', card: '', when: new Date('2026-01-01'), items: [] };
    const fitted = fitDraft(
      fields,
      { name: 42, password: 'stolen', when: new Date('2026-05-05'), items: [{ sku: 'B' }], removed: true },
      current,
    ) as Record<string, any>;
    expect(fitted['name']).toBe('');
    expect(fitted['password']).toBe('kept');
    expect(fitted['when'].toISOString()).toBe('2026-05-05T00:00:00.000Z');
    expect(fitted['items']).toEqual([{ sku: 'B', secret: '' }]);
    expect('removed' in fitted).toBe(false);
  });
});

describe('drafts', () => {
  @Component({ imports: [NguForm], template: `<ngu-form [form]="form" submitLabel="Send" />` })
  class DraftHost {
    static storage: DraftStorage;
    readonly form = defineForm(
      { name: '', password: '', start: new Date('2026-01-01') },
      { name: 'Name', password: { label: 'Password', type: 'password' }, start: 'Start' },
      { draft: { key: 'test', storage: DraftHost.storage, debounce: 10 } },
    );
  }

  it('saves after a pause, never the password, and keeps dates', async () => {
    const { storage, data } = memoryStorage();
    DraftHost.storage = storage;
    const fixture = TestBed.createComponent(DraftHost);
    const el: HTMLElement = fixture.nativeElement;
    await fixture.whenStable();
    type(controlFor(el, 'Name'), 'Ana');
    type(controlFor(el, 'Password'), 'hunter2');
    await fixture.whenStable();
    await wait(30);
    const saved = data.get('test') as { v: number; savedAt: number; value: Record<string, unknown> };
    expect(saved.v).toBe(1);
    expect(saved.value).toEqual({ name: 'Ana', start: { $date: '2026-01-01T00:00:00.000Z' } });
    expect(fixture.componentInstance.form.draft.savedAt()).toBeInstanceOf(Date);
  });

  it('restores a draft with a notice, marks the form dirty, and discards on request', async () => {
    const savedAt = new Date('2026-10-10T10:42:00').getTime();
    const { storage, data } = memoryStorage({
      test: { v: 1, savedAt, value: { name: 'Bea', password: 'nope', start: { $date: '2026-06-01T00:00:00.000Z' } } },
    });
    DraftHost.storage = storage;
    const fixture = TestBed.createComponent(DraftHost);
    const el: HTMLElement = fixture.nativeElement;
    await fixture.whenStable();
    await wait(0);
    await fixture.whenStable();
    const def = fixture.componentInstance.form;
    expect(def.value().name).toBe('Bea');
    expect(def.value().password).toBe('');
    expect(def.value().start.toISOString()).toBe('2026-06-01T00:00:00.000Z');
    expect(def.dirty()).toBe(true);
    expect(def.draft.restoredAt()?.getTime()).toBe(savedAt);
    const notice = el.querySelector('.ngu-notice')!;
    expect(notice.getAttribute('role')).toBe('status');
    expect(notice.textContent).toContain('Your unsaved changes from');

    notice.querySelector('button')!.click();
    await fixture.whenStable();
    expect(def.value().name).toBe('');
    expect(def.dirty()).toBe(false);
    expect(el.querySelector('.ngu-notice')).toBeNull();
    expect(data.has('test')).toBe(false);
  });

  it('removes the draft after a successful submit', async () => {
    const { storage, data } = memoryStorage();
    DraftHost.storage = storage;
    const fixture = TestBed.createComponent(DraftHost);
    const el: HTMLElement = fixture.nativeElement;
    await fixture.whenStable();
    type(controlFor(el, 'Name'), 'Ana');
    await fixture.whenStable();
    await wait(30);
    expect(data.has('test')).toBe(true);
    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    await wait(0);
    expect(data.has('test')).toBe(false);
  });

  it('uses localStorage by default and waits for load before restoring', async () => {
    localStorage.setItem(
      'ngu-form:draft:profile:7',
      JSON.stringify({ v: 1, savedAt: Date.now(), value: { name: 'Draft name', bio: 'Draft bio' } }),
    );
    const value = signal<{ name: string; bio: string } | undefined>(undefined);
    const isLoading = signal(true);
    const injector = TestBed.inject(Injector);
    const def = defineForm(
      { name: '', bio: '' },
      { name: 'Name', bio: 'Bio' },
      { load: { value, isLoading }, draft: { key: 'profile:7' }, injector },
    );
    const appRef = TestBed.inject(ApplicationRef);
    await appRef.whenStable();
    await wait(0);
    expect(def.value()).toEqual({ name: '', bio: '' });
    value.set({ name: 'Server name', bio: 'Server bio' });
    isLoading.set(false);
    await appRef.whenStable();
    await wait(0);
    await appRef.whenStable();
    expect(def.value()).toEqual({ name: 'Draft name', bio: 'Draft bio' });
    def.draft.discard();
    expect(def.value()).toEqual({ name: 'Server name', bio: 'Server bio' });
    expect(localStorage.getItem('ngu-form:draft:profile:7')).toBeNull();
  });
});

describe('undo and redo', () => {
  it('lists changed leaf paths', () => {
    expect(changedPaths({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 3 } })).toEqual(['b.c']);
    expect(changedPaths({ l: [1, 2] }, { l: [1, 3] })).toEqual(['l.1']);
    expect(changedPaths({ l: [1] }, { l: [1, 2] })).toEqual(['l']);
  });

  it('records steps, joins quick edits to one field, and redoes', async () => {
    const def = TestBed.runInInjectionContext(() =>
      defineForm({ name: '', city: '' }, { name: 'Name', city: 'City' }, { history: true }),
    );
    const appRef = TestBed.inject(ApplicationRef);
    const set = async (v: { name: string; city: string }) => {
      def.model.set(v);
      await appRef.whenStable();
    };
    expect(def.history.canUndo()).toBe(false);
    await set({ name: 'A', city: '' });
    await set({ name: 'An', city: '' });
    await set({ name: 'Ana', city: '' });
    await set({ name: 'Ana', city: 'Pune' });
    expect(def.history.canUndo()).toBe(true);

    def.history.undo();
    expect(def.value()).toEqual({ name: 'Ana', city: '' });
    def.history.undo();
    expect(def.value()).toEqual({ name: '', city: '' });
    expect(def.history.canUndo()).toBe(false);
    await appRef.whenStable();

    def.history.redo();
    expect(def.value()).toEqual({ name: 'Ana', city: '' });
    await appRef.whenStable();
    await set({ name: 'Ana', city: 'Goa' });
    expect(def.history.canRedo()).toBe(false);
  });

  it('is inert without the option', () => {
    const def = TestBed.runInInjectionContext(() => defineForm({ a: '' }, { a: 'A' }));
    def.model.set({ a: 'x' });
    def.history.undo();
    expect(def.value()).toEqual({ a: 'x' });
  });

  @Component({ imports: [NguForm], template: `<ngu-form [form]="form" />` })
  class HistoryHost {
    readonly form = defineForm({ name: '', city: '' }, { name: 'Name', city: 'City' }, { history: true });
  }

  it('undoes with Ctrl+Z and redoes with Ctrl+Shift+Z, announcing and focusing the field', async () => {
    const fixture = TestBed.createComponent(HistoryHost);
    const el: HTMLElement = fixture.nativeElement;
    await fixture.whenStable();
    type(controlFor(el, 'Name'), 'Ana');
    await fixture.whenStable();
    const city = controlFor(el, 'City');
    city.focus();
    const key = (init: KeyboardEventInit) => {
      const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
      city.dispatchEvent(event);
      return event;
    };
    const undo = key({ key: 'z', ctrlKey: true });
    expect(undo.defaultPrevented).toBe(true);
    await fixture.whenStable();
    expect(fixture.componentInstance.form.value().name).toBe('');
    expect(controlFor(el, 'Name').value).toBe('');
    expect(el.querySelector('[aria-live="polite"][aria-atomic="true"]')?.textContent).toBe('Undone');
    expect(document.activeElement).toBe(controlFor(el, 'Name'));

    const redo = key({ key: 'Z', ctrlKey: true, shiftKey: true });
    expect(redo.defaultPrevented).toBe(true);
    await fixture.whenStable();
    expect(fixture.componentInstance.form.value().name).toBe('Ana');

    // Nothing left to redo: the browser keeps the shortcut.
    expect(key({ key: 'y', ctrlKey: true }).defaultPrevented).toBe(false);
  });
});

describe('error summary', () => {
  @Component({
    imports: [NguForm],
    template: `<ngu-form [form]="form" errorSummary submitLabel="Continue" />`,
  })
  class SummaryHost {
    readonly form = defineForm(
      { name: '', contact: { email: '' }, items: [] as string[] },
      {
        name: { label: 'Full name', required: 'Enter your full name' },
        contact: { title: 'Contact', fields: { email: { label: 'Email', type: 'email', required: true } } },
        items: { title: 'Items', item: 'Item', newItem: '', min: 1 },
      },
    );
  }

  it('lists problems in page order after a refused submit, links to them and drops fixed ones', async () => {
    const fixture = TestBed.createComponent(SummaryHost);
    const el: HTMLElement = fixture.nativeElement;
    document.body.appendChild(el);
    await fixture.whenStable();
    expect(el.querySelector('.ngu-error-summary')).toBeNull();

    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    const summary = el.querySelector<HTMLElement>('.ngu-error-summary')!;
    expect(summary.querySelector('[role="alert"] h2')?.textContent).toBe('There is a problem');
    const links = Array.from(summary.querySelectorAll('a'));
    expect(links.map((a) => a.textContent)).toEqual(['Enter your full name', 'Email is required', 'Items needs at least 1 entry']);
    expect(document.activeElement).toBe(summary);
    expect(el.querySelector('.ngu-sr-only[aria-live]')?.textContent).toBe('');

    links[1].click();
    expect(document.activeElement).toBe(controlFor(el, 'Email'));
    expect(links[1].getAttribute('href')).toBe('#' + controlFor(el, 'Email').id);

    type(controlFor(el, 'Full name'), 'Ana Ruiz');
    await fixture.whenStable();
    expect(Array.from(el.querySelectorAll('.ngu-error-summary a')).map((a) => a.textContent)).toEqual([
      'Email is required',
      'Items needs at least 1 entry',
    ]);
    el.remove();
  });
});
