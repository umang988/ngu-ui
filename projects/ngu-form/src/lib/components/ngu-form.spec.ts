import { Component, input } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { defineForm } from '../define';
import { NguForm } from './ngu-form';
import type { ErrorDisplay } from './ngu-form-context';

@Component({
  imports: [NguForm],
  template: `<ngu-form [form]="form" [errorsOn]="errorsOn()" submitLabel="Save" />`,
})
class Host {
  readonly errorsOn = input<ErrorDisplay>('dirty');
  readonly form = defineForm(
    { name: '', email: '' },
    {
      name: { label: 'Name', required: true },
      email: { label: 'Email', type: 'email', required: true },
    },
  );
}

describe('NguForm error display', () => {
  let fixture: ComponentFixture<Host>;
  let el: HTMLElement;

  const messages = () => Array.from(el.querySelectorAll('.ngu-error')).map((e) => e.textContent?.trim());
  const nameInput = () => el.querySelector<HTMLInputElement>('input[type="text"]')!;

  async function setup(errorsOn: ErrorDisplay = 'dirty') {
    fixture = TestBed.createComponent(Host);
    fixture.componentRef.setInput('errorsOn', errorsOn);
    el = fixture.nativeElement;
    await fixture.whenStable();
  }

  function blur(input: HTMLInputElement) {
    input.dispatchEvent(new Event('focus'));
    input.dispatchEvent(new Event('blur'));
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
  }

  function type(input: HTMLInputElement, value: string) {
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  it('shows nothing initially', async () => {
    await setup();
    expect(messages()).toEqual([]);
  });

  it('dirty (default): stays quiet when a field is only focused and left', async () => {
    await setup();
    blur(nameInput());
    await fixture.whenStable();
    expect(messages()).toEqual([]);
  });

  it('dirty (default): shows the error after the field was edited and left', async () => {
    await setup();
    type(nameInput(), 'a');
    type(nameInput(), '');
    blur(nameInput());
    await fixture.whenStable();
    expect(messages()).toEqual(['Name is required']);
  });

  it('ignores focus and blur fired by browser autofill', async () => {
    await setup('touched');
    const input = nameInput();
    const original = input.matches.bind(input);
    const fakeAutofill = ((selector: string) =>
      selector.includes('autofill') ? true : original(selector)) as Element['matches'];
    input.matches = fakeAutofill;

    type(input, 'autofilled');
    blur(input);
    await fixture.whenStable();
    expect(messages()).toEqual([]);

    // the user now edits the field, autofill styling is gone, and leaves it
    input.matches = original;
    type(input, '');
    blur(input);
    await fixture.whenStable();
    expect(messages()).toEqual(['Name is required']);
  });

  it('touched: shows the error as soon as the field is left', async () => {
    await setup('touched');
    blur(nameInput());
    await fixture.whenStable();
    expect(messages()).toEqual(['Name is required']);
  });

  it('submit: hides errors until a submit attempt, then shows all of them', async () => {
    await setup('submit');
    type(nameInput(), 'a');
    type(nameInput(), '');
    blur(nameInput());
    await fixture.whenStable();
    expect(messages()).toEqual([]);

    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    expect(messages()).toEqual(['Name is required', 'Email is required']);
  });
});

describe('NguForm submit with async validation', () => {
  @Component({
    imports: [NguForm],
    template: `<ngu-form [form]="form" submitLabel="Save" (submitted)="sent.push($event)" (invalidSubmit)="rejected = rejected + 1" />`,
  })
  class AsyncHost {
    sent: { username: string }[] = [];
    rejected = 0;
    resolveCheck!: (msg: string | undefined) => void;
    readonly form = defineForm({ username: 'admin' }, {
      username: {
        label: 'Username',
        validateAsync: () => new Promise<string | undefined>((r) => (this.resolveCheck = r)),
      },
    });
  }

  async function submitWhilePending(result: string | undefined) {
    // A running async check is a pending task, so whenStable() would wait for it: drive CD by hand.
    const fixture = TestBed.createComponent(AsyncHost);
    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();
    const host = fixture.componentInstance;
    expect(host.form.tree().pending()).toBe(true);

    const el = fixture.nativeElement as HTMLElement;
    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();
    const button = el.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.disabled).toBe(false); // stays focusable
    // A second submit while busy is ignored.
    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();
    expect(host.sent).toEqual([]);

    host.resolveCheck(result);
    await fixture.whenStable();
    return { host, el };
  }

  it('waits for a pending check and does not submit when it fails', async () => {
    const { host, el } = await submitWhilePending('Taken');
    expect(host.sent).toEqual([]);
    expect(host.rejected).toBe(1);
    expect(el.querySelector('.ngu-error')?.textContent).toContain('Taken');
  });

  it('waits for a pending check and submits when it passes', async () => {
    const { host } = await submitWhilePending(undefined);
    expect(host.sent).toEqual([{ username: 'admin' }]);
    expect(host.rejected).toBe(0);
  });
});
