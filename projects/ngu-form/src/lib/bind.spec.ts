import { ChangeDetectorRef, Component, forwardRef, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import { disabled, form } from '@angular/forms/signals';
import { NguBind } from './bind';

/** A control that only speaks ControlValueAccessor, like most design-system components. */
@Component({
  selector: 'test-counter',
  template: `<button type="button" (click)="bump()" (blur)="touched()" [disabled]="off">{{ value }}</button>`,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Counter), multi: true }],
})
class Counter implements ControlValueAccessor {
  // Like real accessors, it asks for a check when written to from outside.
  private readonly cdr = inject(ChangeDetectorRef);
  value = 0;
  off = false;
  writes = 0;
  private changed: (v: number) => void = () => undefined;
  touched: () => void = () => undefined;
  writeValue(v: number): void {
    this.value = v;
    this.writes++;
    this.cdr.markForCheck();
  }
  registerOnChange(fn: (v: number) => void): void {
    this.changed = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.touched = fn;
  }
  setDisabledState(disabled: boolean): void {
    this.off = disabled;
    this.cdr.markForCheck();
  }
  bump(): void {
    this.value++;
    this.changed(this.value);
  }
}

describe('nguBind', () => {
  @Component({
    imports: [NguBind, Counter],
    template: `
      <test-counter [nguBind]="f.count" />
      <input class="plain" [nguBind]="f.name" />
      <test-counter class="consent" [nguBind]="f.agreed" [nguBindFormat]="toCount" [nguBindParse]="toAgreed" />
    `,
  })
  class Host {
    readonly model = signal({ count: 3, name: 'Ada', agreed: false });
    readonly off = signal(false);
    readonly f = form(this.model, (p) => {
      disabled(p.count, () => this.off());
    });
    readonly toCount = (agreed: boolean) => (agreed ? 1 : 0);
    readonly toAgreed = (n: number) => n > 0;
  }

  it('writes model values to the control and control changes to the model', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const [counter] = Array.from(el.querySelectorAll('test-counter'));
    expect(counter.textContent?.trim()).toBe('3');

    counter.querySelector('button')!.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.model().count).toBe(4);
    expect(fixture.componentInstance.f.count().dirty()).toBe(true);

    fixture.componentInstance.model.update((m) => ({ ...m, count: 10 }));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(counter.textContent?.trim()).toBe('10');
  });

  it('follows the disabled state', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const button = (fixture.nativeElement as HTMLElement).querySelector('test-counter button') as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    fixture.componentInstance.off.set(true);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(button.disabled).toBe(true);
  });

  it('binds a plain input as text, and marks the field touched on blur', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input.plain')!;
    expect(input.value).toBe('Ada');
    input.value = 'Grace';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    expect(fixture.componentInstance.model().name).toBe('Grace');
    expect(fixture.componentInstance.f.name().touched()).toBe(true);
  });

  it('converts values with format and parse', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const consent = (fixture.nativeElement as HTMLElement).querySelector('test-counter.consent')!;
    expect(consent.textContent?.trim()).toBe('0');
    consent.querySelector('button')!.click();
    expect(fixture.componentInstance.model().agreed).toBe(true);
  });
});
