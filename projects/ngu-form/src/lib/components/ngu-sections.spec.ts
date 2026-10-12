import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { defineForm } from '../define';
import type { FormLayout } from '../types';
import { NguForm } from './ngu-form';

interface Settings {
  profile: { name: string; bio: string };
  alerts: { email: string; daily: boolean };
  advanced: { token: string };
}

const blank = (): Settings => ({ profile: { name: '', bio: '' }, alerts: { email: '', daily: false }, advanced: { token: '' } });

function settings(layout: FormLayout, extra: { readonly?: () => boolean; disabled?: () => boolean } = {}) {
  return defineForm<Settings>(
    blank(),
    {
      profile: { title: 'Profile', fields: { name: { label: 'Name', required: true }, bio: 'Bio' } },
      alerts: {
        title: 'Alerts',
        fields: { email: { label: 'Alert email', type: 'email', required: true }, daily: 'Daily digest' },
      },
      advanced: { title: 'Advanced', fields: { token: { label: 'Token', required: true } } },
    },
    { layout, ...extra },
  );
}

@Component({
  imports: [NguForm],
  template: `<ngu-form [form]="form" submitLabel="Save" [errorSummary]="summary" />`,
})
class TabsHost {
  summary = false;
  readonly form = settings('tabs');
}

@Component({
  imports: [NguForm],
  template: `<ngu-form [form]="form" submitLabel="Save" />`,
})
class AccordionHost {
  readonly form = settings('accordion');
}

@Component({
  imports: [NguForm],
  template: `<ngu-form [form]="form" submitLabel="Save" />`,
})
class OrderHost {
  readonly form = defineForm(
    { a: '', b: '', c: '', group: { x: '', y: '' } },
    {
      a: 'A',
      b: { label: 'B', order: -1 },
      c: 'C',
      $note: { text: 'Last', order: 5 },
      group: { title: 'Group', collapsed: true, order: 2, fields: { x: 'X', y: { label: 'Y', order: -1 } } },
    },
  );
}

@Component({
  imports: [NguForm],
  template: `<ngu-form [form]="form" submitLabel="Save" />`,
})
class LockHost {
  readonly locked = signal(false);
  readonly busy = signal(false);
  readonly form = defineForm(
    { name: 'Asha', rows: [{ sku: 'A' }] },
    { name: 'Name', rows: { title: 'Rows', reorder: true, newItem: { sku: '' }, item: { sku: 'SKU' } } },
    { readonly: this.locked, disabled: this.busy },
  );
}

async function render<T>(type: new () => T, setup?: (host: T) => void): Promise<{ fixture: ComponentFixture<T>; el: HTMLElement }> {
  const fixture = TestBed.createComponent(type);
  setup?.(fixture.componentInstance);
  const el = fixture.nativeElement as HTMLElement;
  document.body.appendChild(el);
  await fixture.whenStable();
  return { fixture, el };
}

const field = (el: HTMLElement, label: string) => {
  const l = Array.from(el.querySelectorAll('label')).find((x) => x.textContent?.replace('*', '').trim() === label)!;
  return el.querySelector<HTMLInputElement>(`#${l.htmlFor}`)!;
};
const submit = async (fixture: ComponentFixture<unknown>, el: HTMLElement) => {
  el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
  await fixture.whenStable();
};

