/**
 * Opens a demo on StackBlitz as a small Angular CLI project that installs the published
 * packages. Uses StackBlitz's POST API (a form posted to stackblitz.com/run), so no SDK.
 */

/** Package versions a project may install, by package name. */
export interface StackBlitzConfig {
  /** Versions for `@angular/*` packages, the CLI and the build tools. */
  readonly angular: string;
  readonly typescript: string;
  /** Every other package a demo may import, such as `ngu-form` or `zod`. */
  readonly dependencies: Readonly<Record<string, string>>;
}

export interface SourceFile {
  /** Path under `src/app/`, keeping the folders, so relative imports still resolve. */
  readonly path: string;
  readonly code: string;
}

/** The project's files, or why the demo cannot run outside the docs site. */
export function angularProject(
  title: string,
  files: readonly SourceFile[],
  config: StackBlitzConfig,
): { files: Record<string, string> } | { error: string } {
  const [main] = files;
  const component = /export class (\w+)/.exec(main.code)?.[1];
  const selector = /selector:\s*'([a-z][\w-]*)'/.exec(main.code)?.[1];
  if (!component || !selector) {
    return { error: 'The demo has no component to start.' };
  }

  const angular = new Set(['@angular/core', '@angular/common', '@angular/compiler', '@angular/platform-browser', '@angular/forms']);
  const dependencies: Record<string, string> = { rxjs: '~7.8.0', tslib: '^2.3.0' };
  const own = new Set(files.map((f) => f.path.replace(/\.ts$/, '')));
  for (const file of files) {
    for (const [, spec] of file.code.matchAll(/from '([^']+)'/g)) {
      if (spec.startsWith('.')) {
        const target = join(file.path, spec);
        if (!own.has(target)) {
          return { error: `The demo imports ${spec}, which only exists on the docs site.` };
        }
        continue;
      }
      const name = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
      if (name.startsWith('@angular/')) {
        angular.add(name);
      } else if (config.dependencies[name]) {
        dependencies[name] = config.dependencies[name];
      } else {
        return { error: `The demo imports ${name}, which this site does not install on StackBlitz.` };
      }
    }
  }
  for (const name of angular) {
    dependencies[name] = config.angular;
  }

  const mainPath = main.path.replace(/\.ts$/, '');
  const project: Record<string, string> = {
    'package.json': json({
      name: slug(title),
      private: true,
      scripts: { start: 'ng serve', build: 'ng build' },
      dependencies: sorted(dependencies),
      devDependencies: { '@angular/build': config.angular, '@angular/cli': config.angular, '@angular/compiler-cli': config.angular, typescript: config.typescript },
    }),
    'angular.json': json({
      $schema: './node_modules/@angular/cli/lib/config/schema.json',
      version: 1,
      cli: { analytics: false },
      newProjectRoot: 'projects',
      projects: {
        demo: {
          projectType: 'application',
          root: '',
          sourceRoot: 'src',
          architect: {
            build: {
              builder: '@angular/build:application',
              options: { browser: 'src/main.ts', index: 'src/index.html', tsConfig: 'tsconfig.json', styles: ['src/styles.css'] },
            },
            serve: { builder: '@angular/build:dev-server', options: { buildTarget: 'demo:build:development' } },
          },
        },
      },
    }),
    'tsconfig.json': json({
      compilerOptions: { strict: true, target: 'ES2022', module: 'preserve', moduleResolution: 'bundler', skipLibCheck: true, isolatedModules: true },
      angularCompilerOptions: { strictTemplates: true },
      files: ['src/main.ts'],
    }),
    'src/index.html': `<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="utf-8" />\n    <title>${escape(title)}</title>\n    <meta name="viewport" content="width=device-width, initial-scale=1" />\n  </head>\n  <body>\n    <${selector}></${selector}>\n  </body>\n</html>\n`,
    'src/main.ts': `import { bootstrapApplication } from '@angular/platform-browser';\nimport { ${component} } from './app/${mainPath}';\n\nbootstrapApplication(${component}).catch((err) => console.error(err));\n`,
    'src/styles.css': 'body {\n  max-width: 44rem;\n  margin: 2rem auto;\n  padding: 0 1rem;\n  font-family: system-ui, sans-serif;\n}\n',
  };
  for (const file of files) {
    project[`src/app/${file.path}`] = file.code;
  }
  return { files: project };
}

/** Posts the project to StackBlitz in a new tab, with the demo's file open. */
export function openStackBlitz(title: string, description: string, files: Record<string, string>, open: string): void {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = `https://stackblitz.com/run?file=${encodeURIComponent(open)}`;
  form.target = '_blank';
  form.hidden = true;
  const field = (name: string, value: string) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.append(input);
  };
  field('project[title]', title);
  field('project[description]', description);
  field('project[template]', 'node');
  for (const [path, code] of Object.entries(files)) {
    field(`project[files][${path}]`, code);
  }
  document.body.append(form);
  form.submit();
  form.remove();
}

/** Fetches source files from the site's `/source` folder. */
export async function fetchSources(paths: readonly { path: string; url: string }[]): Promise<SourceFile[]> {
  return Promise.all(
    paths.map(async ({ path, url }) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Could not load ${url}`);
      }
      return { path, code: await response.text() };
    }),
  );
}

/** `a/b.ts` + `../c/d` → `c/d`. */
function join(from: string, spec: string): string {
  const parts = from.split('/').slice(0, -1);
  for (const part of spec.split('/')) {
    if (part === '..') parts.pop();
    else if (part !== '.') parts.push(part);
  }
  return parts.join('/');
}

const json = (value: unknown) => JSON.stringify(value, null, 2) + '\n';
const sorted = (o: Record<string, string>) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'demo';
const escape = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
