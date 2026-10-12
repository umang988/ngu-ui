import { normalize, join } from '@angular-devkit/core';
import { SchematicsException, type Tree } from '@angular-devkit/schematics';
import { readWorkspace } from '@schematics/angular/utility';

export interface ProjectInfo {
  readonly name: string;
  readonly root: string;
  readonly sourceRoot: string;
  readonly prefix: string;
}

export async function projectInfo(tree: Tree, requested?: string): Promise<ProjectInfo> {
  const workspace = await readWorkspace(tree);
  const name = requested ?? (workspace.extensions['defaultProject'] as string | undefined) ?? [...workspace.projects.keys()].find((k) => workspace.projects.get(k)!.extensions['projectType'] === 'application');
  const project = name ? workspace.projects.get(name) : undefined;
  if (!name || !project) {
    throw new SchematicsException(`No project "${requested ?? ''}" in angular.json. Pass --project.`);
  }
  const root = project.root;
  return {
    name,
    root,
    sourceRoot: project.sourceRoot ?? join(normalize(root), 'src'),
    prefix: (project.prefix as string | undefined) ?? 'app',
  };
}

/** Every `.ts` file under `dir`, except specs and declaration files. */
export function sourceFiles(tree: Tree, dir: string): Map<string, string> {
  const files = new Map<string, string>();
  tree.getDir(dir).visit((path) => {
    if (path.endsWith('.ts') && !path.endsWith('.spec.ts') && !path.endsWith('.d.ts') && !path.includes('/node_modules/')) {
      files.set(path, tree.readText(path));
    }
  });
  return files;
}

/** A relative module specifier from one file to another, without the extension. */
export function relativeImport(from: string, to: string): string {
  const a = from.split('/').slice(0, -1).filter(Boolean);
  const b = to.replace(/\.ts$/, '').split('/').filter(Boolean);
  let i = 0;
  while (i < a.length && i < b.length - 1 && a[i] === b[i]) {
    i++;
  }
  const up = a.length - i;
  const rel = [...Array(up).fill('..'), ...b.slice(i)].join('/');
  return up === 0 ? `./${rel}` : rel;
}