describe('tabs', () => {
  afterEach(() => document.body.querySelectorAll('.ngu-form').forEach((n) => n.remove()));

  it('show each group as a tab with its panel', async () => {
    const { el } = await render(TabsHost);
    const tabs = Array.from(el.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    expect(tabs.map((t) => t.textContent?.trim())).toEqual(['Profile', 'Alerts', 'Advanced']);
    expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
    expect(tabs.map((t) => t.tabIndex)).toEqual([0, -1, -1]);
    const panel = el.querySelector(`#${tabs[0].getAttribute('aria-controls')}`)!;
    expect(panel.getAttribute('role')).toBe('tabpanel');
    expect(panel.getAttribute('aria-labelledby')).toBe(tabs[0].id);
    expect(panel.hasAttribute('hidden')).toBe(false);
    expect(el.querySelectorAll('[role="tabpanel"][hidden]').length).toBe(2);
    // The tab already names the group, so the panel repeats no title.
    expect(panel.querySelector('.ngu-group__title')).toBeNull();
  });

  it('move with the arrow keys, Home and End, selecting as they go', async () => {
    const { fixture, el } = await render(TabsHost);
    const tabs = () => Array.from(el.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    const key = async (k: string) => {
      (document.activeElement as HTMLElement).dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
      await fixture.whenStable();
    };
    tabs()[0].focus();
    await key('ArrowRight');
    expect(document.activeElement).toBe(tabs()[1]);
    expect(tabs()[1].getAttribute('aria-selected')).toBe('true');
    await key('End');
    expect(document.activeElement).toBe(tabs()[2]);
    await key('ArrowRight');
    expect(document.activeElement).toBe(tabs()[0]);
    await key('ArrowLeft');
    expect(document.activeElement).toBe(tabs()[2]);
    await key('Home');
    expect(document.activeElement).toBe(tabs()[0]);
  });

  it('count problems per tab and switch to the first tab with problems on a refused submit', async () => {
    const { fixture, el } = await render(TabsHost);
    fixture.componentInstance.form.patch({ profile: { name: 'Asha' } });
    await submit(fixture, el);
    const tabs = Array.from(el.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(tabs.map((t) => t.querySelector('.ngu-badge')?.textContent?.trim() ?? '')).toEqual([
      '',
      '11 problem',
      '11 problem',
    ]);
    expect(document.activeElement).toBe(field(el, 'Alert email'));
  });

  it('open the right tab from an error summary link', async () => {
    const { fixture, el } = await render(TabsHost, (host) => (host.summary = true));
    fixture.componentInstance.form.patch({ profile: { name: 'Asha' }, alerts: { email: 'a@x.in' } });
    await submit(fixture, el);
    const tabs = Array.from(el.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    expect(tabs[2].getAttribute('aria-selected')).toBe('true');
    tabs[0].click();
    await fixture.whenStable();
    const link = el.querySelector<HTMLAnchorElement>('.ngu-error-summary a')!;
    expect(link.textContent).toBe('Token is required');
    link.click();
    await fixture.whenStable();
    expect(tabs[2].getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(field(el, 'Token'));
  });
});

describe('accordion', () => {
  afterEach(() => document.body.querySelectorAll('.ngu-form').forEach((n) => n.remove()));

  it('makes collapsible panels, the first one open', async () => {
    const { fixture, el } = await render(AccordionHost);
    const toggles = Array.from(el.querySelectorAll<HTMLButtonElement>('.ngu-panel__toggle'));
    expect(toggles.map((t) => t.textContent?.trim())).toEqual(['Profile', 'Alerts', 'Advanced']);
    expect(toggles.map((t) => t.getAttribute('aria-expanded'))).toEqual(['true', 'false', 'false']);
    expect(toggles[0].closest('h3')).toBeTruthy();
    const region = el.querySelector(`#${toggles[1].getAttribute('aria-controls')}`)!;
    expect(region.getAttribute('role')).toBe('region');
    expect(region.hasAttribute('hidden')).toBe(true);

    toggles[1].click();
    await fixture.whenStable();
    expect(toggles[1].getAttribute('aria-expanded')).toBe('true');
    expect(region.hasAttribute('hidden')).toBe(false);
    toggles[0].click();
    await fixture.whenStable();
    expect(toggles[0].getAttribute('aria-expanded')).toBe('false');
  });

  it('opens panels with problems on a refused submit and focuses the first problem', async () => {
    const { fixture, el } = await render(AccordionHost);
    fixture.componentInstance.form.patch({ profile: { name: 'Asha' } });
    await submit(fixture, el);
    const toggles = Array.from(el.querySelectorAll<HTMLButtonElement>('.ngu-panel__toggle'));
    expect(toggles.map((t) => t.getAttribute('aria-expanded'))).toEqual(['true', 'true', 'true']);
    expect(document.activeElement).toBe(field(el, 'Alert email'));
  });

  it('closes again after a reset', async () => {
    const { fixture, el } = await render(AccordionHost);
    await submit(fixture, el);
    fixture.componentInstance.form.reset();
    await fixture.whenStable();
    const toggles = Array.from(el.querySelectorAll<HTMLButtonElement>('.ngu-panel__toggle'));
    expect(toggles.map((t) => t.getAttribute('aria-expanded'))).toEqual(['true', 'false', 'false']);
  });
});

describe('field order', () => {
  afterEach(() => document.body.querySelectorAll('.ngu-form').forEach((n) => n.remove()));

  it('renders entries by order, keeping model order for the rest', async () => {
    const { el } = await render(OrderHost);
    const root = el.querySelector('ngu-group > .ngu-grid')!;
    const names = Array.from(root.children).map(
      (c) => c.querySelector('.ngu-label, .ngu-panel__title')?.textContent?.replace('*', '').trim() ?? c.textContent?.trim(),
    );
    expect(names).toEqual(['B', 'A', 'C', 'Group', 'Last']);
    // A single group with `collapsed` is a panel too.
    expect(el.querySelector('.ngu-panel__toggle')!.getAttribute('aria-expanded')).toBe('false');
    const inner = Array.from(el.querySelectorAll('.ngu-panel__body .ngu-label')).map((l) => l.textContent?.trim());
    expect(inner).toEqual(['Y', 'X']);
  });
});

describe('whole-form readonly and disabled', () => {
  afterEach(() => document.body.querySelectorAll('.ngu-form').forEach((n) => n.remove()));

  it('locks every field, hides list editing while read-only, and blocks the submit', async () => {
    const { fixture, el } = await render(LockHost);
    const host = fixture.componentInstance;
    const submitButton = () => el.querySelector<HTMLButtonElement>('.ngu-submit')!;
    expect(field(el, 'Name').readOnly).toBe(false);
    expect(el.querySelector('.ngu-array__add')).toBeTruthy();

    host.locked.set(true);
    await fixture.whenStable();
    expect(field(el, 'Name').readOnly).toBe(true);
    expect(field(el, 'SKU').readOnly).toBe(true);
    expect(el.querySelector('.ngu-array__add')).toBeNull();
    expect(el.querySelector('.ngu-array__actions')).toBeNull();
    expect(submitButton().getAttribute('aria-disabled')).toBe('true');

    host.locked.set(false);
    host.busy.set(true);
    await fixture.whenStable();
    expect(field(el, 'Name').disabled).toBe(true);
    expect(el.querySelector<HTMLButtonElement>('.ngu-array__add')!.disabled).toBe(true);
    expect(el.querySelector<HTMLButtonElement>('.ngu-array__remove')!.disabled).toBe(true);
    expect(submitButton().getAttribute('aria-disabled')).toBe('true');
  });
});
