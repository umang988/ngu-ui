// The few Node.js globals the schematics use, so they compile without @types/node.
declare const require: { (id: string): any; resolve(id: string, options?: { paths?: string[] }): string };
declare const process: { cwd(): string };
