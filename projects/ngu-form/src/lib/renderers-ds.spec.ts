import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideNguDropdown } from 'ngu-form/dropdown';
import { provideNguMaterial } from 'ngu-form/material';
import { provideNguPrimeNG } from 'ngu-form/primeng';
import { NguForm } from './components/ngu-form';
import { defineForm } from './define';

function type(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

const OPTIONS = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
];

@Component({
  imports: [NguForm],
  template: `<ngu-form [form]="form" submitLabel="Save" (submitted)="saved = $event" />`,
})
class Host {
  saved: unknown;
  readonly form = defineForm(
    { name: '', plan: 'a', topics: [] as string[], agree: null as Date | null, size: 'a', tags: [] as string[], when: null as Date | null, code: '' },
    {
      name: { label: 'Name', required: true, hint: 'Full name' },
      plan: { label: 'Plan', type: 'select', options: OPTIONS },
      topics: { label: 'Topics', type: 'checkbox', options: OPTIONS },
      agree: { label: 'I agree', type: 'consent' },
      size: { label: 'Size', type: 'radio', options: OPTIONS },
      tags: { label: 'Tags', type: 'tags' },
      when: { label: 'When', type: 'date' },
      code: { label: 'Code', type: 'phone' },
    },
  );
}

describe('Material renderer', () => {
  async function render() {
    TestBed.configureTestingModule({ providers: [provideNguMaterial()] });
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const field = (path: string) => el.querySelector(`ngu-field[data-ngu-path="${path}"]`)!;
    return { fixture, el, field };
  }

  it('renders Material form fields with their labels and hints', async () => {
    const { field } = await render();
    expect(field('name').querySelector('mat-form-field mat-label')?.textContent).toContain('Name');
    expect(field('name').querySelector('mat-hint')?.textContent).toContain('Full name');
    // ngu-form's own <label> is gone; mat-label carries the ngu-label hook class instead.
    expect(field('name').querySelector('label.ngu-label')).toBeNull();
    expect(field('name').querySelector('mat-label.ngu-label')).not.toBeNull();
    expect(field('plan').querySelector('mat-select')).not.toBeNull();
    expect(field('size').querySelectorAll('mat-radio-button').length).toBe(2);
    expect(field('tags').querySelector('mat-chip-grid')).not.toBeNull();
    expect(field('when').querySelector('mat-datepicker-toggle')).not.toBeNull();
    // No Material version: ngu-form's own control.
    expect(field('code').querySelector('ngu-phone, .ngu-skeleton')).not.toBeNull();
  });

  it('types into the model and shows mat-error only once errors should show', async () => {
    const { fixture, el, field } = await render();
    const input = field('name').querySelector('input')!;
    expect(field('name').querySelector('mat-error')).toBeNull();
    el.querySelector<HTMLButtonElement>('.ngu-submit')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(field('name').querySelector('mat-error')?.textContent).toBeTruthy();
    expect(field('name').classList).toContain('ngu-field--invalid');
    type(input, 'Ada');
    await fixture.whenStable();
    expect(fixture.componentInstance.form.value().name).toBe('Ada');
  });

  it('keeps list order in checkbox groups and stores a time for consent', async () => {
    const { fixture, field } = await render();
    const boxes = field('topics').querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    boxes[1].click();
    boxes[0].click();
    await fixture.whenStable();
    expect(fixture.componentInstance.form.value().topics).toEqual(['a', 'b']);
    field('agree').querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.form.value().agree).toBeInstanceOf(Date);
  });

  it('stores a picked date at midnight UTC', async () => {
    const { fixture, field } = await render();
    const input = field('when').querySelector('input')!;
    input.value = '3/1/2026';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await fixture.whenStable();
    expect(fixture.componentInstance.form.value().when?.toISOString()).toBe('2026-03-01T00:00:00.000Z');
  });
});

describe('PrimeNG renderer', () => {
  async function render() {
    TestBed.configureTestingModule({ providers: [provideNguPrimeNG()] });
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const field = (path: string) => el.querySelector(`ngu-field[data-ngu-path="${path}"]`)!;
    return { fixture, el, field };
  }

  it('renders PrimeNG components with a label above', async () => {
    const { field } = await render();
    const label = field('name').querySelector<HTMLLabelElement>('label.ngu-prime-label')!;
    expect(label.textContent).toContain('Name');
    expect(field('name').querySelector(`#${label.htmlFor}`)?.hasAttribute('pinputtext')).toBe(true);
    expect(field('plan').querySelector('p-select')).not.toBeNull();
    expect(field('size').querySelectorAll('p-radiobutton').length).toBe(2);
    // p-inputtags is left out (it fails axe); the built-in tags control renders instead.
    expect(field('tags').querySelector('p-inputtags')).toBeNull();
    expect(field('tags').querySelector('.ngu-label')).not.toBeNull();
    expect(field('when').querySelector('p-datepicker')).not.toBeNull();
  });

  it('turns PrimeNG invalid on only when ngu-form shows the error', async () => {
    const { fixture, el, field } = await render();
    const input = field('name').querySelector<HTMLInputElement>('input')!;
    expect(input.classList).not.toContain('p-invalid');
    el.querySelector<HTMLButtonElement>('.ngu-submit')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(input.classList).toContain('p-invalid');
    expect(field('name').querySelector('p-message')?.textContent).toBeTruthy();
    type(input, 'Ada');
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.form.value().name).toBe('Ada');
    expect(input.classList).not.toContain('p-invalid');
  });

  it('writes checkbox groups and consent through nguBind', async () => {
    const { fixture, field } = await render();
    field('topics').querySelectorAll<HTMLInputElement>('input[type="checkbox"]')[1].click();
    await fixture.whenStable();
    expect(fixture.componentInstance.form.value().topics).toEqual(['b']);
    field('agree').querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.form.value().agree).toBeInstanceOf(Date);
  });
});

describe('dropdown type', () => {
  @Component({
    imports: [NguForm],
    template: `<ngu-form [form]="form" submitLabel="Save" />`,
  })
  class DropdownHost {
    readonly form = defineForm(
      { status: null as string | null },
      { status: { label: 'Status', type: 'dropdown', options: OPTIONS, required: true } },
    );
  }

  it('renders ngu-dropdown inside an ngu-form field and shows its error state on time', async () => {
    TestBed.configureTestingModule({ providers: [provideNguDropdown()] });
    const fixture = TestBed.createComponent(DropdownHost);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const field = el.querySelector('ngu-field')!;
    const dropdown = field.querySelector('ngu-dropdown')!;
    expect(dropdown).not.toBeNull();
    const label = field.querySelector<HTMLLabelElement>('label.ngu-label')!;
    expect(field.querySelector(`#${label.htmlFor}`)).not.toBeNull();
    expect(field.querySelector('.ngu-error')).toBeNull();
    el.querySelector<HTMLButtonElement>('.ngu-submit')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(field.querySelector('.ngu-error')).not.toBeNull();
    expect(dropdown.querySelector('[aria-invalid="true"]')).not.toBeNull();
  });
});
