import { chain, noop, type Rule, type SchematicContext, type Tree } from '@angular-devkit/schematics';
import { addDependency, addRootProvider, InstallBehavior } from '@schematics/angular/utility';
import { projectInfo } from '../utils/workspace';

export interface NgAddOptions {
  project?: string;
  renderer?: 'none' | 'material' | 'primeng';
  uploads?: boolean;
  sample?: boolean;
  skipInstall?: boolean;
}

/** Versions that match this release of ngu-form. */
const VERSIONS: Readonly<Record<string, string>> = {
  '@angular/material': '^22.2.0',
  '@angular/cdk': '^22.2.0',
  primeng: '^22.1.0',
  '@primeuix/themes': '^3.0.0',
};

/**
 * `ng add ngu-form`: registers the chosen renderer and uploads in the app config, installs
 * what they need, and creates a sample form.
 */
export function ngAdd(options: NgAddOptions): Rule {
  return async (tree: Tree, context: SchematicContext) => {
    const project = await projectInfo(tree, options.project);
    const install = options.skipInstall ? InstallBehavior.None : InstallBehavior.Auto;
    const has = (pkg: string) => {
      const json = JSON.parse(tree.readText('/package.json')) as Record<string, Record<string, string> | undefined>;
      return !!(json['dependencies']?.[pkg] ?? json['devDependencies']?.[pkg]);
    };
    const dependency = (pkg: string) => (has(pkg) ? noop() : addDependency(pkg, VERSIONS[pkg], { install }));
    const rules: Rule[] = [];

    if (options.renderer === 'material') {
      rules.push(
        dependency('@angular/cdk'),
        dependency('@angular/material'),
        addRootProvider(project.name, ({ code, external }) => code`${external('provideNguMaterial', 'ngu-form/material')}()`),
      );
      context.logger.info('ngu-form: fields render as Angular Material form fields. If Material has no theme yet, run "ng add @angular/material".');
    } else if (options.renderer === 'primeng') {
      rules.push(
        dependency('primeng'),
        dependency('@primeuix/themes'),
        addRootProvider(
          project.name,
          ({ code, external }) =>
            code`${external('providePrimeNG', 'primeng/config')}({ theme: { preset: ${external('default', '@primeuix/themes/aura')} } })`,
        ),
        addRootProvider(project.name, ({ code, external }) => code`${external('provideNguPrimeNG', 'ngu-form/primeng')}()`),
      );
    }
    if (options.uploads) {
      rules.push(addRootProvider(project.name, ({ code, external }) => code`${external('provideNguUpload', 'ngu-form/upload')}()`));
    }
    if (options.sample !== false) {
      rules.push(sample(`${project.sourceRoot}/app/sample-form/sample-form.ts`, project.prefix));
    }
    return chain(rules);
  };
}

function sample(file: string, prefix: string): Rule {
  return (tree: Tree, context: SchematicContext) => {
    if (tree.exists(file)) {
      return;
    }
    tree.create(
      file,
      `import { Component, signal } from '@angular/core';
import { defineForm, NguForm } from 'ngu-form';

interface Signup {
  name: string;
  email: string;
  plan: 'free' | 'pro';
  news: boolean;
}

/** A sample to start from. Add <${prefix}-sample-form /> to a template to see it. */
@Component({
  selector: '${prefix}-sample-form',
  imports: [NguForm],
  template: \`
    <ngu-form [form]="form" submitLabel="Create account" (submitted)="saved.set($event)" />
    @if (saved(); as value) {
      <p>Saved {{ value.email }} on the {{ value.plan }} plan.</p>
    }
  \`,
})
export class SampleForm {
  protected readonly saved = signal<Signup | undefined>(undefined);
  private readonly initial: Signup = { name: '', email: '', plan: 'free', news: false };

  readonly form = defineForm(this.initial, {
    name: { label: 'Name', required: true },
    email: { label: 'Email', type: 'email', required: true },
    plan: {
      label: 'Plan',
      type: 'radio',
      options: [
        { value: 'free', label: 'Free' },
        { value: 'pro', label: 'Pro' },
      ],
    },
    news: 'Email me product news',
  });
}
`,
    );
    context.logger.info(`ngu-form: created ${file}.`);
  };
}
