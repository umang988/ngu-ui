import { Component, computed, LOCALE_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NguForm } from './components/ngu-form';
import { defineForm } from './define';
import { createNguI18n, formatMessage, provideNguMessages } from './messages';
import type { LeafDef } from './types';

describe('formatMessage', () => {
  it('fills placeholders and leaves unknown ones visible', () => {
    expect(formatMessage('{label} is required', { label: 'Email' })).toBe('Email is required');
    expect(formatMessage('{label} and {missing}', { label: 'A' })).toBe('A and {missing}');
  });

  it('picks plural forms with the locale rules, exact matches first', () => {
    const t = '{n, plural, =0 {none} one {# entry} other {# entries}}';
    expect(formatMessage(t, { n: 0 })).toBe('none');
    expect(formatMessage(t, { n: 1 })).toBe('1 entry');
    expect(formatMessage(t, { n: 5 })).toBe('5 entries');
    // Arabic has dual, few and many forms.
    const ar = '{n, plural, one {حقل واحد} two {حقلان} few {# حقول} many {# حقلًا} other {# حقل}}';
    expect(formatMessage(ar, { n: 2 }, 'ar')).toBe('حقلان');
    expect(formatMessage(ar, { n: 3 }, 'ar-u-nu-latn')).toBe('3 حقول');
    expect(formatMessage(ar, { n: 11 }, 'ar-u-nu-latn')).toBe('11 حقلًا');
  });

  it('nests placeholders inside branches and supports select', () => {
    expect(formatMessage('{n, plural, one {{label}: # item} other {{label}: # items}}', { n: 2, label: 'Cart' })).toBe(
      'Cart: 2 items',
    );
    expect(formatMessage('{s, select, 0 {Too weak} other {Strong}}', { s: 0 })).toBe('Too weak');
    expect(formatMessage('{s, select, 0 {Too weak} other {Strong}}', { s: 4 })).toBe('Strong');
  });

  it('formats numbers and dates for the locale, grouping from five digits', () => {
    expect(formatMessage('{n}', { n: 2026 })).toBe('2026');
    expect(formatMessage('{n}', { n: 1234567 })).toBe('1,234,567');
    expect(formatMessage('{n}', { n: 1234567 }, 'de')).toBe('1.234.567');
    expect(formatMessage('{n}', { n: 1234567 }, 'hi')).toBe('12,34,567');
    expect(formatMessage('{d}', { d: new Date('2026-01-31') })).toBe('Jan 31, 2026');
  });
});

describe('NguI18n', () => {
  const leaf = (label?: string, extra: Partial<LeafDef> = {}): LeafDef => ({ __ngu: 'leaf', type: 'text', label, ...extra });

  it('uses English defaults with the error parameters', () => {
    const i18n = createNguI18n();
    expect(i18n.error({ kind: 'required' }, leaf('Name'))).toBe('Name is required');
    expect(i18n.error({ kind: 'minLength', minLength: 1 } as never, leaf('Code'))).toBe('Code must be at least 1 character');
    expect(i18n.error({ kind: 'minLength', minLength: 3 } as never, leaf('Code'))).toBe('Code must be at least 3 characters');
    expect(i18n.error({ kind: 'max' }, leaf(undefined, { max: 10 }))).toBe('This field must be at most 10');
    expect(i18n.message('invalidSubmit', { count: 1 })).toBe('1 field needs attention.');
  });

  it('lets templates and functions override defaults, later configs winning', () => {
    const i18n = createNguI18n([
      { required: '{label} is mandatory', add: 'Add one' },
      { add: 'Add another', minItems: ({ min }) => `At least ${min}` },
    ]);
    expect(i18n.error({ kind: 'required' }, leaf('Name'))).toBe('Name is mandatory');
    expect(i18n.message('add')).toBe('Add another');
    expect(i18n.message('minItems', { label: 'x', min: 2 })).toBe('At least 2');
  });

  it('resolves app strings and built-in keys through translate, falling back when missing', () => {
    const dict: Record<string, string> = {
      'signup.email': 'ईमेल',
      'ngu.required': '{label} आवश्यक है',
      'errors.taken': 'यह नाम लिया जा चुका है',
    };
    const i18n = createNguI18n([{ translate: (key) => dict[key] ?? key }]);
    expect(i18n.text('signup.email')).toBe('ईमेल');
    expect(i18n.text('Plain label')).toBe('Plain label');
    expect(i18n.error({ kind: 'required' }, leaf('signup.email'))).toBe('ईमेल आवश्यक है');
    expect(i18n.error({ kind: 'custom', message: 'errors.taken' }, leaf('x'))).toBe('यह नाम लिया जा चुका है');
    expect(i18n.message('add')).toBe('Add');
  });

  it('passes the parameters to translate, for libraries that interpolate themselves', () => {
    const seen: unknown[] = [];
    const i18n = createNguI18n([
      { translate: (key, params) => (key === 'ngu.minLength' ? (seen.push(params), 'translated') : undefined) },
    ]);
    expect(i18n.error({ kind: 'minLength', minLength: 4 } as never, leaf('Code'))).toBe('translated');
    expect(seen).toEqual([{ label: 'Code', minLength: 4 }]);
  });

  it('follows a signal config, including the locale', () => {
    const lang = signal<'en' | 'ar'>('en');
    const config = computed(() => (lang() === 'en' ? {} : { locale: 'ar', add: 'إضافة' }));
    const i18n = createNguI18n([config]);
    expect(i18n.message('add')).toBe('Add');
    expect(i18n.locale()).toBe('en-US');
    lang.set('ar');
    expect(i18n.message('add')).toBe('إضافة');
    expect(i18n.locale()).toBe('ar');
  });
});

