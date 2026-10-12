import { strings } from '@angular-devkit/core';
import { formCode } from './emit';
import type { FieldModel, GroupModel } from './model';

export interface ComponentOptions {
  /** Name given on the command line, such as `signup` or `admin/user-edit`. */
  readonly name: string;
  readonly prefix: string;
  /** The model type name. */
  readonly model: string;
  /** Import of the model type, relative to the component file; omitted when declared inline. */
  readonly modelImport?: string;
  /** Interface code to put at the top of the component file. */
  readonly modelCode?: string;
  readonly group: GroupModel;
  readonly submitLabel: string;
}

/** `signup` → `SignupForm`, file `signup-form.ts`, selector `app-signup-form`. */
export function names(name: string, prefix: string) {
  const base = strings.dasherize(name.split('/').pop()!.replace(/-?form$/i, ''));
  const file = `${base}-form`;
  return {
    file,
    className: strings.classify(file),
    selector: prefix ? `${prefix}-${file}` : file,
  };
}

export function componentCode(o: ComponentOptions): string {
  const n = names(o.name, o.prefix);
  const { initial, spec } = formCode(o.group, 1);
  const imports = [
    `import { Component } from '@angular/core';`,
    `import { defineForm, NguForm } from 'ngu-form';`,
    ...(o.modelImport ? [`import type { ${o.model} } from '${o.modelImport}';`] : []),
  ];
  return `${imports.join('\n')}
${o.modelCode ? `\n${o.modelCode}\n` : ''}
@Component({
  selector: '${n.selector}',
  imports: [NguForm],
  template: \`<ngu-form [form]="form" submitLabel="${o.submitLabel}" (submitted)="save($event)" />\`,
})
export class ${n.className} {
  private readonly initial: ${o.model} = ${initial};

  readonly form = defineForm(this.initial, ${spec});

  protected save(value: ${o.model}): void {
    // TODO: send the value to your API, for example through an [action] that returns server errors.
    console.log(value);
  }
}
`;
}

/** Counts the fields a form renders up front: list rows start empty, run-time fields arrive later. */
function countFields(fields: readonly FieldModel[]): number {
  let n = 0;
  for (const f of fields) {
    if (f.kind === 'group') {
      n += countFields(f.fields);
    } else if (f.kind === 'list') {
      n += f.min && f.min > 0 ? (f.item.kind === 'group' ? countFields(f.item.fields) : 1) : 0;
    } else if (f.kind !== 'record') {
      n += 1;
    }
  }
  return n;
}

export function specFileCode(o: ComponentOptions): string {
  const n = names(o.name, o.prefix);
  return `import { TestBed } from '@angular/core/testing';
import { ${n.className} } from './${n.file}';

describe('${n.className}', () => {
  it('renders every field', async () => {
    const fixture = TestBed.createComponent(${n.className});
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('ngu-field').length).toBe(${countFields(o.group.fields)});
  });
});
`;
}
