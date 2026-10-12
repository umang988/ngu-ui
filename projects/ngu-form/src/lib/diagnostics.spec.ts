import { Component, Directive, Injector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NguForm } from './components/ngu-form';
import { NguControlTemplate, NguFieldTemplate } from './components/ngu-templates';
import { defineForm } from './define';
import { closest, DIAGNOSTICS_URL, resetWarnings } from './diagnostics';
import { provideNguFieldTypes } from './field-types';

declare module './types' {
  interface NguFieldTypeMap {
    notAComponent: string;
  }
}

@Directive({ selector: '[testPlain]' })
class PlainDirective {}

describe('diagnostics', () => {
  let warn: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    resetWarnings();
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => warn.mockRestore());

  const messages = (): string[] => warn.mock.calls.map((c: unknown[]) => String(c[0]));

  it('suggests the model key a spec key was probably meant to be', () => {
    const injector = TestBed.inject(Injector);
    expect(() =>
      runInInjectionContext(injector, () => defineForm({ email: '' }, { emial: 'Email' } as never)),
    ).toThrow(/NGU-103.*"emial" is described but missing from the model value\. Did you mean "email"\?/);
    expect(() =>
      runInInjectionContext(injector, () => defineForm({ email: '' }, { emial: 'Email' } as never)),
    ).toThrow(new RegExp(`${DIAGNOSTICS_URL}#ngu-103`));
  });

  it('finds close matches only', () => {
    expect(closest('acount.email', ['account.email', 'name'])).toBe('account.email');
    expect(closest('zzz', ['account.email', 'name'])).toBeUndefined();
  });

  it('warns once about template paths that match no field, with the likely one', async () => {
    @Component({
      imports: [NguForm, NguFieldTemplate, NguControlTemplate],
      template: `
        <ngu-form [form]="form">
          <ng-template nguField="acount.email"><span></span></ng-template>
          <ng-template nguControl="items[].sku" let-field><input /></ng-template>
          <ng-template nguControl="items.sku"><input /></ng-template>
          <ng-template nguField="answers.anything"><span></span></ng-template>
        </ngu-form>
      `,
    })
    class Host {
      readonly form = defineForm(
        { account: { email: '' }, items: [{ sku: '' }], answers: {} as Record<string, string> },
        {
          account: { email: 'Email' },
          items: { item: { sku: 'SKU' }, newItem: { sku: '' } },
          answers: { fields: [] },
        },
      );
    }
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    const found = messages().filter((m) => m.includes('NGU-201'));
    expect(found.length).toBe(2);
    expect(found[0]).toContain('nguField="acount.email" matches no field');
    expect(found[0]).toContain('Did you mean "account.email"?');
    expect(found[1]).toContain('nguControl="items.sku"');
    expect(found[1]).toContain('Did you mean "items[].sku"?');
  });

  it('names the missing provider for types without a renderer, icons and bad registrations', async () => {
    @Component({
      imports: [NguForm],
      template: `<ngu-form [form]="form" />`,
    })
    class Host {
      readonly form = defineForm(
        { a: '', b: '', c: '', d: '' },
        {
          a: { label: 'A', type: 'file' as never },
          b: { label: 'B', type: 'whatever' as never },
          c: { label: 'C', prefixIcon: 'search' },
          d: { label: 'D', type: 'notAComponent' },
        },
      );
    }
    TestBed.configureTestingModule({ providers: [provideNguFieldTypes({ notAComponent: PlainDirective })] });
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const all = messages();
    expect(all.find((m) => m.includes('"file"'))).toContain("provideNguUpload() from 'ngu-form/upload'");
    expect(all.find((m) => m.includes('"whatever"'))).toContain("provideNguFieldTypes({ 'whatever'");
    expect(all.find((m) => m.includes('NGU-302'))).toContain('provideNguIcons');
    expect(all.find((m) => m.includes('NGU-304'))).toContain('PlainDirective, which is not a component');
  });

  it('warns when two live forms write the same draft', () => {
    const injector = TestBed.inject(Injector);
    runInInjectionContext(injector, () => defineForm({ a: '' }, { a: 'A' }, { draft: { key: 'twice' } }));
    expect(messages().some((m) => m.includes('NGU-401'))).toBe(false);
    runInInjectionContext(injector, () => defineForm({ a: '' }, { a: 'A' }, { draft: { key: 'twice' } }));
    expect(messages().filter((m) => m.includes('NGU-401')).length).toBe(1);
    runInInjectionContext(injector, () => defineForm({ a: '' }, { a: 'A' }, { draft: { key: 'other', storage: 'session' } }));
    expect(messages().filter((m) => m.includes('NGU-401')).length).toBe(1);
  });
});