describe('translated rendering', () => {
  const lang = signal<'en' | 'hi'>('en');
  const HI: Record<string, string> = {
    'f.name': 'नाम',
    'f.tags': 'टैग',
    'ngu.required': '{label} आवश्यक है',
    'ngu.add': 'जोड़ें',
    'ngu.remove': 'हटाएँ',
    'ngu.invalidSubmit': '{count} फ़ील्ड पर ध्यान दें।',
    Save: 'सहेजें',
  };
  const EN: Record<string, string> = { 'f.name': 'Name', 'f.tags': 'Tags' };

  @Component({
    imports: [NguForm],
    providers: [
      provideNguMessages(() =>
        computed(() => ({
          locale: lang(),
          translate: (key: string) => (lang() === 'hi' ? HI : EN)[key],
        })),
      ),
    ],
    template: `<ngu-form [form]="form" submitLabel="Save" />`,
  })
  class MessagesHost1 {
    readonly form = defineForm(
      { name: '', tags: ['a'] },
      {
        name: { label: 'f.name', required: true },
        tags: { title: 'f.tags', item: 'f.tags', newItem: '' },
      },
    );
  }

  beforeEach(() => lang.set('en'));

  it('renders labels, buttons and messages in the active language and switches live', async () => {
    const fixture = TestBed.createComponent(MessagesHost1);
    const el: HTMLElement = fixture.nativeElement;
    await fixture.whenStable();
    expect(el.querySelector('label')?.textContent).toContain('Name');
    expect(el.querySelector('.ngu-array__add')?.textContent?.trim()).toBe('Add');

    lang.set('hi');
    await fixture.whenStable();
    expect(el.querySelector('label')?.textContent).toContain('नाम');
    expect(el.querySelector('.ngu-array__add')?.textContent?.trim()).toBe('जोड़ें');
    expect(el.querySelector('.ngu-array__remove')?.getAttribute('aria-label')).toBe('हटाएँ 1');
    expect(el.querySelector('.ngu-submit')?.textContent?.trim()).toBe('सहेजें');

    el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    expect(el.querySelector('.ngu-error')?.textContent).toBe('नाम आवश्यक है');
  });

  it('defaults the locale to LOCALE_ID', () => {
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'de' }] });
    const i18n = TestBed.runInInjectionContext(() => createNguI18n([], TestBed.inject(LOCALE_ID)));
    expect(i18n.locale()).toBe('de');
    expect(i18n.number(1234.5)).toBe('1234,5');
  });
});
