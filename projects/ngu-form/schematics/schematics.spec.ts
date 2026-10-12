import { SchematicTestRunner, type UnitTestTree } from '@angular-devkit/schematics/testing';
import { HostTree } from '@angular-devkit/schematics';
import * as path from 'node:path';
import * as ts from 'typescript';
import { convertFormly, findFormlyArrays } from './from-formly/convert';
import { formCode, interfaceCode } from './utils/emit';
import { modelFromJsonSchema } from './utils/from-json-schema';
import { modelFromInterface } from './utils/from-ts';
import { humanize } from './utils/model';

// The runner loads factories with require(), so it runs the built schematics: node projects/ngu-form/schematics/build.mjs first.
const collection = path.join(import.meta.dirname, '../../../dist/ngu-form/schematics/collection.json');
const runner = new SchematicTestRunner('ngu-form', collection);

/** A minimal standalone app, as `ng new` makes it. */
async function app(): Promise<UnitTestTree> {
  const tree = new HostTree() as unknown as UnitTestTree;
  const workspace = await runner.runExternalSchematic('@schematics/angular', 'workspace', { name: 'ws', newProjectRoot: 'projects', version: '22.2.0' });
  return runner.runExternalSchematic('@schematics/angular', 'application', { name: 'demo', standalone: true, skipTests: true, style: 'css' }, workspace ?? tree);
}

describe('labels', () => {
  it('turns property names into labels', () => {
    expect(humanize('firstName')).toBe('First name');
    expect(humanize('zip_code')).toBe('Zip code');
    expect(humanize('homepageURL')).toBe('Homepage URL');
  });
});

describe('interface reader', () => {
  const files = new Map([
    [
      '/src/app/models.ts',
      `export interface Address { street: string; city: string }
       export interface Line { sku: string; qty: number }
       export type Plan = 'free' | 'pro' | 'team' | 'enterprise';
       export interface Signup {
         /** As on your ID */
         fullName: string;
         email: string;
         age?: number;
         plan: Plan;
         size: 's' | 'm';
         newsletter: boolean;
         topics: ('news' | 'tips')[];
         tags: string[];
         birthday: Date | null;
         address: Address;
         lines: Line[];
         extra: Record<string, string>;
         when: Map<string, number>;
       }`,
    ],
  ]);

  it('maps each property to a field', () => {
    const found = modelFromInterface(ts, files, 'Signup')!;
    expect(found.file).toBe('/src/app/models.ts');
    const kinds = Object.fromEntries(found.group.fields.map((f) => [f.key, f.kind]));
    expect(kinds).toEqual({
      fullName: 'text',
      email: 'text',
      age: 'number',
      plan: 'choice',
      size: 'choice',
      newsletter: 'boolean',
      topics: 'choice',
      tags: 'tags',
      birthday: 'date',
      address: 'group',
      lines: 'list',
      extra: 'record',
      when: 'unknown',
    });
    const fullName = found.group.fields[0];
    expect(fullName).toMatchObject({ label: 'Full name', hint: 'As on your ID', required: true });
  });

  it('writes an initial value and a spec that ngu-form accepts', () => {
    const found = modelFromInterface(ts, files, 'Signup')!;
    const { initial, spec } = formCode(found.group, 0);
    expect(initial).toContain("plan: 'free',");
    expect(initial).toContain('birthday: null,');
    expect(initial).toContain('when: null as unknown as Map<string, number>,');
    expect(spec).toContain("email: { label: 'Email', type: 'email', required: true },");
    expect(spec).toContain("type: 'select'");
    expect(spec).toContain("size: {\n    label: 'Size',\n    type: 'radio'");
    expect(spec).toContain("type: 'checkbox'");
    expect(spec).toContain("birthday: { label: 'Birthday', type: 'date' },");
    expect(spec).toContain("newItem: {\n      sku: '',\n      qty: 0,\n    },");
    expect(spec).toContain("extra: { title: 'Extra', fields: [] },");
    expect(spec).toContain("when: 'When' as never /* TODO");
  });
});

