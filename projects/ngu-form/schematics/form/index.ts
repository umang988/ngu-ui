import { strings } from '@angular-devkit/core';
import { SchematicsException, type Rule, type Tree } from '@angular-devkit/schematics';
import { componentCode, names, specFileCode } from '../utils/component';
import { modelFromInterface, type TypeScript } from '../utils/from-ts';
import { projectInfo, relativeImport, sourceFiles } from '../utils/workspace';

export interface FormOptions {
  name: string;
  model: string;
  path?: string;
  project?: string;
  submitLabel?: string;
  skipTests?: boolean;
}

/** `ng g ngu-form:form signup --model=Signup`: a component with a spec for every property. */
export function form(options: FormOptions): Rule {
  return async (tree: Tree) => {
    const project = await projectInfo(tree, options.project);
    const ts = loadTypeScript();
    const found = modelFromInterface(ts, sourceFiles(tree, project.sourceRoot), options.model);
    if (!found) {
      throw new SchematicsException(`No interface or object type "${options.model}" in ${project.sourceRoot}.`);
    }
    const n = names(options.name, project.prefix);
    const dir = (options.path ?? `${project.sourceRoot}/app/${strings.dasherize(options.name.replace(/-?form$/i, ''))}-form`).replace(/\/$/, '');
    const file = `${dir}/${n.file}.ts`;
    if (tree.exists(file)) {
      throw new SchematicsException(`${file} already exists.`);
    }
    const component = {
      name: options.name,
      prefix: project.prefix,
      model: found.name,
      modelImport: relativeImport(file.replace(/^\//, ''), found.file.replace(/^\//, '')),
      group: found.group,
      submitLabel: options.submitLabel ?? 'Save',
    };
    tree.create(file, componentCode(component));
    if (!options.skipTests) {
      tree.create(`${dir}/${n.file}.spec.ts`, specFileCode(component));
    }
  };
}

/** The project's own TypeScript, so the generator reads the syntax the project uses. */
export function loadTypeScript(): TypeScript {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- the app's own TypeScript, loaded at run time
    return require(require.resolve('typescript', { paths: [process.cwd()] }));
  } catch {
    throw new SchematicsException('The form generator needs the "typescript" package in your project.');
  }
}
