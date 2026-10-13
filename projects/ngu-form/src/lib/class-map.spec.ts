import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { nguTailwind } from 'ngu-form/tailwind';
import { NguForm } from './components/ngu-form';
import { NguView } from './components/ngu-view';
import { provideNguFormConfig, type NguFormConfig } from './config';
import { defineForm } from './define';
import type { NguClassMap } from './look';
import type { FormDef } from './types';

interface RenderOptions {
  readonly config?: NguFormConfig;
  readonly classes?: NguClassMap;
  readonly summary?: boolean;
}

async function render(make: () => FormDef<any>, options: RenderOptions = {}) {
  @Component({
    imports: [NguForm],
    template: `<ngu-form [form]="form" submitLabel="Save" [classes]="classes" [errorSummary]="summary" />`,
  })
  class Host {
    readonly form = make();
    readonly classes = options.classes;
    readonly summary = options.summary ?? false;
  }
  TestBed.configureTestingModule({ providers: [provideNguFormConfig({ theme: 'none', ...options.config })] });
  const fixture = TestBed.createComponent(Host);
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const submit = async () => {
    el.querySelector<HTMLButtonElement>('.ngu-submit')!.click();
    await fixture.whenStable();
  };
  return { fixture, el, submit };
}

const field = (el: HTMLElement, path: string) => el.querySelector<HTMLElement>(`ngu-field[data-ngu-path="${path}"]`)!;
const control = (el: HTMLElement, path: string) => field(el, path).querySelector<HTMLElement>('input, select, textarea')!;

describe('class map levels', () => {
  it("adds a form's classes to the app-wide map, slot by slot", async () => {
    const { el } = await render(() => defineForm({ name: '' }, { name: 'Name' }), {
      config: { classes: { control: 'app-control', submit: 'app-submit' } },
      classes: { submit: 'form-submit', label: 'form-label' },
    });
    expect(el.querySelector('.ngu-submit')!.classList).toContain('app-submit');
    expect(el.querySelector('.ngu-submit')!.classList).toContain('form-submit');
    expect(el.querySelector('label.ngu-label')!.classList).toContain('form-label');
    expect(control(el, 'name').classList).toContain('app-control');
  });

  it("puts a field's class on its host and its classes inside that field only", async () => {
    const { el } = await render(
      () =>
        defineForm(
          { name: '', email: '' },
          { name: { label: 'Name', class: 'wide', classes: { control: 'font-mono', label: 'name-label' } }, email: 'Email' },
        ),
      { config: { classes: { field: 'app-field', control: 'app-control' } } },
    );
    const name = field(el, 'name');
    expect([...name.classList]).toEqual(expect.arrayContaining(['ngu-field', 'app-field', 'wide']));
    expect([...control(el, 'name').classList]).toEqual(expect.arrayContaining(['app-control', 'font-mono']));
    expect(name.querySelector('label')!.classList).toContain('name-label');
    expect(control(el, 'email').classList).not.toContain('font-mono');
    expect(field(el, 'email').classList).not.toContain('wide');
  });

  it("gives a group's classes to everything inside it and its class to its host", async () => {
    const { el } = await render(
      () =>
        defineForm(
          { address: { city: '' }, phone: '' },
          {
            address: { title: 'Address', class: 'card', classes: { control: 'in-address', title: 'address-title' }, fields: { city: 'City' } },
            phone: 'Phone',
          },
        ),
      { config: { classes: { group: 'app-group' } } },
    );
    const group = el.querySelector('ngu-group ngu-group')!;
    expect([...group.classList]).toEqual(expect.arrayContaining(['ngu-group', 'app-group', 'card']));
    expect(group.querySelector('.ngu-group__title')!.classList).toContain('address-title');
    expect(control(el, 'address.city').classList).toContain('in-address');
    expect(control(el, 'phone').classList).not.toContain('in-address');
  });

  it('gives a list its class and classes, and its rows read them', async () => {
    const { el } = await render(() =>
      defineForm(
        { items: [{ sku: '' }] },
        { items: { title: 'Items', item: { sku: 'SKU' }, newItem: { sku: '' }, class: 'my-list', classes: { control: 'in-list', row: 'my-row' } } },
      ),
    );
    expect(el.querySelector('ngu-array')!.classList).toContain('my-list');
    expect(el.querySelector('.ngu-array__row')!.classList).toContain('my-row');
    expect(control(el, 'items.0.sku').classList).toContain('in-list');
  });

  it('takes class and classes on run-time fields and their list', async () => {
    const { el } = await render(() =>
      defineForm(
        { extra: {} as Record<string, string> },
        {
          extra: {
            class: 'extra-list',
            classes: { label: 'extra-label' },
            fields: [{ key: 'color', label: 'Color', class: 'extra-field', classes: { control: 'extra-control' } }],
          },
        },
      ),
    );
    expect(el.querySelector('ngu-dynamic')!.classList).toContain('extra-list');
    expect(field(el, 'extra.color').classList).toContain('extra-field');
    expect(control(el, 'extra.color').classList).toContain('extra-control');
    expect(field(el, 'extra.color').querySelector('label')!.classList).toContain('extra-label');
  });

  it('styles static content with the title and description slots and its own class', async () => {
    const { el } = await render(
      () => defineForm({ name: '' }, { $intro: { text: 'Tell us about you', class: 'lead' }, $more: { heading: 'More' }, name: 'Name' }),
      { config: { classes: { title: 'tw-title', description: 'tw-description' } } },
    );
    expect([...el.querySelector('.ngu-static__text')!.classList]).toEqual(expect.arrayContaining(['tw-description', 'lead']));
    expect(el.querySelector('.ngu-static__heading')!.classList).toContain('tw-title');
  });

  it('joins the levels with mergeClasses', async () => {
    // Stands in for twMerge: a later class replaces an earlier one of the same kind.
    const mergeClasses = (...lists: string[]) => {
      const byKind = new Map<string, string>();
      for (const c of lists.join(' ').split(/\s+/).filter(Boolean)) {
        byKind.set(c.replace(/-[^-]+$/, ''), c);
      }
      return [...byKind.values()].join(' ');
    };
    const { el } = await render(
      () => defineForm({ name: '', city: '' }, { name: { label: 'Name', classes: { control: 'px-4' }, class: 'gap-3' }, city: 'City' }),
      { config: { classes: { control: 'px-3 py-2', field: 'gap-1' }, mergeClasses }, classes: { control: 'py-1' } },
    );
    const name = [...control(el, 'name').classList];
    expect(name).toEqual(expect.arrayContaining(['px-4', 'py-1']));
    expect(name).not.toContain('px-3');
    expect(name).not.toContain('py-2');
    expect(field(el, 'name').classList).toContain('gap-3');
    expect(field(el, 'name').classList).not.toContain('gap-1');
    expect([...control(el, 'city').classList]).toEqual(expect.arrayContaining(['px-3', 'py-1']));
  });
});

