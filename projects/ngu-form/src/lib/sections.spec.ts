import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NguForm } from './components/ngu-form';
import { defineForm } from './define';

describe('tabs', () => {
  async function render() {
    @Component({
      imports: [NguForm],
      template: `<ngu-form [form]="form" submitLabel="Save" />`,
    })
    class Host {
      readonly form = defineForm(
        { profile: { name: '' }, alerts: { email: '' } },
        {
          profile: { title: 'Profile', fields: { name: 'Name' } },
          alerts: { title: 'Alerts', fields: { email: 'Email' } },
        },
        { layout: 'tabs' },
      );
    }
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  const selectedTab = (el: HTMLElement) => el.querySelector('[role="tab"][aria-selected="true"]')!.textContent!.trim();

  it('stay on the chosen tab when text is selected in one of its fields', async () => {
    const { fixture, el } = await render();
    el.querySelectorAll<HTMLButtonElement>('[role="tab"]')[1].click();
    await fixture.whenStable();
    expect(selectedTab(el)).toBe('Alerts');

    // Selecting text fires a native `select` event, which bubbles out of the input.
    const input = el.querySelector<HTMLInputElement>('ngu-field[data-ngu-path="alerts.email"] input')!;
    input.dispatchEvent(new Event('select', { bubbles: true }));
    await fixture.whenStable();
    expect(selectedTab(el)).toBe('Alerts');
  });
});
