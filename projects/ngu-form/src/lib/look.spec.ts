import { Component, signal, type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NguFileInput, NguImageCropper, NguSignaturePad } from 'ngu-form/upload';
import { NguArray } from './components/ngu-array';
import { NguArrayTable } from './components/ngu-array-table';
import { NguDynamic } from './components/ngu-dynamic';
import { NguField } from './components/ngu-field';
import { NguForm } from './components/ngu-form';
import { NguGroup } from './components/ngu-group';
import { NguPanel, NguTabs } from './components/ngu-sections';
import { NguStrength } from './components/ngu-strength';
import { NguView, NguViewList, NguViewRows } from './components/ngu-view';
import { NguWizard } from './components/ngu-wizard';
import { provideNguFormConfig } from './config';
import { NguCaptcha } from './controls/captcha';
import { NguChoices } from './controls/choices';
import { NguColor } from './controls/color';
import { NguDateRange } from './controls/date-range';
import { NguOtp } from './controls/otp';
import { NguPhone } from './controls/phone';
import { NguRange } from './controls/range';
import { NguRating } from './controls/rating';
import { NguTags } from './controls/tags';
import { defineForm } from './define';
import type { NguClassMap, NguDensity, NguSize, NguTheme } from './look';
import { NGU_INTERNAL_PROPERTIES, NGU_TOKENS } from './tokens';

const STYLED: readonly Type<unknown>[] = [
  NguForm,
  NguField,
  NguGroup,
  NguArray,
  NguArrayTable,
  NguDynamic,
  NguView,
  NguViewList,
  NguViewRows,
  NguWizard,
  NguTabs,
  NguPanel,
  NguStrength,
  NguCaptcha,
  NguChoices,
  NguColor,
  NguDateRange,
  NguOtp,
  NguPhone,
  NguRange,
  NguRating,
  NguTags,
  NguFileInput,
  NguImageCropper,
  NguSignaturePad,
];

/** The compiled styles of a component, its view-mode children included. */
function stylesOf(cmp: Type<unknown>): string {
  const def = (cmp as unknown as { ɵcmp: { styles: string[] } }).ɵcmp;
  // Angular writes custom properties as `--%NS%name` and fills in a namespace at run time.
  return def.styles.join('\n').replaceAll('%NS%', '');
}

describe('design tokens', () => {
  const css = STYLED.map(stylesOf).join('\n');
  const used = new Set(Array.from(css.matchAll(/var\((--ngu-[a-z-]+)/g), (m) => m[1]));

  it('lists every custom property the default theme reads', () => {
    const listed = new Set<string>([...NGU_TOKENS.map((t) => t.name), ...NGU_INTERNAL_PROPERTIES]);
    expect([...used].filter((name) => !listed.has(name))).toEqual([]);
  });

  it('lists no property the theme has stopped reading', () => {
    expect(NGU_TOKENS.map((t) => t.name).filter((name) => !used.has(name))).toEqual([]);
  });

  it('lets density and size change only the defaults of the scaled tokens', () => {
    for (const token of NGU_TOKENS.filter((t) => t.scaled)) {
      const name = token.name.slice('--ngu-'.length);
      const plain = new RegExp(`var\\(--ngu-${name}, (?!var\\(--_ngu-${name}[,)])`);
      expect(plain.test(css), token.name).toBe(false);
    }
  });

  it('guards every visual rule, so theme none drops it', () => {
    // Rules that stay on in unstyled forms: screen-reader text and the mechanics of overlays and lists.
    for (const cmp of STYLED) {
      const rules = stylesOf(cmp)
        .replace(/@keyframes[^{]*\{(?:[^{}]*\{[^}]*\})*[^}]*\}/g, '')
        .match(/[^{}@]+\{[^{}]*\}/g) ?? [];
      for (const rule of rules) {
        const selector = rule.slice(0, rule.indexOf('{')).trim();
        if (/ngu-unstyled|ngu-sr-only|ngu-form--|ngu-field--compact/.test(selector)) {
          continue;
        }
        // The one-time code's real input lies invisible over the boxes; that stays in unstyled forms.
        if (cmp === NguOtp && /^input/.test(selector)) {
          continue;
        }
        const body = rule.slice(rule.indexOf('{') + 1);
        const props = Array.from(body.matchAll(/([a-z-]+)\s*:/g), (m) => m[1]);
        const visual = props.filter((p) => /^(color|background|border|padding|font|margin|gap|outline|box-shadow|border-radius)/.test(p));
        expect(visual, `${cmp.name}: ${selector}`).toEqual([]);
      }
    }
  });
});

