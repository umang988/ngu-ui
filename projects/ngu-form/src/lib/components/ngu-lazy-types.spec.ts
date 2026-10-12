import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormField, type Field } from '@angular/forms/signals';
import { defineForm } from '../define';
import { provideNguFieldTypes } from '../field-types';
import { NguForm } from './ngu-form';

declare module '../types' {
  interface NguFieldTypeMap {
    lazyText: string;
    lazyDefault: string;
  }
}

@Component({
  selector: 'test-lazy-text',
  imports: [FormField],
  template: `<input class="lazy" [id]="id()" [formField]="field()" />`,
})
class LazyText {
  readonly field = input.required<Field<string>>();
  readonly id = input<string>();
}

describe('lazy custom types', () => {
  let resolveLoad: () => void = () => undefined;
  let calls = 0;
  const loader = () => {
    calls++;
    return new Promise<typeof LazyText>((resolve) => (resolveLoad = () => resolve(LazyText)));
  };

  @Component({
    imports: [NguForm],
    template: `<ngu-form [form]="form" />`,
  })
  class Host {
    readonly form = defineForm(
      { a: 'one', b: 'two', c: 'three' },
      {
        a: { label: 'A', type: 'lazyText' },
        b: { label: 'B', type: 'lazyText' },
        c: { label: 'C', type: 'lazyDefault' },
      },
    );
  }

  beforeEach(() => {
    calls = 0;
    TestBed.configureTestingModule({
      providers: [
        provideNguFieldTypes({
          lazyText: loader,
          lazyDefault: () => Promise.resolve({ default: LazyText }),
        }),
      ],
    });
  });

  it('shows a labelled placeholder, then the renderer once it loads; the loader runs once', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const fields = el.querySelectorAll('ngu-field');
    expect(fields[0].querySelector('.ngu-skeleton')).not.toBeNull();
    expect(fields[0].querySelector('label')?.textContent?.trim()).toBe('A');
    expect(el.querySelector('input.lazy')).toBeNull();
    expect(calls).toBe(1);

    resolveLoad();
    await fixture.whenStable();
    const inputs = el.querySelectorAll<HTMLInputElement>('input.lazy');
    expect(inputs.length).toBe(3);
    expect(inputs[0].value).toBe('one');
    expect(el.querySelector('.ngu-skeleton')).toBeNull();
    expect(calls).toBe(1);
  });

  it('renders at once in later forms, and accepts a module with a default export', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('input.lazy').length).toBe(3);
    expect(calls).toBe(0);
  });
});
