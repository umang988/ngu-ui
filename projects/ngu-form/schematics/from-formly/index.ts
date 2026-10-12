import { strings } from '@angular-devkit/core';
import { SchematicsException, type Rule, type SchematicContext, type Tree } from '@angular-devkit/schematics';
import { loadTypeScript } from '../form/index';
import { formCode, interfaceCode } from '../utils/emit';
import { convertFormly, findFormlyArrays } from './convert';

export interface FromFormlyOptions {
  path: string;
}

/**
 * `ng g ngu-form:from-formly src/app/signup.ts`: writes `signup.ngu-form.ts` next to the file,
 * with a model interface, an initial value and an ngu-form spec for each formly field array.
 * The original file is left as it is; expressions and custom validators become TODOs.
 */
export function fromFormly(options: FromFormlyOptions): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const path = options.path.replace(/^\.?\//, '');
    if (!tree.exists(path)) {
      throw new SchematicsException(`${path} does not exist.`);
    }
    const ts = loadTypeScript();
    const source = ts.createSourceFile(path, tree.readText(path), ts.ScriptTarget.Latest, true);
    const arrays = findFormlyArrays(ts, source);
    if (!arrays.length) {
      throw new SchematicsException(`No FormlyFieldConfig[] arrays in ${path}.`);
    }
    const blocks: string[] = [];
    let todos = 0;
    for (const array of arrays) {
      const group = convertFormly(ts, array.node);
      const base = strings.camelize(array.name.replace(/fields?$/i, '') || path.split('/').pop()!.replace(/\..*$/, ''));
      const model = strings.classify(base) + 'Model';
      const { initial, spec } = formCode(group, 0);
      todos += (spec.match(/TODO/g) ?? []).length;
      blocks.push(`// From "${array.name}".
${interfaceCode(model, group)}

export const ${base}Initial: ${model} = ${initial};

export const ${base}Spec: FormSpec<${model}> = ${spec};`);
    }
    const out = path.replace(/\.ts$/, '.ngu-form.ts');
    const header = `// Converted from ${path.split('/').pop()} by "ng g ngu-form:from-formly". Review it, then use it as
//   readonly form = defineForm(${strings.camelize(arrays[0].name.replace(/fields?$/i, '') || 'form')}Initial, ${strings.camelize(arrays[0].name.replace(/fields?$/i, '') || 'form')}Spec);
// and render it with <ngu-form [form]="form" />. Mapping notes: https://ngu-form.netlify.app/from-formly
import type { FormSpec } from 'ngu-form';
`;
    const content = `${header}\n${blocks.join('\n\n')}\n`;
    if (tree.exists(out)) {
      tree.overwrite(out, content);
    } else {
      tree.create(out, content);
    }
    context.logger.info(`ngu-form: wrote ${out} (${arrays.length} form${arrays.length > 1 ? 's' : ''}, ${todos} TODO${todos === 1 ? '' : 's'}).`);
  };
}
