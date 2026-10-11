import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { disabled, form, FormField, required } from '@angular/forms/signals';
import { driver } from '../testing/helpers';
import { NguDropdown } from './dropdown';

interface Row {
  id: number;
  name: string;
}

const ROWS: Row[] = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, name: `Row ${i + 1}` }));

@Component({
  selector: 'test-reactive-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NguDropdown, ReactiveFormsModule],
  template: `
    <form [formGroup]="form">
      <ngu-dropdown [options]="rows" optionValue="id" optionLabel="name" formControlName="rowId" />
    </form>
  `,
})
class ReactiveHost {
  readonly rows = ROWS;
  readonly form = new FormBuilder().group({ rowId: [null as number | null, Validators.required] });
}

@Component({
  selector: 'test-ng-model-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NguDropdown, FormsModule],
  template: `
    <ngu-dropdown [options]="rows" optionValue="id" optionLabel="name" [(ngModel)]="picked" />
  `,
})
class NgModelHost {
  readonly rows = ROWS;
  readonly picked = signal<number | null>(null);
}

@Component({
  selector: 'test-signal-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NguDropdown, FormField],
  template: `
    <ngu-dropdown [options]="rows" optionValue="id" optionLabel="name" [formField]="f.rowId" />
  `,
})
class SignalHost {
  readonly rows = ROWS;
  readonly locked = signal(false);
  readonly model = signal({ rowId: null as number | null });
  readonly f = form(this.model, (p) => {
    required(p.rowId);
    disabled(p.rowId, () => this.locked());
  });
}

describe('NguDropdown in a reactive form', () => {
  async function mount() {
    const fixture = TestBed.createComponent(ReactiveHost);
    await fixture.whenStable();
    return { fixture, control: fixture.componentInstance.form.controls.rowId, ...driver(fixture) };
  }

  it('opens and searches without registering its search box with the parent form', async () => {
    const warnings: string[] = [];
    const warn = console.warn;
    console.warn = (...args: unknown[]) => warnings.push(String(args[0]));

    try {
      const dd = await mount();
      await dd.open();
      // Twelve options is past the threshold, so the search box renders.
      expect(dd.search()).not.toBeNull();
      await dd.type('Row 1');

      expect(Object.keys(dd.fixture.componentInstance.form.controls)).toEqual(['rowId']);

      dd.options()[0].click();
      await dd.fixture.whenStable();
      expect(dd.control.value).toBe(1);
    } finally {
      console.warn = warn;
    }

    expect(warnings.filter((w) => w.includes('NG01354'))).toEqual([]);
  });

  it('names a value the form wrote in, with the panel never opened', async () => {
    const dd = await mount();

    dd.control.setValue(3);
    await dd.fixture.whenStable();

    expect(dd.trigger().textContent).toContain('Row 3');
  });

  it('follows the control’s disabled state', async () => {
    const dd = await mount();

    dd.control.disable();
    await dd.fixture.whenStable();

    expect(dd.trigger().disabled).toBe(true);
  });

  it('shows the invalid state once the control is touched', async () => {
    const dd = await mount();
    expect(dd.root().classList).not.toContain('ngu-dropdown--invalid');

    await dd.open();
    await dd.open(); // closes, which touches
    await dd.fixture.whenStable();

    expect(dd.control.touched).toBe(true);
    expect(dd.root().classList).toContain('ngu-dropdown--invalid');
    expect(dd.trigger().getAttribute('aria-invalid')).toBe('true');
  });
});

describe('NguDropdown with ngModel', () => {
  it('writes the pick and reads a value set from outside', async () => {
    const fixture = TestBed.createComponent(NgModelHost);
    await fixture.whenStable();
    const dd = driver(fixture);

    await dd.open();
    dd.options()[1].click();
    await fixture.whenStable();
    expect(fixture.componentInstance.picked()).toBe(2);

    fixture.componentInstance.picked.set(5);
    await fixture.whenStable();
    expect(dd.trigger().textContent).toContain('Row 5');
  });
});

describe('NguDropdown with Signal Forms', () => {
  async function mount() {
    const fixture = TestBed.createComponent(SignalHost);
    await fixture.whenStable();
    return { fixture, host: fixture.componentInstance, ...driver(fixture) };
  }

  it('writes the pick into the model and shows a value the model holds', async () => {
    const dd = await mount();

    await dd.open();
    dd.options()[2].click();
    await dd.fixture.whenStable();
    expect(dd.host.model().rowId).toBe(3);

    dd.host.model.set({ rowId: 7 });
    await dd.fixture.whenStable();
    expect(dd.trigger().textContent).toContain('Row 7');
  });

  it('follows a disabled rule', async () => {
    const dd = await mount();

    dd.host.locked.set(true);
    await dd.fixture.whenStable();

    expect(dd.trigger().disabled).toBe(true);
  });

  it('shows required as invalid only after the field is touched', async () => {
    const dd = await mount();
    expect(dd.root().classList).not.toContain('ngu-dropdown--invalid');

    dd.trigger().dispatchEvent(new FocusEvent('blur'));
    await dd.fixture.whenStable();

    expect(dd.host.f.rowId().touched()).toBe(true);
    expect(dd.root().classList).toContain('ngu-dropdown--invalid');
  });
});
