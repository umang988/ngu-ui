import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormField } from '@angular/forms/signals';
import { defineForm } from '../define';
import { provideNguFieldRenderers, type NguFieldRenderContext } from '../renderers';
import { NguForm } from './ngu-form';
import { NguControlTemplate } from './ngu-templates';

/** A whole-field renderer, as a design-system adapter writes one. */
@Component({
  selector: 'test-boxed-field',
  imports: [FormField],
  template: `
    @let c = context();
    <div class="boxed" [class.boxed--error]="c.showErrors">
      <label class="boxed__label" [for]="c.id">{{ c.label }}{{ c.required ? ' (required)' : '' }}</label>
      @if (c.choices.length) {
        <span class="boxed__choices">{{ choiceLabels() }}</span>
      }
      <input class="boxed__input" [id]="c.id" [formField]="c.field" />
      @if (c.error) {
        <p class="boxed__error">{{ c.error }}</p>
      } @else if (c.hint) {
        <p class="boxed__hint">{{ c.hint }}</p>
      }
    </div>
  `,
})
class BoxedField {
  readonly context = input.required<NguFieldRenderContext>();
  protected choiceLabels(): string {
    return this.context().choices.map((c) => c.label).join(',');
  }
}

describe('whole-field renderers', () => {
  @Component({
    imports: [NguForm, NguControlTemplate, FormField],
    template: `
      <ngu-form [form]="form" submitLabel="Save" errorSummary>
        <ng-template nguControl="nick" let-field><input class="own" [formField]="field" /></ng-template>
      </ngu-form>
    `,
  })
  class Host {
    readonly form = defineForm(
      { name: '', nick: '', size: 'm', agree: false },
      {
        name: { label: 'Name', required: true, hint: 'Your full name' },
        nick: 'Nickname',
        size: {
          label: 'Size',
          type: 'radio',
          options: [
            { value: 's', label: 'Small' },
            { value: 'm', label: 'Medium' },
          ],
        },
        agree: 'I agree',
      },
    );
  }

  async function render(lazy = false) {
    TestBed.configureTestingModule({
      providers: [
        provideNguFieldRenderers(
          lazy ? { text: () => Promise.resolve(BoxedField) } : { text: BoxedField, radio: BoxedField },
        ),
      ],
    });
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('renders the whole field from the renderer, with resolved texts and options', async () => {
    const { el } = await render();
    const name = el.querySelector('ngu-field[data-ngu-path="name"]')!;
    expect(name.querySelector('.ngu-label')).toBeNull();
    expect(name.querySelector('.boxed__label')!.textContent).toBe('Name (required)');
    expect(name.querySelector('.boxed__hint')!.textContent).toBe('Your full name');
    const size = el.querySelector('ngu-field[data-ngu-path="size"]')!;
    expect(size.querySelector('.boxed__choices')!.textContent).toBe('Small,Medium');
    // Types without a renderer keep the built-in markup.
    expect(el.querySelector('ngu-field[data-ngu-path="agree"] .ngu-check')).not.toBeNull();
  });

  it('lets an nguControl template win for its path', async () => {
    const { el } = await render();
    const nick = el.querySelector('ngu-field[data-ngu-path="nick"]')!;
    expect(nick.querySelector('input.own')).not.toBeNull();
    expect(nick.querySelector('.boxed')).toBeNull();
    expect(nick.querySelector('.ngu-label')).not.toBeNull();
  });

  it('passes errors once they should show, and keeps focus and the error summary working', async () => {
    const { fixture, el } = await render();
    const name = el.querySelector('ngu-field[data-ngu-path="name"]')!;
    expect(name.querySelector('.boxed__error')).toBeNull();
    el.querySelector<HTMLButtonElement>('.ngu-submit')!.click();
    await fixture.whenStable();
    expect(name.querySelector('.boxed__error')!.textContent).toBeTruthy();
    expect(name.classList).toContain('ngu-field--invalid');
    const link = el.querySelector<HTMLAnchorElement>('.ngu-error-summary a')!;
    link.click();
    await fixture.whenStable();
    expect(document.activeElement).toBe(name.querySelector('input'));
  });

  it('loads a lazy renderer', async () => {
    const { fixture, el } = await render(true);
    await fixture.whenStable();
    expect(el.querySelector('ngu-field[data-ngu-path="name"] .boxed')).not.toBeNull();
  });
});
