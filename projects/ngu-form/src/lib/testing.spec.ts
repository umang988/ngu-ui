import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { NguFieldHarness, NguFormHarness } from 'ngu-form/testing';
import { NguForm } from './components/ngu-form';
import { defineForm } from './define';

const PLANS = [
  { value: 'free', label: 'Free' },
  { value: 'pro', label: 'Pro' },
];

@Component({
  imports: [NguForm],
  template: `<ngu-form [form]="form" submitLabel="Save" [action]="action" (submitted)="saved.set($event)" />`,
})
class Host {
  readonly saved = signal<unknown>(undefined);
  readonly form = defineForm(
    {
      account: { email: '', password: '' },
      plan: 'free',
      seats: 1,
      remember: false,
      notify: true,
      topics: [] as string[],
      size: 'm',
      tags: [] as string[],
      start: null as Date | null,
      items: [{ sku: '' }],
    },
    {
      account: { email: { label: 'Email', type: 'email', required: true }, password: { label: 'Password', type: 'password' } },
      plan: { label: 'Plan', type: 'select', options: PLANS },
      seats: { label: 'Seats', min: 1 },
      remember: 'Remember me',
      notify: { label: 'Notify me', type: 'switch' },
      topics: {
        label: 'Topics',
        type: 'checkbox',
        options: [
          { value: 'news', label: 'News' },
          { value: 'tips', label: 'Tips' },
        ],
      },
      size: {
        label: 'Size',
        type: 'segmented',
        options: [
          { value: 's', label: 'S' },
          { value: 'm', label: 'M' },
        ],
      },
      tags: { label: 'Tags', type: 'tags' },
      start: { label: 'Start', type: 'date' },
      items: { title: 'Items', item: { sku: { label: 'SKU', required: true } }, newItem: { sku: '' } },
    },
  );
  readonly action = (value: { account: { email: string } }) =>
    value.account.email === 'taken@example.com' ? { 'account.email': 'Already registered' } : undefined;
}

describe('NguFormHarness', () => {
  async function setup() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const form = await TestbedHarnessEnvironment.harnessForFixture(fixture, NguFormHarness);
    return { fixture, form };
  }

  it('finds fields by model path or label', async () => {
    const { form } = await setup();
    const email = await form.field('account.email');
    expect(await email.getLabel()).toBe('Email');
    expect(await email.isRequired()).toBe(true);
    expect(await (await form.field('Seats')).getPath()).toBe('seats');
    expect(await (await form.field('items.0.sku')).getLabel()).toBe('SKU');
    await expect(form.field('nope')).rejects.toThrow(/no field on screen/);
  });

  it('fills every kind of built-in control and submits the typed model', async () => {
    const { fixture, form } = await setup();
    await form.fill({
      'account.email': 'ada@example.com',
      'account.password': 'secret',
      plan: 'Pro',
      seats: 3,
      remember: true,
      notify: false,
      topics: ['Tips'],
      size: 'S',
      tags: ['a', 'b'],
      start: new Date('2026-03-01T00:00:00Z'),
      'items.0.sku': 'X-1',
    });
    expect(await (await form.field('plan')).getValue()).toBe('Pro');
    expect(await (await form.field('topics')).getValue()).toEqual(['Tips']);
    expect(await (await form.field('size')).getValue()).toBe('S');
    expect(await (await form.field('tags')).getValue()).toEqual(['a', 'b']);
    expect(await (await form.field('remember')).getValue()).toBe(true);
    await form.submit();
    await fixture.whenStable();
    // toMatchObject: list rows also carry Signal Forms' identity symbol.
    expect(fixture.componentInstance.saved()).toMatchObject({
      account: { email: 'ada@example.com', password: 'secret' },
      plan: 'pro',
      seats: 3,
      remember: true,
      notify: false,
      topics: ['tips'],
      size: 's',
      tags: ['a', 'b'],
      start: new Date('2026-03-01T00:00:00Z'),
      items: [{ sku: 'X-1' }],
    });
  });

  it('reports errors on screen by path, including server errors', async () => {
    const { fixture, form } = await setup();
    await form.submit();
    await fixture.whenStable();
    const errors = await form.getErrors();
    expect(Object.keys(errors).sort()).toEqual(['account.email', 'items.0.sku']);
    expect(await (await form.field('account.email')).isInvalid()).toBe(true);

    await form.fill({ 'account.email': 'taken@example.com', 'items.0.sku': 'A' });
    await form.submit();
    await fixture.whenStable();
    expect(await form.getErrors()).toEqual({ 'account.email': 'Already registered' });
  });

  it('adds and removes list rows', async () => {
    const { form } = await setup();
    const items = await form.list('items');
    expect(await items.getTitle()).toBe('Items');
    await items.addRow();
    expect(await items.getRowCount()).toBe(2);
    expect((await items.getRowFields(1)).length).toBe(1);
    await (await form.field('items.1.sku')).setValue('Y');
    await items.removeRow(0);
    expect(await items.getRowCount()).toBe(1);
    expect(await (await form.field('items.0.sku')).getValue()).toBe('Y');
  });

  it('filters fields with NguFieldHarness.with', async () => {
    const { fixture } = await setup();
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const switches = await loader.getAllHarnesses(NguFieldHarness.with({ type: 'switch' }));
    expect(switches.length).toBe(1);
    expect(await switches[0].getLabel()).toBe('Notify me');
    expect(await loader.getHarness(NguFieldHarness.with({ label: /^Pass/ }))).toBeTruthy();
  });
});

