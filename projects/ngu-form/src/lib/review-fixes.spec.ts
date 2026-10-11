import { ApplicationRef, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NguForm } from './components/ngu-form';
import { defineForm } from './define';
import { createNguI18n, formatMessage, injectNguI18n, provideNguMessages } from './messages';
import { deepEqual, isPlainObject, toDateBound } from './internal';
import { defaultRuleTests } from './strength';
import { applyMask, maskTransform, parseLocalNumber, unmask } from './transform';
import type { DraftStorage, FormLoader } from './types';

const kinds = (errors: readonly { kind: string }[]) => errors.map((e) => e.kind);

function controlFor(el: HTMLElement, label: string): HTMLInputElement {
  const lbl = Array.from(el.querySelectorAll('label')).find((l) => l.textContent?.trim().startsWith(label))!;
  return el.querySelector<HTMLInputElement>(`#${lbl.htmlFor}`)!;
}

describe('date bounds with a time of day', () => {
  it('count as that calendar day, so today is allowed by min: new Date()', () => {
    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    expect(toDateBound(now)?.getTime()).toBe(today.getTime());
    expect(toDateBound(new Date('2026-01-01'))?.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(toDateBound('2026-01-01')?.toISOString()).toBe('2026-01-01T00:00:00.000Z');

    const def = TestBed.runInInjectionContext(() =>
      defineForm({ day: today }, { day: { label: 'Day', min: new Date(), max: new Date() } }),
    );
    expect(def.tree.day().errors()).toEqual([]);
  });
});

describe('mask literals that are also slot characters', () => {
  const mask = '8 (000) 000-00-00';

  it('formats a stored value without re-reading the leading 8 as a literal', () => {
    const t = maskTransform(mask);
    expect(t.format('8121234567')).toBe('8 (812) 123-45-67');
    expect(t.parse('8 (812) 123-45-67')).toBe('8121234567');
    // An 8 typed into the empty field is the first digit.
    expect(unmask('8', mask)).toBe('8');
    expect(applyMask('8', mask)).toBe('8 (8');
    expect(t.countBefore!('8 (812', 2)).toBe(0);
  });
});

describe('deleting next to a mask literal', () => {
  @Component({ imports: [NguForm], template: `<ngu-form [form]="form" />` })
  class MaskHost {
    readonly form = defineForm({ code: '1234567' }, { code: { label: 'Code', mask: '000-0000' } });
  }

  function del(input: HTMLInputElement, text: string, caret: number, inputType: string) {
    input.value = text;
    input.setSelectionRange(caret, caret);
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType }));
  }

  it('removes the digit beyond the literal for Delete and Backspace', async () => {
    const fixture = TestBed.createComponent(MaskHost);
    const el: HTMLElement = fixture.nativeElement;
    document.body.appendChild(el);
    await fixture.whenStable();
    const input = controlFor(el, 'Code');
    input.focus();
    expect(input.value).toBe('123-4567');
    // Delete with the caret before "-": the browser removes "-"; the 4 should go instead.
    del(input, '1234567', 3, 'deleteContentForward');
    expect(input.value).toBe('123-567');
    expect(input.selectionStart).toBe(3);
    // Backspace with the caret after "-": the browser removes "-"; the 3 should go.
    del(input, '123567', 3, 'deleteContentBackward');
    expect(input.value).toBe('125-67');
    await fixture.whenStable();
    expect(fixture.componentInstance.form.value().code).toBe('12567');
    el.remove();
  });
});

describe('undo after reset', () => {
  it('marks the form dirty so guards and drafts see the restored values', async () => {
    const def = TestBed.runInInjectionContext(() => defineForm({ name: '' }, { name: 'Name' }, { history: true }));
    const appRef = TestBed.inject(ApplicationRef);
    def.model.set({ name: 'Ana' });
    await appRef.whenStable();
    def.reset();
    await appRef.whenStable();
    expect(def.dirty()).toBe(false);
    def.history.undo();
    expect(def.value().name).toBe('Ana');
    expect(def.changes()).toEqual({ name: 'Ana' });
    expect(def.dirty()).toBe(true);
  });

  it('keeps list rows (and their state) when undoing inside a list', async () => {
    const def = TestBed.runInInjectionContext(() =>
      defineForm({ items: [{ sku: 'a' }, { sku: 'b' }] }, { items: { item: { sku: 'SKU' }, newItem: { sku: '' } } }, { history: true }),
    );
    const appRef = TestBed.inject(ApplicationRef);
    const firstRow = def.tree.items[0];
    firstRow.sku().markAsTouched();
    def.model.set({ items: [def.value().items[0], { sku: 'bb' }] });
    await appRef.whenStable();
    def.history.undo();
    expect(def.value().items[1].sku).toBe('b');
    expect(def.tree.items[0]).toBe(firstRow);
    expect(def.tree.items[0].sku().touched()).toBe(true);
  });
});