describe('JSON Schema reader', () => {
  const doc = {
    components: {
      schemas: {
        Address: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] },
        Signup: {
          type: 'object',
          required: ['email', 'plan'],
          properties: {
            id: { type: 'integer', readOnly: true },
            email: { type: 'string', format: 'email', description: 'Work email' },
            password: { type: 'string', format: 'password', minLength: 8 },
            plan: { type: 'string', enum: ['free', 'pro'], default: 'pro' },
            seats: { type: 'integer', minimum: 1, maximum: 50 },
            starts: { type: 'string', format: 'date' },
            bio: { type: 'string', maxLength: 1000 },
            code: { type: 'string', pattern: '^[A-Z]{3}$' },
            tags: { type: 'array', items: { type: 'string' }, maxItems: 5 },
            address: { $ref: '#/components/schemas/Address' },
            nickname: { type: ['string', 'null'] },
            either: { oneOf: [{ type: 'string' }, { type: 'number' }] },
          },
        },
      },
    },
  };

  it('reads types, formats, rules and references', () => {
    const { group, nested } = modelFromJsonSchema(doc, { $ref: '#/components/schemas/Signup' });
    const byKey = Object.fromEntries(group.fields.map((f) => [f.key, f]));
    expect(byKey['id']).toBeUndefined();
    expect(byKey['email']).toMatchObject({ kind: 'text', type: 'email', required: true, hint: 'Work email' });
    expect(byKey['plan']).toMatchObject({ kind: 'choice', values: ['free', 'pro'], initial: 'pro' });
    expect(byKey['seats']).toMatchObject({ kind: 'number', min: 1, max: 50, step: 1 });
    expect(byKey['starts']).toMatchObject({ kind: 'text', type: 'date' });
    expect(byKey['bio']).toMatchObject({ kind: 'text', type: 'textarea', maxLength: 1000 });
    expect(byKey['tags']).toMatchObject({ kind: 'tags', maxItems: 5 });
    expect(byKey['address']).toMatchObject({ kind: 'group', typeName: 'Address' });
    expect(byKey['nickname']).toMatchObject({ kind: 'text', nullable: true });
    expect(byKey['either'].kind).toBe('unknown');
    expect(nested.map((g) => g.typeName)).toEqual(['Address']);
    const code = interfaceCode('Signup', group, nested);
    expect(code).toContain('export interface Address {\n  city: string;\n}');
    expect(code).toContain("plan: 'free' | 'pro';");
    expect(code).toContain('address: Address;');
    expect(code).toContain('nickname: string | null;');
  });
});

describe('formly converter', () => {
  const source = ts.createSourceFile(
    'x.ts',
    `const fields: FormlyFieldConfig[] = [
      { key: 'email', type: 'input', props: { label: 'Email address', type: 'email', required: true } },
      { key: 'age', type: 'input', props: { type: 'number', min: 18 } },
      { key: 'address.city', type: 'input', props: { label: 'City' } },
      { fieldGroupClassName: 'row', fieldGroup: [{ key: 'first', type: 'input' }] },
      { key: 'role', type: 'select', props: { options: [{ value: 'a', label: 'Admin' }, { value: 'u', label: 'User' }] } },
      { key: 'agree', type: 'checkbox', props: { label: 'Agree' }, hideExpression: '!model.email' },
      { key: 'items', type: 'repeat', fieldArray: { fieldGroup: [{ key: 'sku', type: 'input', props: { required: true } }] } },
    ];`,
    ts.ScriptTarget.Latest,
    true,
  );

  it('finds the array and maps fields, groups, dotted keys and lists', () => {
    const [array] = findFormlyArrays(ts, source);
    expect(array.name).toBe('fields');
    const group = convertFormly(ts, array.node);
    expect(group.fields.map((f) => `${f.key}:${f.kind}`)).toEqual(['email:text', 'age:number', 'address:group', 'first:text', 'role:choice', 'agree:boolean', 'items:list']);
    const { spec } = formCode(group, 0);
    expect(spec).toContain("email: { label: 'Email address', type: 'email', required: true },");
    expect(spec).toContain("age: { label: 'Age', min: 18 },");
    expect(spec).toContain("label: 'Admin'");
    expect(spec).toContain('TODO: hideExpression');
  });
});

