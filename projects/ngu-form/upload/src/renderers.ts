import { ChangeDetectionStrategy, Component, computed, input, type Provider } from '@angular/core';
import { FormField, type Field } from '@angular/forms/signals';
import { provideNguFieldTypes, type LeafDef } from 'ngu-form';
import { NguFileInput } from './file-input';
import { NguSignaturePad } from './signature';
import type { NguFileValue } from './types';

type FileFieldValue = readonly NguFileValue[] | NguFileValue | null;

/** Renderer of `type: 'file'`. */
@Component({
  selector: 'ngu-file-upload',
  imports: [FormField, NguFileInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ngu-file-input
    [formField]="field()"
    [def]="def()!"
    [id]="id()!"
    [errorShown]="invalid()"
    [describedBy]="describedBy()"
  />`,
})
export class NguFileUpload {
  /** The field to edit, bound to `<ngu-file-input>` with `[formField]`. Set by ngu-form. */
  readonly field = input.required<Field<FileFieldValue>>();
  /** The field's spec, with the file options. Set by ngu-form. */
  readonly def = input<LeafDef>();
  /** Id of the file input, used by the label's `for`. Set by ngu-form. */
  readonly id = input<string>();
  /** True while ngu-form shows the field's error. Set by ngu-form. */
  readonly invalid = input(false);
  /** Ids of the field's hint and messages, for `aria-describedby`. Set by ngu-form. */
  readonly describedBy = input<string>();
}

/** Renderer of `type: 'image'`: crops and resizes before adding. */
@Component({
  selector: 'ngu-image-upload',
  imports: [FormField, NguFileInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ngu-file-input
    mode="image"
    [formField]="field()"
    [def]="imageDef()"
    [id]="id()!"
    [errorShown]="invalid()"
    [describedBy]="describedBy()"
  />`,
})
export class NguImageUpload {
  /** The field to edit, bound to `<ngu-file-input>` with `[formField]`. Set by ngu-form. */
  readonly field = input.required<Field<FileFieldValue>>();
  /** The field's spec, with the image options. Set by ngu-form. */
  readonly def = input<LeafDef>();
  /** Id of the file input, used by the label's `for`. Set by ngu-form. */
  readonly id = input<string>();
  /** True while ngu-form shows the field's error. Set by ngu-form. */
  readonly invalid = input(false);
  /** Ids of the field's hint and messages, for `aria-describedby`. Set by ngu-form. */
  readonly describedBy = input<string>();

  /** Images only, unless the spec sets its own `accept`. */
  protected readonly imageDef = computed<LeafDef>(() => {
    const def = this.def()!;
    return (def as { accept?: string }).accept ? def : ({ ...def, accept: 'image/*' } as LeafDef);
  });
}

/** Renderer of `type: 'signature'`. */
@Component({
  selector: 'ngu-signature',
  imports: [FormField, NguSignaturePad],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ngu-signature-pad
    [formField]="field()"
    [def]="def()!"
    [id]="id()!"
    [errorShown]="invalid()"
    [describedBy]="describedBy()"
  />`,
})
export class NguSignature {
  /** The field to edit, bound to `<ngu-signature-pad>` with `[formField]`. Set by ngu-form. */
  readonly field = input.required<Field<string>>();
  /** The field's spec, with the signature options. Set by ngu-form. */
  readonly def = input<LeafDef>();
  /** Id of the signature control, used by the label's `for`. Set by ngu-form. */
  readonly id = input<string>();
  /** True while ngu-form shows the field's error. Set by ngu-form. */
  readonly invalid = input(false);
  /** Ids of the field's hint and messages, for `aria-describedby`. Set by ngu-form. */
  readonly describedBy = input<string>();
}

/**
 * Registers `type: 'file'`, `type: 'image'` and `type: 'signature'`. Add it next to your other
 * providers; importing `ngu-form/upload` also teaches TypeScript the three types.
 *
 * ```ts
 * providers: [provideNguUpload()]
 * ```
 */
export function provideNguUpload(): Provider {
  return provideNguFieldTypes({
    file: NguFileUpload,
    image: NguImageUpload,
    signature: NguSignature,
  });
}
