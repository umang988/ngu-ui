import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { defineForm } from '../define';
import { provideNguMessages } from '../messages';
import { NguView } from './ngu-view';

interface Profile {
  name: string;
  plan: 'free' | 'pro';
  secret: string;
  address: { city: string; zip: string };
  contact: { phone: string };
  pets: string[];
  jobs: { role: string; years: number }[];
  lines: { sku: string; qty: number }[];
  captcha: string;
  company: string;
}

@Component({
  imports: [NguView],
  template: `<ngu-view [form]="form" [keys]="keys()" />`,
})
class Host {
  readonly keys = signal<readonly string[] | undefined>(undefined);
  readonly form = defineForm<Profile>(
    {
      name: 'Asha',
      plan: 'pro',
      secret: 'pw',
      address: { city: 'Surat', zip: '' },
      contact: { phone: '+91 98765' },
      pets: ['Tom', 'Kit'],
      jobs: [{ role: 'Dev', years: 3 }],
      lines: [{ sku: 'A', qty: 2 }],
      captcha: 'token',
      company: 'Acme',
    },
    {
      name: 'Name',
      plan: { label: 'Plan', type: 'radio', options: [{ value: 'free', label: 'Free' }, { value: 'pro', label: 'Pro' }] },
      secret: { label: 'Password', type: 'password' },
      address: { title: 'Address', fields: { city: 'City', zip: 'PIN' } },
      contact: { phone: { label: 'Phone', order: -1 } },
      pets: { title: 'Pets', newItem: '', item: 'Pet' },
      jobs: { title: 'Jobs', newItem: { role: '', years: 0 }, item: { role: 'Role', years: { label: 'Years', suffix: 'yrs' } } },
      lines: { title: 'Lines', layout: 'table', newItem: { sku: '', qty: 1 }, item: { sku: 'SKU', qty: 'Qty' } },
      captcha: { label: 'Check', type: 'captcha' },
      company: { label: 'Company', hidden: (m) => m.plan === 'free' },
    },
  );
}

const pairs = (root: Element) =>
  Array.from(root.querySelectorAll(':scope > .ngu-view > .ngu-view__item:not(.ngu-view__item--section)')).map(
    (i) => `${i.querySelector('dt')!.textContent!.trim()}: ${i.querySelector('dd')!.textContent!.replace(/\s+/g, ' ').trim()}`,
  );

describe('NguView', () => {
  it('lists labels and values, flattening untitled groups and leaving out hidden fields and captchas', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const top = el.querySelector('ngu-view-list')!;
    // Untitled groups join the list; `order` applies inside them.
    expect(pairs(top)).toEqual(['Name: Asha', 'Plan: Pro', 'Password: ••••••••Hidden', 'Phone: +91 98765', 'Company: Acme']);

    fixture.componentInstance.form.patch({ plan: 'free' });
    await fixture.whenStable();
    expect(pairs(top)).not.toContain('Company: Acme');
  });

  it('shows titled groups and lists as sections: a list, numbered entries or a table', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const sections = Array.from(el.querySelectorAll('ngu-view-list > .ngu-view > .ngu-view__item--section'));
    expect(sections.map((s) => s.querySelector('dt')!.textContent)).toEqual(['Address', 'Pets', 'Jobs', 'Lines']);

    const address = sections[0].querySelector('dd > ngu-view-list')!;
    expect(pairs(address)).toEqual(['City: Surat', 'PIN: —Not provided']);
    expect(Array.from(sections[1].querySelectorAll('ul li')).map((li) => li.textContent?.trim())).toEqual(['Tom', 'Kit']);
    expect(pairs(sections[2].querySelector('ol li ngu-view-list')!)).toEqual(['Role: Dev', 'Years: 3 yrs']);
    const table = sections[3].querySelector('table')!;
    expect(Array.from(table.querySelectorAll('thead th')).map((th) => th.textContent?.trim())).toEqual(['#Entry number', 'SKU', 'Qty']);
    expect(Array.from(table.querySelectorAll('tbody td')).map((td) => td.textContent?.trim())).toEqual(['A', '2']);
  });

  it('shows only the given keys, in their order', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.keys.set(['plan', 'name']);
    await fixture.whenStable();
    expect(pairs((fixture.nativeElement as HTMLElement).querySelector('ngu-view-list')!)).toEqual(['Plan: Pro', 'Name: Asha']);
  });

  it('uses the translated texts', async () => {
    TestBed.configureTestingModule({ providers: [provideNguMessages({ notProvided: 'Leer', secret: 'Verborgen' })] });
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Verborgen');
    expect(el.textContent).toContain('Leer');
  });
});