describe('state attributes', () => {
  it('marks fields with data attributes for utility variants', async () => {
    const { el, submit } = await render(() =>
      defineForm(
        { name: '', code: 'A1', note: 'n', email: 'a@gmial.com' },
        {
          name: { label: 'Name', required: true },
          code: { label: 'Code', disabled: true },
          note: { label: 'Note', readonly: true },
          email: { label: 'Email', warn: (v) => (v.endsWith('@gmial.com') ? 'Did you mean gmail.com?' : undefined) },
        },
      ),
    );
    const name = field(el, 'name');
    expect(name.hasAttribute('data-required')).toBe(true);
    expect(name.hasAttribute('data-invalid')).toBe(false);
    expect(field(el, 'code').hasAttribute('data-disabled')).toBe(true);
    expect(field(el, 'note').hasAttribute('data-readonly')).toBe(true);
    expect(field(el, 'note').hasAttribute('data-required')).toBe(false);

    await submit();
    expect(name.hasAttribute('data-invalid')).toBe(true);
    expect(control(el, 'name').getAttribute('aria-invalid')).toBe('true');
    expect(field(el, 'email').hasAttribute('data-warning')).toBe(true);
  });
});

describe('class map slots', () => {
  const slots: NguClassMap = {
    adorned: 's-adorned',
    affix: 's-affix',
    option: 's-option',
    chip: 's-chip',
    warning: 's-warning',
    description: 's-description',
    actions: 's-actions',
    errorSummary: 's-summary',
    tabs: 's-tabs',
    tab: 's-tab',
    panel: 's-panel',
    steps: 's-steps',
    step: 's-step',
    hint: 's-hint',
  };

  it('styles adorned controls, options, tags, warnings, descriptions, actions and the error summary', async () => {
    const { el, submit } = await render(
      () =>
        defineForm(
          { price: 0, name: '', plan: 'a', tags: ['red'], about: { bio: '' }, email: 'a@gmial.com' },
          {
            price: { label: 'Price', prefix: '$' },
            name: { label: 'Name', required: true },
            plan: { label: 'Plan', type: 'radio', options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] },
            tags: { label: 'Tags', type: 'tags' },
            about: { title: 'About', description: 'A few words', fields: { bio: { label: 'Bio', type: 'textarea', maxLength: 50, counter: true } } },
            email: { label: 'Email', warn: () => 'Check the domain' },
          },
        ),
      { config: { classes: slots }, summary: true },
    );
    const price = field(el, 'price');
    expect(price.querySelector('.ngu-control')!.classList).toContain('s-adorned');
    expect(price.querySelector('.ngu-prefix')!.classList).toContain('s-affix');
    expect(control(el, 'price').hasAttribute('data-adorned')).toBe(true);
    expect(field(el, 'name').querySelector('.ngu-control')!.classList).not.toContain('s-adorned');
    expect(control(el, 'name').hasAttribute('data-adorned')).toBe(false);

    expect(el.querySelectorAll('.ngu-choice.s-option').length).toBe(2);
    expect(el.querySelector('.ngu-tag')!.classList).toContain('s-chip');
    expect(el.querySelector('.ngu-group__description')!.classList).toContain('s-description');
    expect(el.querySelector('.ngu-counter')!.classList).toContain('s-hint');
    expect(el.querySelector('.ngu-actions')!.classList).toContain('s-actions');

    await submit();
    expect(el.querySelector('.ngu-warning')!.classList).toContain('s-warning');
    expect(el.querySelector('.ngu-error-summary')!.classList).toContain('s-summary');
  });

  it('styles tabs and the content of each tab with its group classes', async () => {
    const { el } = await render(
      () =>
        defineForm(
          { profile: { name: '' }, alerts: { email: '' } },
          {
            profile: { title: 'Profile', classes: { control: 'in-profile' }, fields: { name: 'Name' } },
            alerts: { title: 'Alerts', fields: { email: 'Email' } },
          },
          { layout: 'tabs' },
        ),
      { config: { classes: slots } },
    );
    expect(el.querySelector('[role="tablist"]')!.classList).toContain('s-tabs');
    expect(el.querySelectorAll('[role="tab"].s-tab').length).toBe(2);
    expect(el.querySelector('[role="tab"][aria-selected="true"]')!.textContent).toContain('Profile');
    expect(control(el, 'profile.name').classList).toContain('in-profile');
    expect(control(el, 'alerts.email').classList).not.toContain('in-profile');
  });

  it('styles panels and marks the open ones', async () => {
    const { el } = await render(
      () => defineForm({ a: { x: '' }, b: { y: '' } }, { a: { title: 'A', fields: { x: 'X' } }, b: { title: 'B', fields: { y: 'Y' } } }, { layout: 'accordion' }),
      { config: { classes: slots } },
    );
    const panels = Array.from(el.querySelectorAll('ngu-panel'));
    expect(panels.map((p) => p.classList.contains('s-panel'))).toEqual([true, true]);
    expect(panels.map((p) => p.hasAttribute('data-open'))).toEqual([true, false]);
  });

  it('styles the wizard step list and marks finished steps', async () => {
    const { fixture, el } = await render(
      () => defineForm({ one: { a: '' }, two: { b: '' } }, { one: { title: 'One', fields: { a: 'A' } }, two: { title: 'Two', fields: { b: 'B' } } }, { layout: 'steps' }),
      { config: { classes: slots } },
    );
    expect(el.querySelector('.ngu-steps__list')!.classList).toContain('s-steps');
    const steps = () => Array.from(el.querySelectorAll<HTMLElement>('.ngu-steps__button'));
    expect(steps().every((s) => s.classList.contains('s-step'))).toBe(true);
    expect(steps()[0].getAttribute('aria-current')).toBe('step');
    expect(steps()[0].hasAttribute('data-done')).toBe(false);

    el.querySelector<HTMLButtonElement>('.ngu-next')!.click();
    await fixture.whenStable();
    expect(steps()[0].hasAttribute('data-done')).toBe(true);
    expect(steps()[1].getAttribute('aria-current')).toBe('step');
  });
});

describe('view mode classes', () => {
  @Component({
    imports: [NguView],
    template: `<ngu-view [form]="form" [classes]="{ label: 'v-label', value: 'v-value', title: 'v-title' }" />`,
  })
  class ViewHost {
    readonly form = defineForm({ name: 'Ada', address: { city: 'Pune' } }, { name: 'Name', address: { title: 'Address', fields: { city: 'City' } } });
  }

  it('adds the label, value and title slots', async () => {
    const fixture = TestBed.createComponent(ViewHost);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.ngu-view__label')!.classList).toContain('v-label');
    expect(el.querySelector('.ngu-view__value')!.classList).toContain('v-value');
    expect(el.querySelector('.ngu-view__heading')!.classList).toContain('v-title');
  });
});

describe('nguTailwind', () => {
  it('styles a form with Tailwind utilities', async () => {
    const { el } = await render(() => defineForm({ email: '' }, { email: { label: 'Email', type: 'email' } }), {
      config: { classes: nguTailwind },
    });
    expect([...control(el, 'email').classList]).toEqual(expect.arrayContaining(['rounded-lg', 'focus:border-ngu-accent']));
    expect(el.querySelector('.ngu-submit')!.classList).toContain('bg-ngu-accent');
  });
});
