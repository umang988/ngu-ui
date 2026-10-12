import { humanize, textTypeFor, type FieldModel, type GroupModel, type TextModel } from './model';

/** The parts of JSON Schema (draft 7 to 2020-12, and OpenAPI 3 schemas) the importer reads. */
export interface JsonSchema {
  $ref?: string;
  type?: string | string[];
  title?: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean | JsonSchema;
  items?: JsonSchema;
  enum?: unknown[];
  const?: unknown;
  format?: string;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number | boolean;
  exclusiveMaximum?: number | boolean;
  multipleOf?: number;
  minItems?: number;
  maxItems?: number;
  default?: unknown;
  nullable?: boolean;
  allOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  writeOnly?: boolean;
  readOnly?: boolean;
  'x-enum-labels'?: string[];
  'x-enumNames'?: string[];
}

/** Follows `#/...` references inside one document. Other references are left as TODOs. */
export function resolvePointer(document: unknown, pointer: string): unknown {
  if (!pointer.startsWith('#')) {
    throw new Error(`Only references inside the same document are supported, not "${pointer}".`);
  }
  let node: unknown = document;
  for (const raw of pointer.slice(1).split('/').filter(Boolean)) {
    const part = decodeURIComponent(raw).replace(/~1/g, '/').replace(/~0/g, '~');
    if (node === null || typeof node !== 'object' || !(part in (node as object))) {
      throw new Error(`"${pointer}" does not point at anything in the schema.`);
    }
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

/**
 * The schema of an OpenAPI operation's JSON request body, by `operationId`, or of a path and
 * method such as `post /users`.
 */
export function requestBodySchema(document: Record<string, any>, operation: string): JsonSchema {
  const [method, path] = operation.includes(' ') ? operation.split(/\s+/, 2) : [undefined, undefined];
  for (const [p, item] of Object.entries<Record<string, any>>(document['paths'] ?? {})) {
    for (const [m, op] of Object.entries<Record<string, any>>(item)) {
      const matches = method ? m.toLowerCase() === method.toLowerCase() && p === path : op?.['operationId'] === operation;
      if (matches) {
        let body = op['requestBody'];
        if (body?.$ref) {
          body = resolvePointer(document, body.$ref);
        }
        const content = body?.['content'] ?? {};
        const json = content['application/json'] ?? Object.entries<any>(content).find(([type]) => type.includes('json'))?.[1];
        if (!json?.schema) {
          throw new Error(`Operation "${operation}" has no JSON request body.`);
        }
        return json.schema;
      }
    }
  }
  throw new Error(`No operation "${operation}" in the OpenAPI document.`);
}

/** The name of the schema a `$ref` points at: `#/components/schemas/Address` → `Address`. */
function refName(ref: string): string {
  return ref.split('/').pop()!.replace(/[^A-Za-z0-9_$]/g, '');
}

export interface SchemaModel {
  readonly group: GroupModel;
  /** Named object schemas met through `$ref`, each emitted as its own interface. */
  readonly nested: readonly GroupModel[];
}

/** Builds the field model of an object schema. */
export function modelFromJsonSchema(document: unknown, schema: JsonSchema): SchemaModel {
  const nested = new Map<string, GroupModel>();
  const visiting = new Set<string>();

  const deref = (s: JsonSchema): { schema: JsonSchema; name?: string } => {
    let name: string | undefined;
    let current = s;
    for (let i = 0; current.$ref && i < 20; i++) {
      name = refName(current.$ref);
      current = resolvePointer(document, current.$ref) as JsonSchema;
    }
    if (current.allOf?.length) {
      const merged: JsonSchema = { ...current, allOf: undefined, properties: { ...current.properties }, required: [...(current.required ?? [])] };
      for (const part of current.allOf) {
        const p = deref(part).schema;
        Object.assign(merged.properties!, p.properties);
        merged.required!.push(...(p.required ?? []));
        merged.type ??= p.type;
      }
      current = merged;
    }
    return { schema: current, name };
  };

  const typesOf = (s: JsonSchema): { type: string | undefined; nullable: boolean } => {
    const list = Array.isArray(s.type) ? s.type : s.type ? [s.type] : [];
    const nullable = s.nullable === true || list.includes('null');
    const type = list.find((t) => t !== 'null') ?? (s.properties ? 'object' : s.items ? 'array' : s.enum ? typeof s.enum.find((v) => v !== null) : undefined);
    return { type, nullable };
  };

  const fieldOf = (key: string, raw: JsonSchema, required: boolean): FieldModel => {
    const { schema: s, name } = deref(raw);
    const { type, nullable } = typesOf(s);
    const label = s.title ?? raw.title ?? humanize(key);
    const hint = s.description ?? raw.description;
    const base = { key, label, hint, required: required || undefined, nullable: nullable || undefined };

    if (s.oneOf || s.anyOf) {
      return { ...base, kind: 'unknown', tsType: 'unknown', todo: `"${key}" is a oneOf/anyOf; pick one shape or use a custom type` };
    }
    if (s.enum || s.const !== undefined) {
      const values = (s.enum ?? [s.const]).filter((v): v is string | number => typeof v === 'string' || typeof v === 'number');
      const labels = s['x-enum-labels'] ?? s['x-enumNames'];
      return { ...base, kind: 'choice', values, labels, multiple: false, initial: s.default as string | number | undefined };
    }
    switch (type) {
      case 'string':
        return { ...base, kind: 'text', ...textFormat(key, s), minLength: s.minLength, maxLength: s.maxLength, pattern: s.pattern, initial: typeof s.default === 'string' ? s.default : undefined };
      case 'integer':
      case 'number': {
        const min = typeof s.exclusiveMinimum === 'number' ? s.exclusiveMinimum + (type === 'integer' ? 1 : 0) : s.minimum;
        const max = typeof s.exclusiveMaximum === 'number' ? s.exclusiveMaximum - (type === 'integer' ? 1 : 0) : s.maximum;
        return { ...base, kind: 'number', min, max, step: s.multipleOf ?? (type === 'integer' ? 1 : undefined), initial: typeof s.default === 'number' ? s.default : undefined };
      }
      case 'boolean':
        return { ...base, kind: 'boolean', initial: typeof s.default === 'boolean' ? s.default : undefined, required: undefined };
      case 'array': {
        const items = s.items ? deref(s.items) : undefined;
        const itemSchema = items?.schema;
        if (itemSchema?.enum) {
          const values = itemSchema.enum.filter((v): v is string | number => typeof v === 'string' || typeof v === 'number');
          return { ...base, kind: 'choice', values, multiple: true, minItems: s.minItems, maxItems: s.maxItems, labels: itemSchema['x-enum-labels'] ?? itemSchema['x-enumNames'] };
        }
        const itemType = itemSchema ? typesOf(itemSchema).type : undefined;
        if (itemType === 'string' && !itemSchema?.format) {
          return { ...base, kind: 'tags', minItems: s.minItems, maxItems: s.maxItems };
        }
        if (!s.items) {
          return { ...base, kind: 'unknown', tsType: 'unknown[]', todo: `"${key}" is an array without "items"` };
        }
        const item = fieldOf('item', s.items, false);
        return { ...base, kind: 'list', item, min: s.minItems, max: s.maxItems };
      }
      case 'object': {
        if (!s.properties && s.additionalProperties && typeof s.additionalProperties === 'object') {
          return { ...base, kind: 'record' };
        }
        const group = objectOf(s, name);
        return { ...group, ...base, required: undefined };
      }
    }
    return { ...base, kind: 'unknown', tsType: 'unknown', todo: `"${key}" has no type the importer understands` };
  };

  const objectOf = (s: JsonSchema, name?: string): GroupModel => {
    if (name && nested.has(name)) {
      return nested.get(name)!;
    }
    if (name && visiting.has(name)) {
      return { kind: 'group', key: '', label: '', fields: [], typeName: name, todo: `"${name}" refers to itself` };
    }
    if (name) {
      visiting.add(name);
    }
    const required = new Set(s.required ?? []);
    const fields = Object.entries(s.properties ?? {})
      .filter(([, p]) => !p.readOnly)
      .map(([key, p]) => fieldOf(key, p, required.has(key)));
    const group: GroupModel = { kind: 'group', key: '', label: '', fields, typeName: name };
    if (name) {
      visiting.delete(name);
      nested.set(name, group);
    }
    return group;
  };

  const { schema: root, name } = deref(schema);
  const group = objectOf(root);
  if (name) {
    nested.delete(name);
  }
  return { group, nested: [...nested.values()] };
}

function textFormat(key: string, s: JsonSchema): Pick<TextModel, 'type'> {
  switch (s.format) {
    case 'email':
    case 'idn-email':
      return { type: 'email' };
    case 'uri':
    case 'url':
    case 'iri':
      return { type: 'url' };
    case 'password':
      return { type: 'password' };
    case 'date':
      return { type: 'date' };
    case 'date-time':
      return { type: 'datetime-local' };
    case 'time':
      return { type: 'time' };
    case 'color':
      return { type: 'color' };
  }
  if (s.maxLength !== undefined && s.maxLength > 255) {
    return { type: 'textarea' };
  }
  return { type: textTypeFor(key) };
}
