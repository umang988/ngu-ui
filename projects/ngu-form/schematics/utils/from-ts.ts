import type * as TS from 'typescript';
import { humanize, textTypeFor, type FieldModel, type GroupModel } from './model';

/** A TypeScript module, loaded from the project, so the generator follows its version. */
export type TypeScript = typeof TS;

export interface FoundModel {
  readonly name: string;
  /** Path of the file that declares it, for the import in the generated component. */
  readonly file: string;
  readonly group: GroupModel;
}

/**
 * Builds the field model of an interface or object type alias. Referenced interfaces in the
 * same set of files become groups and list items; anything else is an `unknown` field with a
 * TODO, so the generated code still compiles.
 */
export function modelFromInterface(ts: TypeScript, files: ReadonlyMap<string, string>, name: string): FoundModel | undefined {
  const declarations = new Map<string, { node: TS.InterfaceDeclaration | TS.TypeAliasDeclaration; file: string }>();
  for (const [file, text] of files) {
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    for (const statement of source.statements) {
      if ((ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement)) && !declarations.has(statement.name.text)) {
        declarations.set(statement.name.text, { node: statement, file });
      }
    }
  }
  const root = declarations.get(name);
  if (!root) {
    return undefined;
  }

  const seen = new Set<string>();
  const membersOf = (node: TS.InterfaceDeclaration | TS.TypeAliasDeclaration | TS.TypeLiteralNode): readonly TS.TypeElement[] | undefined => {
    if (ts.isInterfaceDeclaration(node)) {
      const own = [...node.members];
      for (const clause of node.heritageClauses ?? []) {
        for (const base of clause.types) {
          const decl = ts.isIdentifier(base.expression) ? declarations.get(base.expression.text) : undefined;
          const inherited = decl ? membersOf(decl.node) : undefined;
          if (inherited) {
            own.unshift(...inherited.filter((m) => !own.some((o) => o.name?.getText() === m.name?.getText())));
          }
        }
      }
      return own;
    }
    if (ts.isTypeAliasDeclaration(node)) {
      return ts.isTypeLiteralNode(node.type) ? node.type.members : undefined;
    }
    return node.members;
  };

  const fieldOf = (prop: TS.PropertySignature): FieldModel => {
    const key = prop.name.getText().replace(/^['"]|['"]$/g, '');
    const label = humanize(key);
    const hint = docOf(ts, prop);
    const optional = !!prop.questionToken;
    return typeField(prop.type, key, label, hint, optional);
  };

  const typeField = (node: TS.TypeNode | undefined, key: string, label: string, hint: string | undefined, optional: boolean): FieldModel => {
    if (!node) {
      return { kind: 'unknown', key, label, hint, tsType: 'unknown' };
    }
    // `T | null` and `T | undefined`
    let nullable = false;
    let type = node;
    if (ts.isUnionTypeNode(node)) {
      const rest = node.types.filter((t) => {
        const isNull = (ts.isLiteralTypeNode(t) && t.literal.kind === ts.SyntaxKind.NullKeyword) || t.kind === ts.SyntaxKind.UndefinedKeyword;
        nullable ||= isNull;
        return !isNull;
      });
      if (rest.length === 1) {
        type = rest[0];
      } else if (rest.every((t) => ts.isLiteralTypeNode(t) && (ts.isStringLiteral(t.literal) || ts.isNumericLiteral(t.literal)))) {
        const values = rest.map((t) => literalValue(ts, (t as TS.LiteralTypeNode).literal));
        return { kind: 'choice', key, label, hint, values, multiple: false, nullable: nullable || undefined, required: !optional && !nullable };
      } else {
        return { kind: 'unknown', key, label, hint, tsType: node.getText() };
      }
    }
    const base = { key, label, hint, nullable: nullable || undefined };
    if (ts.isParenthesizedTypeNode(type)) {
      return typeField(type.type, key, label, hint, optional);
    }
    switch (type.kind) {
      case ts.SyntaxKind.StringKeyword:
        return { ...base, kind: 'text', type: textTypeFor(key), required: !optional && !nullable };
      case ts.SyntaxKind.NumberKeyword:
        return { ...base, kind: 'number' };
      case ts.SyntaxKind.BooleanKeyword:
        return { ...base, kind: 'boolean' };
    }
    if (ts.isLiteralTypeNode(type) && (ts.isStringLiteral(type.literal) || ts.isNumericLiteral(type.literal))) {
      return { ...base, kind: 'choice', values: [literalValue(ts, type.literal)], multiple: false };
    }
    if (ts.isArrayTypeNode(type) || (ts.isTypeReferenceNode(type) && /^(Readonly)?Array$/.test(type.typeName.getText()) && type.typeArguments?.length === 1)) {
      const element = ts.isArrayTypeNode(type) ? type.elementType : type.typeArguments![0];
      const inner = ts.isParenthesizedTypeNode(element) ? element.type : element;
      if (inner.kind === ts.SyntaxKind.StringKeyword) {
        return { ...base, kind: 'tags' };
      }
      if (ts.isUnionTypeNode(inner) && inner.types.every((t) => ts.isLiteralTypeNode(t) && (ts.isStringLiteral(t.literal) || ts.isNumericLiteral(t.literal)))) {
        return { ...base, kind: 'choice', values: inner.types.map((t) => literalValue(ts, (t as TS.LiteralTypeNode).literal)), multiple: true };
      }
      const item = typeField(inner, 'item', label, undefined, false);
      if (item.kind === 'unknown') {
        return { ...base, kind: 'unknown', tsType: type.getText() };
      }
      return { ...base, kind: 'list', item };
    }
    if (ts.isTypeReferenceNode(type)) {
      const ref = type.typeName.getText();
      if (ref === 'Date') {
        return { ...base, kind: 'date' };
      }
      if (ref === 'Record' && type.typeArguments?.[0]?.kind === ts.SyntaxKind.StringKeyword && type.typeArguments[1]?.kind === ts.SyntaxKind.StringKeyword) {
        return { ...base, kind: 'record' };
      }
      const decl = declarations.get(ref);
      if (decl && !seen.has(ref)) {
        if (ts.isTypeAliasDeclaration(decl.node) && !ts.isTypeLiteralNode(decl.node.type)) {
          return typeField(decl.node.type, key, label, hint, optional);
        }
        const members = membersOf(decl.node);
        if (members) {
          seen.add(ref);
          const fields = members.filter(ts.isPropertySignature).map(fieldOf);
          seen.delete(ref);
          return { ...base, kind: 'group', fields, typeName: ref };
        }
      }
      return { ...base, kind: 'unknown', tsType: type.getText() };
    }
    if (ts.isTypeLiteralNode(type)) {
      return { ...base, kind: 'group', fields: type.members.filter(ts.isPropertySignature).map(fieldOf) };
    }
    return { ...base, kind: 'unknown', tsType: type.getText() };
  };

  const members = membersOf(root.node);
  if (!members) {
    return undefined;
  }
  seen.add(name);
  const fields = members.filter(ts.isPropertySignature).map(fieldOf);
  return { name, file: root.file, group: { kind: 'group', key: '', label: '', fields, typeName: name } };
}

function literalValue(ts: TypeScript, literal: TS.LiteralTypeNode['literal']): string | number {
  return ts.isNumericLiteral(literal) ? Number(literal.text) : (literal as TS.StringLiteral).text;
}

function docOf(ts: TypeScript, node: TS.Node): string | undefined {
  const docs = (node as { jsDoc?: { comment?: string | readonly { text: string }[] }[] }).jsDoc;
  const comment = docs?.[docs.length - 1]?.comment;
  if (!comment) {
    return undefined;
  }
  const text = typeof comment === 'string' ? comment : comment.map((c) => c.text).join('');
  return text.replace(/\s+/g, ' ').trim() || undefined;
}
