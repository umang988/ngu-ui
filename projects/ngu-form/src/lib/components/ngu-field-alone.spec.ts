import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { email, form, required } from '@angular/forms/signals';
import { NguField } from './ngu-field';

describe('ngu-field on its own', () => {
  @Component({
    imports: [NguField],
    template: `
      <ngu-field [field]="f.email" [def]="{ label: 'Email', type: 'email', hint: 'We reply here' }" />
      <ngu-field [field]="f.plan" [def]="{ label: 'Plan', type: 'select', options: plans }" />
      <ngu-field [field]="f.name" [def]="{ label: 'Name', maxLength: 10 }" />
    `,
  })
  class Host {
    readonly model = signal({ email: '', plan: 'free', name: '' });
    readonly f = form(this.model, (p) => {
      required(p.email);
      email(p.email);
    });
    readonly plans = [
      { value: 'free', label: 'Free' },
      { value: 'pro', label: 'Pro' },
    ];
  }

  it('renders a hand-written Signal Forms field with its label, hint and rules', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const [mail, plan, name] = Array.from(el.querySelectorAll('ngu-field'));

    const input = mail.querySelector<HTMLInputElement>('input')!;
    expect(input.type).toBe('email');
    expect(mail.querySelector('label')!.htmlFor).toBe(input.id);
    expect(mail.querySelector('.ngu-required')).not.toBeNull();
    expect(mail.querySelector('.ngu-hint')!.textContent).toContain('We reply here');

    input.value = 'nope';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    expect(mail.querySelector('.ngu-error')?.textContent).toBeTruthy();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(fixture.componentInstance.model().email).toBe('nope');

    const options = Array.from(plan.querySelectorAll('option')).map((o) => o.textContent?.trim());
    expect(options).toEqual(['Free', 'Pro']);
    expect(name.querySelector('.ngu-counter')?.textContent).toContain('0 / 10');
  });

  it('shows errors on fields touched by code, such as a submit of the hand-written form', async () => {
    @Component({
      imports: [NguField],
      template: `<ngu-field [field]="f.email" [def]="{ label: 'Email', type: 'email', errorsOn: 'touched' }" />`,
    })
    class Touched {
      readonly f = form(signal({ email: '' }), (p) => required(p.email));
    }
    const fixture = TestBed.createComponent(Touched);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.ngu-error')).toBeNull();
    fixture.componentInstance.f().markAsTouched();
    await fixture.whenStable();
    expect(el.querySelector('.ngu-error')).not.toBeNull();
  });
});