describe('theme none and the class map', () => {
  @Component({
    imports: [NguForm],
    template: `<ngu-form [form]="form" submitLabel="Save" [theme]="theme()" [density]="density()" [size]="size()" />`,
  })
  class Host {
    readonly theme = signal<NguTheme | undefined>('none');
    readonly density = signal<NguDensity | undefined>(undefined);
    readonly size = signal<NguSize | undefined>(undefined);
    readonly form = defineForm(
      {
        name: '',
        agree: false,
        plan: 'a',
        address: { city: '' },
        items: [{ sku: '' }],
      },
      {
        name: { label: 'Name', required: true, hint: 'As on your card' },
        agree: { label: 'I agree', type: 'switch' },
        plan: {
          label: 'Plan',
          type: 'radio',
          options: [
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
          ],
        },
        address: { title: 'Address', fields: { city: 'City' } },
        items: { title: 'Items', item: { sku: 'SKU' }, newItem: { sku: '' } },
      },
    );
  }

  const classes: NguClassMap = {
    form: 'tw-form',
    field: 'tw-field',
    label: 'tw-label',
    control: 'tw-control',
    check: 'tw-check',
    hint: 'tw-hint',
    error: 'tw-error',
    group: 'tw-group',
    title: 'tw-title',
    list: 'tw-list',
    row: 'tw-row',
    button: 'tw-button',
    submit: 'tw-submit',
  };

  async function render(config?: Parameters<typeof provideNguFormConfig>[0]) {
    TestBed.configureTestingModule({ providers: config ? [provideNguFormConfig(config)] : [] });
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('marks every ngu-form component in the form as unstyled', async () => {
    const { el } = await render();
    const hosts = Array.from(el.querySelectorAll<HTMLElement>('*')).filter((e) => /^NGU-/.test(e.tagName));
    expect(hosts.length).toBeGreaterThan(5);
    expect(hosts.filter((h) => !h.classList.contains('ngu-unstyled')).map((h) => h.tagName)).toEqual([]);
  });

  it('keeps the default look unless asked', async () => {
    const { fixture, el } = await render();
    fixture.componentInstance.theme.set(undefined);
    await fixture.whenStable();
    expect(el.querySelectorAll('.ngu-unstyled').length).toBe(0);
  });

  it('takes the theme from provideNguFormConfig, and the input wins', async () => {
    const { fixture, el } = await render({ theme: 'none' });
    fixture.componentInstance.theme.set(undefined);
    await fixture.whenStable();
    expect(el.querySelector('ngu-form')!.classList).toContain('ngu-unstyled');
    fixture.componentInstance.theme.set('default');
    await fixture.whenStable();
    expect(el.querySelector('ngu-form')!.classList).not.toContain('ngu-unstyled');
  });

  it('adds the class map next to the built-in classes', async () => {
    const { fixture, el } = await render({ classes });
    expect(el.querySelector('form')!.classList).toContain('tw-form');
    const name = el.querySelector<HTMLInputElement>('input[type="text"]')!;
    expect(name.classList).toContain('tw-control');
    const field = name.closest('ngu-field')!;
    expect(field.classList).toContain('tw-field');
    expect(field.classList).toContain('ngu-field');
    expect(field.querySelector('label')!.classList).toEqual(expect.objectContaining({}));
    expect(field.querySelector('label.ngu-label')!.classList).toContain('tw-label');
    expect(field.querySelector('.ngu-hint')!.classList).toContain('tw-hint');
    expect(el.querySelector('input[role="switch"]')!.classList).toContain('tw-check');
    expect(el.querySelector('input[type="radio"]')!.classList).toContain('tw-check');
    expect(el.querySelector('ngu-group ngu-group')!.classList).toContain('tw-group');
    expect(el.querySelector('.ngu-group__title')!.classList).toContain('tw-title');
    expect(el.querySelector('ngu-array')!.classList).toContain('tw-list');
    expect(el.querySelector('.ngu-array__title')!.classList).toContain('tw-title');
    expect(el.querySelector('.ngu-array__row')!.classList).toContain('tw-row');
    expect(el.querySelector('.ngu-array__add')!.classList).toContain('tw-button');
    expect(el.querySelector('.ngu-array__remove')!.classList).toContain('tw-button');
    expect(el.querySelector('.ngu-submit')!.classList).toContain('tw-submit');

    el.querySelector<HTMLButtonElement>('.ngu-submit')!.click();
    await fixture.whenStable();
    expect(el.querySelector('ngu-field .ngu-error')!.classList).toContain('tw-error');
  });

  it('sets density and size classes from the inputs or the config', async () => {
    const { fixture, el } = await render({ density: 'compact', size: 'lg' });
    fixture.componentInstance.theme.set(undefined);
    await fixture.whenStable();
    const host = el.querySelector('ngu-form')!;
    expect(host.classList).toContain('ngu-form--compact');
    expect(host.classList).toContain('ngu-form--lg');
    fixture.componentInstance.density.set('spacious');
    fixture.componentInstance.size.set('sm');
    await fixture.whenStable();
    expect(host.classList).toContain('ngu-form--spacious');
    expect(host.classList).toContain('ngu-form--sm');
    expect(host.classList).not.toContain('ngu-form--compact');
  });
});

describe('ngu-view theme', () => {
  @Component({
    imports: [NguView],
    template: `<ngu-view [form]="form" theme="none" />`,
  })
  class ViewHost {
    readonly form = defineForm({ name: 'Ada' }, { name: 'Name' });
  }

  it('drops the CSS of a view on its own', async () => {
    const fixture = TestBed.createComponent(ViewHost);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('ngu-view')!.classList).toContain('ngu-unstyled');
    expect(el.querySelector('ngu-view-list')!.classList).toContain('ngu-unstyled');
  });
});
