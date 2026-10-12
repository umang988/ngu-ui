import type * as TS from 'typescript';
import { humanize, type FieldModel, type GroupModel } from '../utils/model';

type TypeScript = typeof TS;

/** One formly field config, read from an object literal. Values that are not literals are kept as source text. */
interface Literal {
  readonly [key: string]: unknown;
}

/** A value read from source: a literal, a nested literal, or the code it was written as. */
class Code {
  constructor(readonly text: string) {}
}

/** The formly field arrays found in a file. */
export interface FormlyArray {
  readonly name: string;
  readonly node: TS.ArrayLiteralExpression;
}

/** Arrays typed `FormlyFieldConfig[]`, or named `fields`, whose items look like field configs. */
export function findFormlyArrays(ts: TypeScript, source: TS.SourceFile): FormlyArray[] {
  const found: FormlyArray[] = [];
  const looksLikeFields = (array: TS.ArrayLiteralExpression) =>
    array.elements.length > 0 &&
    array.elements.every((e) => ts.isObjectLiteralExpression(e)) &&
    array.elements.some((e) => (e as TS.ObjectLiteralExpression).properties.some((p) => p.name && /^(key|type|props|templateOptions|fieldGroup)$/.test(p.name.getText())));
  const visit = (node: TS.Node) => {
    if ((ts.isVariableDeclaration(node) || ts.isPropertyDeclaration(node)) && node.initializer && ts.isArrayLiteralExpression(node.initializer)) {
      const typed = node.type?.getText().includes('FormlyFieldConfig');
      if ((typed || /fields$/i.test(node.name.getText())) && looksLikeFields(node.initializer)) {
        found.push({ name: node.name.getText(), node: node.initializer });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

function read(ts: TypeScript, node: TS.Expression): unknown {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  if (ts.isNumericLiteral(node)) {
    return Number(node.text);
  }
  if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(node.operand)) {
    return -Number(node.operand.text);
  }
  if (node.kind === ts.SyntaxKind.TrueKeyword) {
    return true;
  }
  if (node.kind === ts.SyntaxKind.FalseKeyword) {
    return false;
  }
  if (node.kind === ts.SyntaxKind.NullKeyword) {
    return null;
  }
  if (ts.isRegularExpressionLiteral(node)) {
    return new Code(node.text);
  }
  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.map((e) => read(ts, e));
  }
  if (ts.isObjectLiteralExpression(node)) {
    const out: Record<string, unknown> = {};
    for (const p of node.properties) {
      if (ts.isPropertyAssignment(p)) {
        out[p.name.getText().replace(/^['"]|['"]$/g, '')] = read(ts, p.initializer);
      } else if (ts.isMethodDeclaration(p) || ts.isShorthandPropertyAssignment(p)) {
        out[p.name.getText()] = new Code(p.getText());
      }
    }
    return out;
  }
  return new Code(node.getText());
}

const asString = (v: unknown) => (typeof v === 'string' ? v : undefined);
const asNumber = (v: unknown) => (typeof v === 'number' ? v : undefined);

/** Static `[{ value, label }]` options; formly also takes `{ value, label }` with `key`/`name`. */
function optionsOf(v: unknown): { values: (string | number)[]; labels: string[] } | undefined {
  if (!Array.isArray(v) || !v.every((o) => o && typeof o === 'object' && !(o instanceof Code))) {
    return undefined;
  }
  const values: (string | number)[] = [];
  const labels: string[] = [];
  for (const o of v as Literal[]) {
    const value = o['value'] ?? o['key'] ?? o['id'];
    if (typeof value !== 'string' && typeof value !== 'number') {
      return undefined;
    }
    values.push(value);
    labels.push(asString(o['label']) ?? asString(o['name']) ?? String(value));
  }
  return { values, labels };
}

/**
 * Converts formly field configs to the field model. Keys with dots become nested groups,
 * field groups without a key are flattened, and what cannot be carried over becomes a TODO.
 */
export function convertFormly(ts: TypeScript, array: TS.ArrayLiteralExpression): GroupModel {
  const configs = array.elements.map((e) => read(ts, e) as Literal);
  return { kind: 'group', key: '', label: '', fields: convertList(configs) };
}

function convertList(configs: readonly Literal[]): FieldModel[] {
  const out: FieldModel[] = [];
  for (const config of configs) {
    const key = asString(config['key']) ?? (typeof config['key'] === 'number' ? String(config['key']) : undefined);
    if (!key && Array.isArray(config['fieldGroup'])) {
      // A group without a key only lays fields out; its fields belong to the parent.
      out.push(...convertList(config['fieldGroup'] as Literal[]));
      continue;
    }
    if (!key) {
      continue;
    }
    const path = key.split('.');
    const field = convertOne(config, path[path.length - 1]);
    insert(out, path, field);
  }
  return out;
}

/** Puts a field at a dotted path, creating groups on the way. */
function insert(list: FieldModel[], path: readonly string[], field: FieldModel): void {
  if (path.length === 1) {
    list.push(field);
    return;
  }
  let group = list.find((f): f is GroupModel => f.kind === 'group' && f.key === path[0]);
  if (!group) {
    group = { kind: 'group', key: path[0], label: humanize(path[0]), fields: [] };
    list.push(group);
  }
  insert(group.fields as FieldModel[], path.slice(1), field);
}

function convertOne(config: Literal, key: string): FieldModel {
  const props = (config['props'] ?? config['templateOptions'] ?? {}) as Literal;
  const label = asString(props['label']) ?? humanize(key);
  const hint = asString(props['description']);
  const required = props['required'] === true;
  const todos: string[] = [];
  if (config['hideExpression'] !== undefined) {
    todos.push(`hideExpression → hidden: (model) => ...`);
  }
  if (config['expressions'] !== undefined || config['expressionProperties'] !== undefined) {
    todos.push('expressions → hidden, disabled, required or compute functions of the model');
  }
  if (config['validators'] !== undefined || config['asyncValidators'] !== undefined) {
    todos.push('validators → validate / validateAsync');
  }
  if (config['validation'] !== undefined) {
    todos.push('validation.messages → provideNguMessages or return the message from validate');
  }
  if (props['change'] !== undefined) {
    todos.push('props.change → onChange');
  }
  const type = asString(config['type']) ?? (Array.isArray(config['fieldGroup']) ? 'group' : config['fieldArray'] ? 'repeat' : 'input');
  const base = { key, label, hint, required: required || undefined, todo: todos.length ? todos.join('; ') : undefined };
  const def = config['defaultValue'];

  if (Array.isArray(config['fieldGroup'])) {
    return { ...base, kind: 'group', fields: convertList(config['fieldGroup'] as Literal[]), required: undefined };
  }
  if (config['fieldArray'] && typeof config['fieldArray'] === 'object' && !(config['fieldArray'] instanceof Code)) {
    const item = config['fieldArray'] as Literal;
    const itemModel: FieldModel = Array.isArray(item['fieldGroup'])
      ? { kind: 'group', key: 'item', label, fields: convertList(item['fieldGroup'] as Literal[]) }
      : convertOne(item, 'item');
    return { ...base, kind: 'list', item: itemModel, required: undefined };
  }
  const options = optionsOf(props['options']);
  switch (type) {
    case 'checkbox':
    case 'toggle':
      return { ...base, kind: 'boolean', initial: typeof def === 'boolean' ? def : undefined, required: undefined, todo: required ? [base.todo, 'a required checkbox: use type: \'consent\' or a validate rule'].filter(Boolean).join('; ') : base.todo };
    case 'radio':
    case 'select':
    case 'multicheckbox': {
      const multiple = type === 'multicheckbox' || props['multiple'] === true;
      if (!options) {
        return { ...base, kind: multiple ? 'tags' : 'text', todo: [base.todo, 'options are not a static list; pass them as options (a list, signal or function)'].filter(Boolean).join('; ') };
      }
      return { ...base, kind: 'choice', values: options.values, labels: options.labels, multiple, initial: def as string | number | undefined };
    }
    case 'textarea':
      return { ...base, kind: 'text', type: 'textarea', minLength: asNumber(props['minLength']), maxLength: asNumber(props['maxLength']), placeholder: asString(props['placeholder']), initial: asString(def) };
    case 'datepicker':
      return { ...base, kind: 'date', nullable: true };
    case 'input':
    default: {
      const inputType = asString(props['type']);
      if (inputType === 'number') {
        return { ...base, kind: 'number', min: asNumber(props['min']), max: asNumber(props['max']), step: asNumber(props['step']), initial: asNumber(def) };
      }
      const pattern = props['pattern'];
      const patternText = typeof pattern === 'string' ? pattern : pattern instanceof Code ? pattern.text.replace(/^\/|\/[a-z]*$/g, '') : undefined;
      const textType = inputType && ['email', 'password', 'url', 'tel', 'search', 'date', 'time', 'color'].includes(inputType) ? (inputType as 'email') : undefined;
      const unknownType = type !== 'input' ? `formly type "${type}" → a built-in type or a custom type` : undefined;
      return {
        ...base,
        kind: 'text',
        type: textType,
        minLength: asNumber(props['minLength']),
        maxLength: asNumber(props['maxLength']),
        pattern: patternText,
        placeholder: asString(props['placeholder']),
        initial: asString(def),
        todo: [base.todo, unknownType].filter(Boolean).join('; ') || undefined,
      };
    }
  }
}
