import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { defineForm } from '../define';
import type { FormDef, SubmitAction } from '../types';
import { NguForm } from './ngu-form';

function render<T>(cmp: new () => T): { fixture: ComponentFixture<T>; el: HTMLElement } {
  const fixture = TestBed.createComponent(cmp);
  return { fixture, el: fixture.nativeElement };
}

function type(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('adornments and input hints', () => {
  @Component({
    imports: [NguForm],
    template: `<ngu-form [form]="form" submitLabel="Save" />`,
  })
  class Host {
    readonly form = defineForm(
      { price: 0, weight: 0, delta: 0, ratio: 0, email: '', code: '', password: '', pin: '', bio: '', note: '' },
      {
        price: { label: 'Price', prefix: '₹', min: 0 },
        weight: { label: 'Weight', suffix: 'kg', min: 0, step: 0.5 },
        delta: { label: 'Delta' },
        ratio: { label: 'Ratio', min: 0, inputmode: 'text', enterkeyhint: 'done' },
        email: { label: 'Email', type: 'email' },
        code: { label: 'Code', maxLength: 5 },
        password: { label: 'Password', type: 'password', maxLength: 20 },
        pin: { label: 'PIN', type: 'password', reveal: false },
        bio: { label: 'Bio', type: 'textarea', maxLength: 10, rows: 2, maxRows: 6 },
        note: { label: 'Note', maxLength: 10, counter: false },
      },
    );
  }

  let el: HTMLElement;
  let fixture: ComponentFixture<Host>;
  const control = (label: string) => {
    const lbl = Array.from(el.querySelectorAll('label')).find((l) => l.textContent?.trim().startsWith(label))!;
    return el.querySelector<HTMLInputElement>(`#${lbl.htmlFor}`)!;
  };
  const fieldOf = (label: string) => control(label).closest('ngu-field')!;

  beforeEach(async () => {
    ({ fixture, el } = render(Host));
    await fixture.whenStable();
  });

  it('renders prefix and suffix text and links them to the control', () => {
    expect(fieldOf('Price').querySelector('.ngu-prefix')?.textContent?.trim()).toBe('₹');
    expect(fieldOf('Weight').querySelector('.ngu-suffix')?.textContent?.trim()).toBe('kg');
    const price = control('Price');
    expect(price.getAttribute('aria-describedby')).toContain(`${price.id}-prefix`);
    expect(fieldOf('Price').querySelector('.ngu-control--adorned')).not.toBeNull();
    expect(fieldOf('Delta').querySelector('.ngu-control--adorned')).toBeNull();
  });

  it('infers the mobile keyboard and accepts overrides', () => {
    expect(control('Price').getAttribute('inputmode')).toBe('numeric');
    expect(control('Weight').getAttribute('inputmode')).toBe('decimal');
    expect(control('Delta').getAttribute('inputmode')).toBeNull();
    expect(control('Ratio').getAttribute('inputmode')).toBe('text');
    expect(control('Ratio').getAttribute('enterkeyhint')).toBe('done');
    expect(control('Email').getAttribute('inputmode')).toBe('email');
  });

  it('counts characters on text fields with maxLength', async () => {
    const code = control('Code');
    const counter = () => fieldOf('Code').querySelector('.ngu-counter')?.textContent?.trim();
    expect(counter()).toBe('0 / 5');
    type(code, 'abc');
    await fixture.whenStable();
    expect(counter()).toBe('3 / 5');
    expect(el.querySelector(`#${code.id}-count`)?.textContent).toBe('2 characters remaining');
    expect(code.getAttribute('aria-describedby')).toContain(`${code.id}-count`);
  });

  it('counts on textareas, not on passwords or when turned off', () => {
    expect(fieldOf('Bio').querySelector('.ngu-counter')?.textContent?.trim()).toBe('0 / 10');
    expect(fieldOf('Password').querySelector('.ngu-counter')).toBeNull();
    expect(fieldOf('Note').querySelector('.ngu-counter')).toBeNull();
  });

  it('reveals the password and hides it again on submit', async () => {
    const password = control('Password');
    const button = fieldOf('Password').querySelector<HTMLButtonElement>('.ngu-reveal')!;
    expect(button.textContent?.trim()).toBe('Show');
    expect(button.getAttribute('aria-label')).toBe('Show password');
    expect(button.getAttribute('aria-controls')).toBe(password.id);

    button.click();
    await fixture.whenStable();
    expect(password.type).toBe('text');
    expect(button.getAttribute('aria-label')).toBe('Hide password');
    expect(fieldOf('Password').querySelector('[aria-live]')?.textContent).toBe('Your password is visible');

    el.querySelector<HTMLButtonElement>('.ngu-submit')!.click();
    await fixture.whenStable();
    expect(password.type).toBe('password');
  });

  it('leaves out the reveal button when asked', () => {
    expect(fieldOf('PIN').querySelector('.ngu-reveal')).toBeNull();
  });

  it('sets textarea rows', () => {
    const bio = control('Bio') as unknown as HTMLTextAreaElement;
    expect(bio.getAttribute('rows')).toBe('2');
    expect(bio.classList).toContain('ngu-autosize');
  });
});

describe('static content', () => {
  @Component({
    imports: [NguForm],
    template: `<ngu-form [form]="form" />`,
  })
  class Host {
    readonly form = defineForm(
      { plan: 'free', company: '', items: [{ sku: '' }] },
      {
        $intro: { heading: 'Your plan', level: 2 },
        plan: 'Plan',
        $pro: { text: 'Pro plans include invoices.', hidden: (m) => m.plan !== 'pro' },
        $line: { divider: true },
        company: 'Company',
        items: { newItem: { sku: '' }, item: { $hint: { text: 'One SKU per row' }, sku: 'SKU' } },
      },
      { cols: 2 },
    );
  }

  it('renders headings, text and dividers in spec order across the whole row', async () => {
    const { fixture, el } = render(Host);
    await fixture.whenStable();
    const grid = el.querySelector('.ngu-grid')!;
    const kinds = Array.from(grid.children).map((c) => c.tagName.toLowerCase());
    expect(kinds).toEqual(['h2', 'ngu-field', 'hr', 'ngu-field', 'ngu-array']);
    expect(grid.querySelector('h2')?.textContent).toBe('Your plan');
    expect((grid.querySelector('h2') as HTMLElement).style.gridColumn).toBe('1 / -1');
    expect(el.querySelector('ngu-array .ngu-static__text')?.textContent).toBe('One SKU per row');
  });

  it('hides static content with a function of the model', async () => {
    const { fixture, el } = render(Host);
    await fixture.whenStable();
    expect(el.textContent).not.toContain('Pro plans include invoices.');
    fixture.componentInstance.form.patch({ plan: 'pro' });
    await fixture.whenStable();
    expect(el.textContent).toContain('Pro plans include invoices.');
  });
});

describe('responsive columns', () => {
  class FakeResizeObserver {
    static last: FakeResizeObserver | undefined;
    constructor(private readonly callback: (entries: { contentRect: { width: number } }[]) => void) {
      FakeResizeObserver.last = this;
    }
    observe(): void {}
    disconnect(): void {}
    resize(width: number): void {
      this.callback([{ contentRect: { width } }]);
    }
  }

  @Component({
    imports: [NguForm],
    template: `<ngu-form [form]="form" />`,
  })
  class Host {
    readonly form = defineForm(
      { a: '', b: '', c: '', address: { city: '', zip: '' } },
      {
        a: { label: 'A', span: 3 },
        b: 'B',
        c: 'C',
        address: { cols: { base: 1, md: 2 }, fields: { city: 'City', zip: 'ZIP' } },
      },
      { cols: 3 },
    );
  }

  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('follows the form width and caps spans at the column count', async () => {
    const { fixture, el } = render(Host);
    await fixture.whenStable();
    const root = el.querySelector<HTMLElement>('ngu-group')!;
    const address = root.querySelector<HTMLElement>('ngu-group')!;
    const fieldA = root.querySelector<HTMLElement>('ngu-field')!;

    FakeResizeObserver.last!.resize(800);
    await fixture.whenStable();
    expect(root.style.getPropertyValue('--ngu-cols')).toBe('3');
    expect(address.style.getPropertyValue('--ngu-cols')).toBe('2');
    expect(fieldA.style.gridColumn).toBe('span 3');

    FakeResizeObserver.last!.resize(600);
    await fixture.whenStable();
    expect(root.style.getPropertyValue('--ngu-cols')).toBe('3');
    expect(address.style.getPropertyValue('--ngu-cols')).toBe('1');

    FakeResizeObserver.last!.resize(400);
    await fixture.whenStable();
    expect(root.style.getPropertyValue('--ngu-cols')).toBe('1');
    expect(fieldA.style.gridColumn).toBe('');
  });
});

describe('change hooks', () => {
  interface Checkout {
    billing: { city: string; zip: string };
    sameAsBilling: boolean;
    shipping: { city: string; zip: string };
    a: string;
    b: string;
  }

  @Component({
    imports: [NguForm],
    template: `<ngu-form [form]="form" />`,
  })
  class Host {
    readonly calls = signal<string[]>([]);
    readonly form: FormDef<Checkout> = defineForm<Checkout>(
      { billing: { city: 'Pune', zip: '411001' }, sameAsBilling: false, shipping: { city: '', zip: '' }, a: '', b: '' },
      {
        billing: { city: 'Billing city', zip: 'Billing ZIP' },
        sameAsBilling: {
          label: 'Ship to the billing address',
          onChange: (same, { model, patch }) => {
            this.calls.update((c) => [...c, `same:${same}`]);
            if (same) {
              patch({ shipping: { ...model.billing } });
            }
          },
        },
        shipping: { city: 'Shipping city', zip: 'Shipping ZIP' },
        a: { label: 'A', onChange: (v, { patch }) => (this.calls.update((c) => [...c, `a:${v}`]), patch({ b: v + '!' })) },
        b: { label: 'B', onChange: (v, { patch }) => (this.calls.update((c) => [...c, `b:${v}`]), patch({ a: v + '?' })) },
      },
    );
  }

  let fixture: ComponentFixture<Host>;
  let el: HTMLElement;
  const inputFor = (label: string) => {
    const lbl = Array.from(el.querySelectorAll('label')).find((l) => l.textContent?.trim().startsWith(label))!;
    return el.querySelector<HTMLInputElement>(`#${lbl.htmlFor}`)!;
  };

  beforeEach(async () => {
    ({ fixture, el } = render(Host));
    await fixture.whenStable();
  });

  it('runs after the user changes the field', async () => {
    inputFor('Ship to the billing address').click();
    await fixture.whenStable();
    const host = fixture.componentInstance;
    expect(host.calls()).toEqual(['same:true']);
    expect(host.form.value().shipping).toEqual({ city: 'Pune', zip: '411001' });
    expect(inputFor('Shipping city').value).toBe('Pune');
  });

  it('does not run for changes made in code', async () => {
    const host = fixture.componentInstance;
    host.form.patch({ sameAsBilling: true });
    await fixture.whenStable();
    host.form.reset();
    await fixture.whenStable();
    expect(host.calls()).toEqual([]);
  });

  it('never loops: writes from one hook do not trigger another', async () => {
    type(inputFor('A'), 'x');
    await fixture.whenStable();
    const host = fixture.componentInstance;
    expect(host.calls()).toEqual(['a:x']);
    expect(host.form.value().b).toBe('x!');
    expect(host.form.value().a).toBe('x');
  });
});

describe('payload, saved state and submit', () => {
  interface Signup {
    first: string;
    last: string;
    plan: 'free' | 'pro';
    company: string;
  }
  interface Request {
    name: string;
    company?: string;
  }

  @Component({
    imports: [NguForm],
    template: `<ngu-form [form]="form" [action]="action" submitLabel="Save" (submitted)="emitted.set($event)" />`,
  })
  class Host {
    readonly received = signal<Request | undefined>(undefined);
    readonly emitted = signal<Request | undefined>(undefined);
    readonly form = defineForm<Signup, Request>(
      { first: 'Asha', last: 'Rao', plan: 'free', company: 'Acme' },
      { first: 'First', last: 'Last', plan: 'Plan', company: { label: 'Company', hidden: (m) => m.plan !== 'pro' } },
      { omitHidden: true, mapValue: (m) => ({ name: `${m.first} ${m.last}`, company: m.company }) },
    );
    readonly action: SubmitAction<Signup, Request> = async (value) => {
      this.received.set(value);
      return undefined;
    };
  }

  it('sends the mapped payload and marks the form saved', async () => {
    const { fixture, el } = render(Host);
    await fixture.whenStable();
    const host = fixture.componentInstance;
    const first = el.querySelector<HTMLInputElement>('input')!;
    type(first, 'Ash');
    await fixture.whenStable();
    expect(host.form.dirty()).toBe(true);
    expect(host.form.changes()).toEqual({ first: 'Ash' });

    el.querySelector<HTMLButtonElement>('.ngu-submit')!.click();
    await fixture.whenStable();
    expect(host.received()).toEqual({ name: 'Ash Rao', company: undefined });
    expect(host.emitted()).toEqual(host.received());
    expect(host.form.dirty()).toBe(false);
    expect(host.form.changes()).toEqual({});
  });
});
