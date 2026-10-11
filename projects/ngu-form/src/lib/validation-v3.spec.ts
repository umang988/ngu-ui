import { ApplicationRef, Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { z } from 'zod';
import { NguForm } from './components/ngu-form';
import { defineForm } from './define';
import { passwordScore } from './strength';
import type { DynamicField, StandardSchemaV1 } from './types';

const kinds = (errors: readonly { kind: string }[]) => errors.map((e) => e.kind);
const messages = (errors: readonly { message?: string }[]) => errors.map((e) => e.message);

function type(input: HTMLInputElement, value: string) {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function blur(input: HTMLElement) {
  input.dispatchEvent(new FocusEvent('blur'));
  input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
}

function controlFor(el: HTMLElement, label: string): HTMLInputElement {
  const lbl = Array.from(el.querySelectorAll('label')).find((l) => l.textContent?.trim().startsWith(label))!;
  return el.querySelector<HTMLInputElement>(`#${lbl.htmlFor}`)!;
}

describe('Standard Schema', () => {
  const schema = z
    .object({
      email: z.email('Enter a real email'),
      age: z.number().min(18, 'Adults only'),
      address: z.object({ city: z.string().min(1, 'City is needed') }),
      tags: z.array(z.string().min(2, 'Tag too short')),
    })
    .refine((v) => !v.email.endsWith('@test.com') || v.age > 30, { message: 'Test accounts need age over 30' });

  const initial = { email: '', age: 0, address: { city: '' }, tags: ['a', 'bb'] };

  it('puts each Zod issue on the field at its path', () => {
    const def = TestBed.runInInjectionContext(() =>
      defineForm(initial, { email: 'Email', age: 'Age', address: { city: 'City' }, tags: { item: 'Tag', newItem: '' } }, { schema }),
    );
    expect(messages(def.tree.email().errors())).toEqual(['Enter a real email']);
    expect(kinds(def.tree.email().errors())).toEqual(['standardSchema']);
    expect(messages(def.tree.age().errors())).toEqual(['Adults only']);
    expect(messages(def.tree.address.city().errors())).toEqual(['City is needed']);
    expect(messages(def.tree.tags[0]().errors())).toEqual(['Tag too short']);
    expect(def.tree.tags[1]().errors()).toEqual([]);
    expect(def.valid()).toBe(false);

    def.model.set({ email: 'a@b.co', age: 20, address: { city: 'Pune' }, tags: ['ab'] });
    expect(def.valid()).toBe(true);
  });

  it('shows issues without a field path as form errors', () => {
    const def = TestBed.runInInjectionContext(() =>
      defineForm(
        { email: 'x@test.com', age: 20, address: { city: 'Pune' }, tags: [] as string[] },
        { email: 'Email', age: 'Age', address: { city: 'City' }, tags: { item: 'Tag', newItem: '' } },
        { schema },
      ),
    );
    expect(messages(def.tree().errors())).toEqual(['Test accounts need age over 30']);
  });

  it('accepts any Standard Schema implementation, including async ones', async () => {
    const asyncSchema: StandardSchemaV1 = {
      '~standard': {
        version: 1,
        vendor: 'test',
        validate: async (value) => {
          const v = value as { code: string };
          return v.code === 'ok' ? { value } : { issues: [{ message: 'Unknown code', path: ['code'] }] };
        },
      },
    };
    const def = TestBed.runInInjectionContext(() => defineForm({ code: 'no' }, { code: 'Code' }, { schema: asyncSchema }));
    const appRef = TestBed.inject(ApplicationRef);
    await appRef.whenStable();
    expect(messages(def.tree.code().errors())).toEqual(['Unknown code']);
    def.model.set({ code: 'ok' });
    await appRef.whenStable();
    expect(def.tree.code().errors()).toEqual([]);
  });

  it('renders schema messages under the fields and refuses the submit', async () => {
    @Component({
      imports: [NguForm],
      template: `<ngu-form [form]="form" submitLabel="Join" (submitted)="sent = true" />`,
    })
    class ValidationHost1 {
      sent = false;
      readonly form = defineForm(
        { email: '', age: 0 },
        { email: 'Email', age: 'Age' },
        { schema: z.object({ email: z.email('Enter a real email'), age: z.number().min(18, 'Adults only') }) },
      );
    }
    const fixture = TestBed.createComponent(ValidationHost1);
    const el: HTMLElement = fixture.nativeElement;
    await fixture.whenStable();
    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    expect(Array.from(el.querySelectorAll('.ngu-error')).map((e) => e.textContent)).toEqual([
      'Enter a real email',
      'Adults only',
    ]);
    expect(fixture.componentInstance.sent).toBe(false);
  });
});

describe('warnings', () => {
  @Component({
    imports: [NguForm],
    template: `<ngu-form [form]="form" submitLabel="Send" (submitted)="sent = $event" />`,
  })
  class ValidationHost2 {
    sent: unknown;
    readonly form = defineForm(
      { email: '', note: '' },
      {
        email: {
          label: 'Email',
          type: 'email',
          required: true,
          warn: [(v) => (v.endsWith('@gmial.com') ? 'Did you mean gmail.com?' : undefined)],
        },
        note: { label: 'Note', hint: 'Optional', warn: (v, m) => (v && !m.email ? 'Notes need an email to reply to' : undefined) },
      },
    );
  }

  let fixture: ComponentFixture<ValidationHost2>;
  let el: HTMLElement;
  beforeEach(async () => {
    fixture = TestBed.createComponent(ValidationHost2);
    el = fixture.nativeElement;
    await fixture.whenStable();
  });

  it('shows a warning after the user leaves the field, with a warning style and prefix', async () => {
    const email = controlFor(el, 'Email');
    type(email, 'ana@gmial.com');
    blur(email);
    await fixture.whenStable();
    const field = email.closest('ngu-field')!;
    expect(field.classList).toContain('ngu-field--warning');
    expect(field.classList).not.toContain('ngu-field--invalid');
    const warning = field.querySelector('.ngu-warning')!;
    expect(warning.textContent).toContain('Did you mean gmail.com?');
    expect(warning.querySelector('.ngu-sr-only')?.textContent?.trim()).toBe('Warning:');
    expect(email.getAttribute('aria-describedby')).toContain(warning.id);
    expect(email.getAttribute('aria-invalid')).toBeNull();
  });

  it('never blocks the submit', async () => {
    type(controlFor(el, 'Email'), 'ana@gmial.com');
    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    expect(fixture.componentInstance.sent).toEqual({ email: 'ana@gmial.com', note: '' });
  });

  it('gives way to errors, and reads other fields', async () => {
    const note = controlFor(el, 'Note');
    type(note, 'Call me');
    blur(note);
    await fixture.whenStable();
    expect(note.closest('ngu-field')!.querySelector('.ngu-warning')?.textContent).toContain('Notes need an email');
    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    const email = controlFor(el, 'Email').closest('ngu-field')!;
    expect(email.querySelector('.ngu-warning')).toBeNull();
    expect(email.querySelector('.ngu-error')?.textContent).toBe('Email is required');
  });
});

describe('password strength', () => {
  it('scores length first, then variety, and rewards long passphrases', () => {
    expect(passwordScore('', {})).toBe(0);
    expect(passwordScore('Ab1!', {})).toBe(1); // too short caps the score
    expect(passwordScore('abcdefgh', {})).toBe(1);
    expect(passwordScore('abcdefg1', {})).toBe(2);
    expect(passwordScore('Abcdefg1', {})).toBe(3);
    expect(passwordScore('Abcdef1!', {})).toBe(4);
    expect(passwordScore('correct horse battery staple', {})).toBe(3);
    expect(passwordScore('पासवर्ड१२३४५!', {})).toBe(4);
    expect(passwordScore('anything', { score: () => 9 })).toBe(4);
    expect(passwordScore('ab', { rules: [{ label: 'a', test: (v) => v.includes('a') }, { label: 'z', test: () => false }] })).toBe(2);
  });

  @Component({
    imports: [NguForm],
    template: `<ngu-form [form]="form" submitLabel="Create" />`,
  })
  class ValidationHost3 {
    readonly form = defineForm(
      { password: '' },
      { password: { label: 'Password', type: 'password', minLength: 10, strength: { min: 3 } } },
    );
  }

  it('renders a meter, a checklist and a live text value, and enforces min', async () => {
    const fixture = TestBed.createComponent(ValidationHost3);
    const el: HTMLElement = fixture.nativeElement;
    await fixture.whenStable();
    const input = controlFor(el, 'Password');
    const strength = () => el.querySelector('.ngu-strength')!;
    expect(strength().getAttribute('data-score')).toBeNull();
    const rules = () => Array.from(strength().querySelectorAll('li')).map((li) => li.textContent!.replace(/\s+/g, ' ').trim());
    expect(rules()[0]).toBe('○ At least 10 characters, not yet');

    type(input, 'abcdefghij');
    await fixture.whenStable();
    expect(strength().getAttribute('data-score')).toBe('1');
    expect(strength().querySelector('.ngu-strength__text')?.textContent).toBe('Password strength: Weak');
    expect(strength().querySelector('.ngu-strength__text')?.getAttribute('aria-live')).toBe('polite');
    expect(rules()[0]).toBe('✓ At least 10 characters, done');
    expect(input.getAttribute('aria-describedby')).toContain(`${input.id}-strength`);
    expect(kinds(fixture.componentInstance.form.tree.password().errors())).toEqual(['weakPassword']);

    type(input, 'Abcdefghi1!');
    await fixture.whenStable();
    expect(strength().querySelector('.ngu-strength__text')?.textContent).toBe('Password strength: Strong');
    expect(fixture.componentInstance.form.tree.password().errors()).toEqual([]);
  });
});

describe('errorsOn per field', () => {
  @Component({
    imports: [NguForm],
    template: `<ngu-form [form]="form" errorsOn="submit" />`,
  })
  class ValidationHost4 {
    readonly form = defineForm(
      { quiet: '', eager: '' },
      { quiet: { label: 'Quiet', required: true }, eager: { label: 'Eager', required: true, errorsOn: 'touched' } },
    );
  }

  it('lets one field show errors sooner than the form', async () => {
    const fixture = TestBed.createComponent(ValidationHost4);
    const el: HTMLElement = fixture.nativeElement;
    await fixture.whenStable();
    for (const label of ['Quiet', 'Eager']) {
      const input = controlFor(el, label);
      input.focus();
      blur(input);
    }
    await fixture.whenStable();
    expect(controlFor(el, 'Quiet').closest('ngu-field')!.classList).not.toContain('ngu-field--invalid');
    expect(controlFor(el, 'Eager').closest('ngu-field')!.classList).toContain('ngu-field--invalid');
  });
});

describe('run-time fields', () => {
  it('run async checks with a debounce, and validate masks and date bounds', async () => {
    const calls: string[] = [];
    const fields: DynamicField[] = [
      {
        key: 'user',
        label: 'User',
        debounce: 30,
        validateAsync: async (value: string) => {
          calls.push(value);
          return value === 'taken' ? 'Already taken' : undefined;
        },
      },
      { key: 'phone', label: 'Phone', mask: '000-0000' },
      { key: 'start', label: 'Start', type: 'date', min: '2026-01-01', max: '2026-12-31' },
    ];
    const def = TestBed.runInInjectionContext(() =>
      defineForm({ extra: {} as Record<string, string> }, { extra: { fields } }),
    );
    const appRef = TestBed.inject(ApplicationRef);
    await appRef.whenStable();
    const extra = def.tree.extra as unknown as Record<string, any>;

    extra['user']().controlValue.set('tak');
    extra['user']().controlValue.set('taken');
    await new Promise((r) => setTimeout(r, 60));
    await appRef.whenStable();
    // The initial value is checked once; typing is debounced, so "tak" never reaches the server.
    expect(calls).toEqual(['', 'taken']);
    expect(messages(extra['user']().errors())).toEqual(['Already taken']);

    def.model.update((m) => ({ extra: { ...m.extra, phone: '555', start: '2025-12-31' } }));
    expect(kinds(extra['phone']().errors())).toEqual(['mask']);
    expect(kinds(extra['start']().errors())).toEqual(['minDate']);
    def.model.update((m) => ({ extra: { ...m.extra, phone: '5551234', start: '2026-06-01' } }));
    expect(extra['phone']().errors()).toEqual([]);
    expect(extra['start']().errors()).toEqual([]);
  });

  it('render the pending text of a run-time field', async () => {
    let resolve!: (v: undefined) => void;
    @Component({ imports: [NguForm], template: `<ngu-form [form]="form" />` })
    class ValidationHost5 {
      readonly fields = signal<DynamicField[]>([
        {
          key: 'code',
          label: 'Code',
          pendingText: 'Looking up…',
          validateAsync: (v: string) => (v === 'A1' ? new Promise((r) => (resolve = r)) : Promise.resolve(undefined)),
        },
      ]);
      readonly form = defineForm({ x: {} as Record<string, string> }, { x: { fields: this.fields } });
    }
    const fixture = TestBed.createComponent(ValidationHost5);
    const el: HTMLElement = fixture.nativeElement;
    await fixture.whenStable();
    type(controlFor(el, 'Code'), 'A1');
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r));
    fixture.detectChanges();
    expect(el.querySelector('.ngu-pending')?.textContent).toBe('Looking up…');
    resolve(undefined);
    await fixture.whenStable();
    expect(el.querySelector('.ngu-pending')).toBeNull();
  });
});