describe('NguFormHarness with a wizard', () => {
  @Component({
    imports: [NguForm],
    template: `<ngu-form [form]="form" submitLabel="Finish" />`,
  })
  class Wizard {
    readonly form = defineForm(
      { who: { name: '' }, where: { city: '' } },
      { who: { title: 'You', fields: { name: { label: 'Name', required: true } } }, where: { title: 'Address', fields: { city: 'City' } } },
      { layout: 'steps' },
    );
  }

  it('moves between steps and shows the step heading', async () => {
    const fixture = TestBed.createComponent(Wizard);
    await fixture.whenStable();
    const form = await TestbedHarnessEnvironment.harnessForFixture(fixture, NguFormHarness);
    expect(await form.getStep()).toContain('You');
    await form.next();
    await fixture.whenStable();
    expect(await form.getStep()).toContain('You');
    expect(await form.getErrors()).toEqual({ 'who.name': expect.any(String) });
    await form.fill({ 'who.name': 'Ada' });
    await form.next();
    await fixture.whenStable();
    expect(await form.getStep()).toContain('Address');
    await form.back();
    expect(await form.getStep()).toContain('You');
  });
});

describe('harnesses with nested lists', () => {
  @Component({
    imports: [NguForm],
    template: `<ngu-form [form]="form" submitLabel="Save" />`,
  })
  class NestedHost {
    readonly form = defineForm(
      { agree: false, teams: [{ name: 'Core', members: [{ email: 'a@example.com' }] }] },
      {
        agree: { label: 'I agree', required: true },
        teams: {
          item: {
            name: 'Team',
            members: { item: { email: 'Email' }, newItem: { email: '' }, addLabel: 'Add member' },
          },
          newItem: { name: '', members: [] },
          addLabel: 'Add team',
        },
      },
    );
  }

  async function setup() {
    const fixture = TestBed.createComponent(NestedHost);
    await fixture.whenStable();
    const form = await TestbedHarnessEnvironment.loader(fixture).getHarness(NguFormHarness);
    return { fixture, form };
  }

  it("adds and removes the list's own rows, not those of lists inside them", async () => {
    const { fixture, form } = await setup();
    const teams = await form.list('teams');
    const members = await form.list('teams.0.members');
    expect(await teams.getTitle()).toBe('');

    await teams.addRow();
    expect(await teams.getRowCount()).toBe(2);
    expect(await members.getRowCount()).toBe(1);

    await teams.removeRow(0);
    expect(await teams.getRowCount()).toBe(1);
    // The first team (with its member) is gone; the new, empty one is left.
    const left = fixture.componentInstance.form.value().teams;
    expect(left.map((t) => [t.name, t.members.length])).toEqual([['', 0]]);
  });

  it('reports a required single checkbox, which shows no asterisk', async () => {
    const { form } = await setup();
    expect(await (await form.field('agree')).isRequired()).toBe(true);
  });
});

