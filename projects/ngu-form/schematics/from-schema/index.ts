import { strings } from '@angular-devkit/core';
import { SchematicsException, type Rule, type Tree } from '@angular-devkit/schematics';
import { componentCode, names, specFileCode } from '../utils/component';
import { interfaceCode } from '../utils/emit';
import { modelFromJsonSchema, requestBodySchema, resolvePointer, type JsonSchema } from '../utils/from-json-schema';
import { projectInfo } from '../utils/workspace';

export interface FromSchemaOptions {
  name: string;
  schema: string;
  pointer?: string;
  operation?: string;
  model?: string;
  path?: string;
  project?: string;
  submitLabel?: string;
  skipTests?: boolean;
}

/**
 * `ng g ngu-form:from-schema signup --schema=api.json --pointer=#/components/schemas/Signup`:
 * a model interface and a form component, typed, that you edit and own.
 */
export function fromSchema(options: FromSchemaOptions): Rule {
  return async (tree: Tree) => {
    const project = await projectInfo(tree, options.project);
    const text = tree.readText(options.schema.replace(/^\.?\//, ''));
    let document: Record<string, any>;
    try {
      document = JSON.parse(text);
    } catch {
      throw new SchematicsException(`${options.schema} is not JSON. Convert YAML OpenAPI documents to JSON first.`);
    }
    let schema: JsonSchema;
    let schemaName: string | undefined;
    try {
      if (options.operation) {
        schema = requestBodySchema(document, options.operation);
      } else if (options.pointer) {
        schema = resolvePointer(document, options.pointer) as JsonSchema;
        schemaName = options.pointer.split('/').pop();
      } else if (document['openapi'] || document['swagger']) {
        throw new SchematicsException('This is an OpenAPI document: pass --pointer=#/components/schemas/Name or --operation=operationId.');
      } else {
        schema = document as JsonSchema;
        schemaName = typeof document['title'] === 'string' ? document['title'] : undefined;
      }
    } catch (e) {
      throw e instanceof SchematicsException ? e : new SchematicsException((e as Error).message);
    }
    if (schema.$ref && !options.model) {
      schemaName = schema.$ref.split('/').pop();
    }
    const model = strings.classify(options.model ?? schemaName ?? options.name);
    const { group, nested } = modelFromJsonSchema(document, schema);
    if (!group.fields.length) {
      throw new SchematicsException('The schema has no properties to make fields from.');
    }

    const n = names(options.name, project.prefix);
    const dir = (options.path ?? `${project.sourceRoot}/app/${strings.dasherize(options.name.replace(/-?form$/i, ''))}-form`).replace(/\/$/, '');
    const modelFile = `${dir}/${strings.dasherize(model)}.ts`;
    const file = `${dir}/${n.file}.ts`;
    for (const f of [modelFile, file]) {
      if (tree.exists(f)) {
        throw new SchematicsException(`${f} already exists.`);
      }
    }
    tree.create(modelFile, `// Generated from ${options.schema}${options.pointer ? ` ${options.pointer}` : options.operation ? ` (${options.operation})` : ''}.\n\n${interfaceCode(model, group, nested)}\n`);
    const component = {
      name: options.name,
      prefix: project.prefix,
      model,
      modelImport: `./${strings.dasherize(model)}`,
      group,
      submitLabel: options.submitLabel ?? 'Save',
    };
    tree.create(file, componentCode(component));
    if (!options.skipTests) {
      tree.create(`${dir}/${n.file}.spec.ts`, specFileCode(component));
    }
  };
}
