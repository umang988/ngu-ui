import type { FieldModel, GroupModel } from './model';

const IDENT = /^[A-Za-z_$][\w$]*$/;

function key(name: string): string {
  return IDENT.test(name) ? name : JSON.stringify(name);
}

function str(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function indent(depth: number): string {
  return '  '.repeat(depth);
}

/** The TypeScript type of a field, for generated interfaces. */
export function tsTypeOf(field: FieldModel, depth = 0): string {
  const base = ((): string => {
    switch (field.kind) {
      case 'text':
        return 'string';
      case 'number':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'date':
        return 'Date';
      case 'choice': {
        const union = field.values.map((v) => (typeof v === 'number' ? String(v) : str(v))).join(' | ') || 'string';
        return field.multiple ? `(${union})[]` : union;
      }
      case 'tags':
        return 'string[]';
      case 'group':
        return field.typeName ?? objectType(field.fields, depth);
      case 'list': {
        const item = tsTypeOf(field.item, depth);
        return /[|&]/.test(item) && !item.startsWith('{') ? `(${item})[]` : `${item}[]`;
      }
      case 'record':
        return 'Record<string, string>';
      case 'unknown':
        return field.tsType;
    }
  })();
  return field.nullable ? `${base} | null` : base;
}

function objectType(fields: readonly FieldModel[], depth: number): string {
  const lines = fields.map((f) => `${indent(depth + 1)}${key(f.key)}: ${tsTypeOf(f, depth + 1)};`);
  return `{\n${lines.join('\n')}\n${indent(depth)}}`;
}

/** `export interface Name { ... }`, with the hint of each field as its doc comment. */
export function interfaceCode(name: string, group: GroupModel, nested: readonly GroupModel[] = []): string {
  const out: string[] = [];
  for (const g of [...nested, group]) {
    const lines: string[] = [];
    for (const f of g.fields) {
      if (f.hint) {
        lines.push(`  /** ${f.hint.replace(/\*\//g, '*\\/')} */`);
      }
      lines.push(`  ${key(f.key)}: ${tsTypeOf(f, 1)};`);
    }
    out.push(`export interface ${g === group ? name : g.typeName} {\n${lines.join('\n')}\n}`);
  }
  return out.join('\n\n');
}

/** The value a new form starts with. */
export function initialCode(field: FieldModel, depth: number): string {
  switch (field.kind) {
    case 'text':
      return field.nullable && field.initial === undefined ? 'null' : str(field.initial ?? '');
    case 'number':
      return field.nullable && field.initial === undefined ? 'null' : String(field.initial ?? 0);
    case 'boolean':
      return String(field.initial ?? false);
    case 'date':
      return field.nullable ? 'null' : 'new Date()';
    case 'choice': {
      if (field.multiple) {
        const list = Array.isArray(field.initial) ? field.initial : [];
        return `[${list.map((v) => (typeof v === 'number' ? String(v) : str(v))).join(', ')}]`;
      }
      const first = field.initial ?? (field.nullable ? null : field.values[0]);
      return first === null || first === undefined ? 'null' : typeof first === 'number' ? String(first) : str(first as string);
    }
    case 'tags':
      return '[]';
    case 'group':
      return objectCode(field.fields, depth, (f, d) => initialCode(f, d));
    case 'list':
      return field.min && field.min > 0 ? `[${initialCode(field.item, depth)}]` : '[]';
    case 'record':
      return '{}';
    case 'unknown':
      return `null as unknown as ${field.tsType}`;
  }
}

function objectCode(fields: readonly FieldModel[], depth: number, value: (f: FieldModel, depth: number) => string): string {
  if (!fields.length) {
    return '{}';
  }
  const lines = fields.map((f) => `${indent(depth + 1)}${key(f.key)}: ${value(f, depth + 1)},`);
  return `{\n${lines.join('\n')}\n${indent(depth)}}`;
}

/** The spec entry of a field: a label string when nothing else is needed. */
export function specCode(field: FieldModel, depth: number): string {
  const props: string[] = [];
  const add = (name: string, value: string | undefined) => {
    if (value !== undefined) {
      props.push(`${name}: ${value}`);
    }
  };
  const num = (n: number | undefined) => (n === undefined ? undefined : String(n));
  add('label', str(field.label));
  switch (field.kind) {
    case 'text':
      add('type', field.type ? str(field.type) : field.nullable ? str('text') : undefined);
      add('minLength', num(field.minLength));
      add('maxLength', num(field.maxLength));
      add('pattern', field.pattern ? `/${field.pattern.replace(/\//g, '\\/')}/` : undefined);
      add('placeholder', field.placeholder ? str(field.placeholder) : undefined);
      break;
    case 'number':
      add('type', field.nullable ? str('number') : undefined);
      add('min', num(field.min));
      add('max', num(field.max));
      add('step', num(field.step));
      break;
    case 'boolean':
      break;
    case 'date':
      add('type', str('date'));
      break;
    case 'choice': {
      const type = field.multiple ? 'checkbox' : field.values.length <= 3 ? 'radio' : 'select';
      add('type', str(type));
      const options = field.values.map((v, i) => {
        const label = field.labels?.[i] ?? (typeof v === 'number' ? String(v) : humanizeValue(v));
        return `{ value: ${typeof v === 'number' ? String(v) : str(v)}, label: ${str(label)} }`;
      });
      add('options', `[\n${options.map((o) => `${indent(depth + 2)}${o},`).join('\n')}\n${indent(depth + 1)}]`);
      add('min', num(field.minItems));
      add('max', num(field.maxItems));
      break;
    }
    case 'tags':
      add('type', str('tags'));
      add('min', num(field.minItems));
      add('max', num(field.maxItems));
      break;
    case 'group': {
      const fields = objectCode(field.fields, depth + 1, (f, d) => specCode(f, d));
      return field.label ? `{\n${indent(depth + 1)}title: ${str(field.label)},\n${indent(depth + 1)}fields: ${fields},\n${indent(depth)}}` : fields;
    }
    case 'list': {
      const item = field.item.kind === 'group' ? objectCode(field.item.fields, depth + 1, (f, d) => specCode(f, d)) : specCode(field.item, depth + 1);
      const lines = [
        `title: ${str(field.label)}`,
        `item: ${item}`,
        `newItem: ${initialCode(field.item, depth + 1)}`,
        ...(field.min !== undefined ? [`min: ${field.min}`] : []),
        ...(field.max !== undefined ? [`max: ${field.max}`] : []),
      ];
      return `{\n${lines.map((l) => `${indent(depth + 1)}${l},`).join('\n')}\n${indent(depth)}}`;
    }
    case 'record':
      return `{ title: ${str(field.label)}, fields: [] }`;
    case 'unknown':
      // Compiles as is, so the rest of the form can be tried; the TODO says what to write.
      return `${str(field.label)} as never /* TODO: ${field.todo ?? `describe "${field.key}" (${field.tsType}), for example as a custom type: https://ngu-form.netlify.app/custom-types`} */`;
  }
  add('hint', field.hint ? str(field.hint) : undefined);
  if (field.required && field.kind !== 'boolean') {
    props.push('required: true');
  }
  const comment = field.todo ? ` /* TODO: ${field.todo.replace(/\*\//g, '* /')} */` : '';
  if (props.length === 1) {
    return str(field.label) + comment;
  }
  if (props.join(', ').length + depth * 2 < 80 && !props.some((p) => p.includes('\n'))) {
    return `{ ${props.join(', ')} }${comment}`;
  }
  return `{\n${props.map((p) => `${indent(depth + 1)}${p},`).join('\n')}\n${indent(depth)}}${comment}`;
}

function humanizeValue(value: string): string {
  const text = value.replace(/[_-]+/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2').trim();
  return text ? text[0].toUpperCase() + text.slice(1).toLowerCase() : value;
}

/** The initial value and spec of a whole form, as object literals at the given depth. */
export function formCode(group: GroupModel, depth: number): { initial: string; spec: string } {
  return {
    initial: objectCode(group.fields, depth, (f, d) => initialCode(f, d)),
    spec: objectCode(group.fields, depth, (f, d) => specCode(f, d)),
  };
}
