import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { defineForm } from '../define';
import { provideNguIcons } from '../icons';
import { NguForm } from './ngu-form';
import { NguPrefixTemplate, NguSuffixTemplate } from './ngu-templates';

@Component({ selector: 'test-search-icon', template: `<svg class="search" viewBox="0 0 16 16"></svg>` })
class SearchIcon {}

@Component({ selector: 'test-mail-icon', template: `<svg class="mail" viewBox="0 0 16 16"></svg>` })
class MailIcon {}

describe('icon adornments', () => {
  @Component({
    imports: [NguForm, NguPrefixTemplate, NguSuffixTemplate],
    template: `
      <ngu-form [form]="form">
        <ng-template nguSuffix="query" let-state="state">
          <span class="clear">{{ state.value() ? 'x' : '' }}</span>
        </ng-template>
        <ng-template nguPrefix="items[].sku"><span class="hash">#</span></ng-template>
      </ngu-form>
    `,
  })
  class Host {
    readonly form = defineForm(
      { query: '', email: '', plain: '', items: [{ sku: '' }], extra: {} as Record<string, string> },
      {
        query: { label: 'Search', type: 'search', prefixIcon: 'search' },
        email: { label: 'Email', type: 'email', suffixIcon: 'mail', suffix: 'work' },
        plain: { label: 'Plain', prefixIcon: 'missing' },
        items: { item: { sku: 'SKU' }, newItem: { sku: '' } },
        extra: { fields: [{ key: 'contact', label: 'Contact', prefixIcon: 'mail' }] },
      },
    );
  }

  async function render() {
    TestBed.configureTestingModule({
      providers: [provideNguIcons({ search: MailIcon }), provideNguIcons({ search: SearchIcon, mail: MailIcon })],
    });
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const field = (label: string) =>
      Array.from(el.querySelectorAll('ngu-field')).find((f) => f.querySelector('label')?.textContent?.trim().startsWith(label))!;
    return { fixture, el, field };
  }

  it('renders registered icons by name, latest registration first, hidden from screen readers', async () => {
    const { field } = await render();
    const icon = field('Search').querySelector('.ngu-icon--prefix')!;
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(icon.querySelector('svg.search')).not.toBeNull();
    expect(field('Search').querySelector('.ngu-control--adorned')).not.toBeNull();
  });

  it('puts a suffix icon after the suffix text', async () => {
    const { field } = await render();
    const control = field('Email').querySelector('.ngu-control')!;
    const last = control.lastElementChild!;
    expect(last.classList).toContain('ngu-icon--suffix');
    expect(last.previousElementSibling!.classList).toContain('ngu-suffix');
    expect(last.querySelector('svg.mail')).not.toBeNull();
  });

  it('ignores names that are not registered', async () => {
    const { field } = await render();
    expect(field('Plain').querySelector('.ngu-icon')).toBeNull();
    expect(field('Plain').querySelector('.ngu-control--adorned')).toBeNull();
  });

  it('renders nguPrefix and nguSuffix templates by path, with the field context', async () => {
    const { fixture, field } = await render();
    const clear = field('Search').querySelector('.ngu-icon--suffix .clear')!;
    expect(clear.textContent).toBe('');
    const input = field('Search').querySelector('input')!;
    input.value = 'cats';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(clear.textContent).toBe('x');
    expect(field('SKU').querySelector('.ngu-icon--prefix .hash')).not.toBeNull();
  });

  it('works for run-time fields and focuses the control on click', async () => {
    const { field } = await render();
    const contact = field('Contact');
    expect(contact.querySelector('.ngu-icon--prefix svg.mail')).not.toBeNull();
    contact.querySelector<HTMLElement>('.ngu-icon')!.click();
    expect(document.activeElement).toBe(contact.querySelector('input'));
  });
});
