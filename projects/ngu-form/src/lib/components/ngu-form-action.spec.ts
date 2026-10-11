import { Component, ErrorHandler, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { defineForm } from '../define';
import type { SubmitAction, SubmitResult } from '../types';
import { NguForm } from './ngu-form';

interface Signup {
  email: string;
  items: { sku: string }[];
}

@Component({
  imports: [NguForm],
  template: `<ngu-form
    [form]="form"
    [action]="action"
    submitLabel="Save"
    (submitted)="sent.push($event)"
    (invalidSubmit)="refused = refused + 1"
  />`,
})
class Host {
  readonly result = signal<SubmitResult<Signup> | Error>(undefined);
  sent: Signup[] = [];
  refused = 0;
  readonly form = defineForm<Signup>({ email: 'a@b.co', items: [{ sku: 'A' }] }, {
    email: { label: 'Email', type: 'email' },
    items: { newItem: { sku: '' }, item: { sku: 'SKU' } },
  });
  readonly action: SubmitAction<Signup> = async () => {
    const r = this.result();
    if (r instanceof Error) {
      throw r;
    }
    return r;
  };
}

describe('NguForm action', () => {
  const handled: unknown[] = [];

  beforeEach(() => {
    handled.length = 0;
    TestBed.configureTestingModule({
      providers: [{ provide: ErrorHandler, useValue: { handleError: (e: unknown) => handled.push(e) } }],
    });
  });

  async function submitWith(result: SubmitResult<Signup> | Error) {
    const fixture = TestBed.createComponent(Host);
    const host = fixture.componentInstance;
    host.result.set(result);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    const text = (sel: string) => Array.from(el.querySelectorAll(sel)).map((e) => e.textContent?.trim());
    return { fixture, host, el, text };
  }

  it('emits submitted when the action returns nothing', async () => {
    const { host, text } = await submitWith(undefined);
    // Angular tags array items with a symbol key for identity tracking; compare the JSON payload.
    expect(JSON.parse(JSON.stringify(host.sent))).toEqual([{ email: 'a@b.co', items: [{ sku: 'A' }] }]);
    expect(host.refused).toBe(0);
    expect(text('.ngu-error, .ngu-form-error')).toEqual([]);
  });

  it('shows errors by field path, including array items, and refuses the submit', async () => {
    const { host, text } = await submitWith({ email: 'Already registered', 'items.0.sku': 'Unknown SKU' });
    expect(host.sent).toEqual([]);
    expect(host.refused).toBe(1);
    expect(text('.ngu-error')).toEqual(['Already registered', 'Unknown SKU']);
  });

  it('clears a server error once its field changes', async () => {
    const { fixture, host, text } = await submitWith({ email: 'Already registered' });
    expect(text('.ngu-error')).toEqual(['Already registered']);
    host.form.patch({ email: 'new@b.co' });
    await fixture.whenStable();
    expect(text('.ngu-error')).toEqual([]);
  });

  it('shows a string or $form result as a form-level error', async () => {
    const busy = await submitWith('Server is busy');
    expect(busy.text('.ngu-form-error')).toEqual(['Server is busy']);
    expect(busy.text('.ngu-error')).toEqual([]);
    expect((await submitWith({ $form: 'Try later' })).text('.ngu-form-error')).toEqual(['Try later']);
  });

  it('reports a thrown error and shows the failure text', async () => {
    const boom = new Error('network down');
    const { host, text } = await submitWith(boom);
    expect(handled).toEqual([boom]);
    expect(host.sent).toEqual([]);
    expect(text('.ngu-form-error')).toEqual(['Something went wrong. Please try again.']);
  });

  it('falls back to a form-level error for an unknown path', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { text } = await submitWith({ 'nope.field': 'Lost?' } as SubmitResult<Signup>);
    expect(text('.ngu-form-error')).toEqual(['Lost?']);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('hides all errors again after reset', async () => {
    const { fixture, host, text } = await submitWith({ email: 'Already registered', $form: 'Nope' });
    expect(text('.ngu-error, .ngu-form-error').length).toBe(2);
    host.form.reset();
    await fixture.whenStable();
    expect(text('.ngu-error, .ngu-form-error')).toEqual([]);
  });
});