describe('drafts after submit or reset', () => {
  it('are removed right away, with no pending save left to write them back', async () => {
    const data = new Map<string, unknown>();
    const storage: DraftStorage = {
      load: (k) => data.get(k),
      save: (k, v) => void data.set(k, v),
      remove: (k) => void data.delete(k),
    };
    const def = TestBed.runInInjectionContext(() =>
      defineForm({ name: '' }, { name: 'Name' }, { draft: { key: 'k', storage, debounce: 5 } }),
    );
    const appRef = TestBed.inject(ApplicationRef);
    await appRef.whenStable();
    await new Promise((r) => setTimeout(r));
    def.model.set({ name: 'Ana' });
    def.tree.name().markAsDirty();
    await appRef.whenStable();
    await new Promise((r) => setTimeout(r, 20));
    expect(data.has('k')).toBe(true);
    def.model.set({ name: 'Ana R' });
    await appRef.whenStable();
    def.reset(); // within the debounce window
    expect(data.has('k')).toBe(false);
    await new Promise((r) => setTimeout(r, 20));
    expect(data.has('k')).toBe(false);
  });
});

describe('messages hardening', () => {
  it('accepts an underscore or unknown locale without throwing', () => {
    expect(createNguI18n([{ locale: 'en_US' }]).locale()).toBe('en-US');
    const broken = createNguI18n([{ locale: 'not a locale!' }]);
    expect(broken.message('minItems', { label: 'L', min: 2 })).toBe('L needs at least 2 entries');
  });

  it('only fills own parameters and keeps # for the inner plural', () => {
    expect(formatMessage('{toString} {label}', { label: 'x' })).toBe('{toString} x');
    expect(formatMessage('{a, plural, other {{b, plural, one {# b} other {# bs}}}}', { a: 5, b: 1 })).toBe('1 b');
    expect(formatMessage('{v}', { v: Object.create(null) })).toBe('');
  });

  it('merges a component provider with the app provider instead of replacing it', async () => {
    TestBed.configureTestingModule({
      providers: [provideNguMessages({ translate: (key) => (key === 'f.name' ? 'Nom' : undefined) })],
    });
    @Component({
      providers: [provideNguMessages({ required: '{label} est requis' })],
      template: ``,
    })
    class Inner {
      readonly i18n = injectNguI18n();
    }
    const i18n = TestBed.createComponent(Inner).componentInstance.i18n;
    expect(i18n.text('f.name')).toBe('Nom');
    expect(i18n.error({ kind: 'required' }, { __ngu: 'leaf', type: 'text', label: 'f.name' })).toBe('Nom est requis');
  });
});

describe('values that are not plain data', () => {
  it('are compared by identity, not as empty objects', () => {
    const a = new Blob(['a']);
    const b = new Blob(['b']);
    expect(isPlainObject(a)).toBe(false);
    expect(isPlainObject(new Map())).toBe(false);
    expect(isPlainObject(Object.create(null))).toBe(true);
    expect(deepEqual(a, b)).toBe(false);
    expect(deepEqual({ f: a }, { f: a })).toBe(true);
  });
});

describe('locale numbers read back what they show', () => {
  it('handles plus signs, accounting negatives and rounding', () => {
    expect(parseLocalNumber('+5', 'en-US', { signDisplay: 'always' })).toBe(5);
    expect(parseLocalNumber('($5.00)', 'en-US', { style: 'currency', currency: 'USD', currencySign: 'accounting' })).toBe(-5);
    expect(parseLocalNumber('19.999', 'en-US', { style: 'currency', currency: 'USD' })).toBe(20);
    expect(parseLocalNumber('12.5%', 'en-US', { style: 'percent', maximumFractionDigits: 1 })).toBe(0.125);
    expect(parseLocalNumber('1,5', 'de_DE')).toBe(1.5);
  });
});

describe('an idle load', () => {
  it('shows the form instead of waiting forever', async () => {
    const loader: FormLoader<{ name: string }> = {
      value: signal(undefined),
      isLoading: signal(false),
      status: signal('idle'),
    };
    @Component({ imports: [NguForm], template: `<ngu-form [form]="form" />` })
    class IdleHost {
      readonly form = defineForm({ name: '' }, { name: 'Name' }, { load: loader });
    }
    const fixture = TestBed.createComponent(IdleHost);
    await fixture.whenStable();
    expect(fixture.componentInstance.form.loading()).toBe(false);
    expect(fixture.nativeElement.querySelector('input')).not.toBeNull();
  });
});

describe('strength with combining marks', () => {
  it('does not count vowel signs as symbols', () => {
    const symbol = defaultRuleTests(8).find((r) => r.id === 'symbol')!;
    expect(symbol.test('पासवर्ड')).toBe(false); // ा and ् are combining marks
    expect(symbol.test('पासवर्ड!')).toBe(true);
  });
});

describe('after a successful submit', () => {
  @Component({ imports: [NguForm], template: `<ngu-form [form]="form" submitLabel="Save" />` })
  class SavedHost {
    readonly form = defineForm({ name: 'Ana' }, { name: { label: 'Name', required: true } });
  }

  it('lets errorsOn decide again when errors show', async () => {
    const fixture = TestBed.createComponent(SavedHost);
    const el: HTMLElement = fixture.nativeElement;
    await fixture.whenStable();
    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    fixture.componentInstance.form.model.set({ name: '' });
    await fixture.whenStable();
    expect(kinds(fixture.componentInstance.form.tree.name().errors())).toEqual(['required']);
    expect(el.querySelector('.ngu-error')).toBeNull();
  });
});