describe('schematics', () => {
  it('ng add registers the Material renderer and uploads, and creates a sample', async () => {
    const tree = await runner.runSchematic('ng-add', { project: 'demo', renderer: 'material', uploads: true, skipInstall: true }, await app());
    const config = tree.readText('/projects/demo/src/app/app.config.ts');
    expect(config).toContain("import { provideNguMaterial } from 'ngu-form/material';");
    expect(config).toContain('provideNguMaterial()');
    expect(config).toContain('provideNguUpload()');
    const pkg = JSON.parse(tree.readText('/package.json'));
    expect(pkg.dependencies['@angular/material']).toBeDefined();
    expect(tree.readText('/projects/demo/src/app/sample-form/sample-form.ts')).toContain('defineForm(this.initial');
  });

  it('ng add with PrimeNG adds the theme provider too', async () => {
    const tree = await runner.runSchematic('ng-add', { project: 'demo', renderer: 'primeng', sample: false, skipInstall: true }, await app());
    const config = tree.readText('/projects/demo/src/app/app.config.ts');
    expect(config).toContain('providePrimeNG({ theme: { preset: ');
    expect(config).toContain('provideNguPrimeNG()');
    expect(tree.exists('/projects/demo/src/app/sample-form/sample-form.ts')).toBe(false);
  });

  it('form generates a component from an interface', async () => {
    const base = await app();
    base.create('/projects/demo/src/app/models/profile.ts', 'export interface Profile { name: string; email: string; plan: "a" | "b" }');
    const tree = await runner.runSchematic('form', { project: 'demo', name: 'profile', model: 'Profile' }, base);
    const file = tree.readText('/projects/demo/src/app/profile-form/profile-form.ts');
    expect(file).toContain("import type { Profile } from '../models/profile';");
    expect(file).toContain("selector: 'app-profile-form'");
    expect(file).toContain('export class ProfileForm');
    expect(file).toContain('private readonly initial: Profile = {');
    expect(tree.readText('/projects/demo/src/app/profile-form/profile-form.spec.ts')).toContain(".toBe(3)");
  });

  it('from-schema generates a model and a component from an OpenAPI operation', async () => {
    const base = await app();
    base.create(
      '/api.json',
      JSON.stringify({
        openapi: '3.1.0',
        paths: { '/users': { post: { operationId: 'createUser', requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/NewUser' } } } } } } },
        components: { schemas: { NewUser: { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' }, admin: { type: 'boolean' } } } } },
      }),
    );
    const tree = await runner.runSchematic('from-schema', { project: 'demo', name: 'new-user', schema: 'api.json', operation: 'createUser' }, base);
    expect(tree.readText('/projects/demo/src/app/new-user-form/new-user.ts')).toContain('export interface NewUser {\n  email: string;\n  admin: boolean;\n}');
    const component = tree.readText('/projects/demo/src/app/new-user-form/new-user-form.ts');
    expect(component).toContain("import type { NewUser } from './new-user';");
    expect(component).toContain("email: { label: 'Email', type: 'email', required: true },");
  });

  it('from-formly writes a side file with the converted spec', async () => {
    const base = await app();
    base.create('/projects/demo/src/app/legacy.ts', "export const signupFields: FormlyFieldConfig[] = [{ key: 'name', type: 'input', props: { label: 'Name', required: true } }];");
    const tree = await runner.runSchematic('from-formly', { path: 'projects/demo/src/app/legacy.ts' }, base);
    const out = tree.readText('/projects/demo/src/app/legacy.ngu-form.ts');
    expect(out).toContain('export interface SignupModel {');
    expect(out).toContain('export const signupInitial: SignupModel = {');
    expect(out).toContain('export const signupSpec: FormSpec<SignupModel> = {');
    expect(out).toContain("name: { label: 'Name', required: true },");
  });
});
