import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CodeBlock } from '../ui/code-block';
import { DemoCard } from './demo-card';
import { DocMarkdown } from './doc-markdown';
import { ApiRows } from './api-table';
import { DocText } from './doc-text';
import type { DocSection } from './model';

/**
 * One section of a doc page: a heading with a link to itself, paragraphs, then a live demo,
 * code, a table or a list. Subsections render the same way one heading level down.
 */
@Component({
  selector: 'app-doc-section',
  imports: [RouterLink, CodeBlock, DemoCard, DocText, DocMarkdown, ApiRows],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'doc-section' },
  template: `
    @let s = section();
    <div class="doc-section__head">
      @if (level() === 2) {
        <h2 [id]="s.id">{{ s.title }}</h2>
      } @else {
        <h3 [id]="s.id">{{ s.title }}</h3>
      }
      <a
        class="doc-section__anchor"
        [routerLink]="[]"
        [fragment]="s.id"
        queryParamsHandling="preserve"
        [attr.aria-label]="'Link to ' + s.title"
        >#</a
      >
    </div>
    @for (p of s.text ?? []; track $index) {
      <p class="doc-section__text"><app-doc-text [text]="p" /></p>
    }
    @if (s.list; as list) {
      <ul class="doc-section__list">
        @for (item of list; track $index) {
          <li><app-doc-text [text]="item" /></li>
        }
      </ul>
    }
    @if (s.demo; as demo) {
      <app-demo-card [demo]="demo" />
    }
    @for (c of s.code ?? []; track $index) {
      <app-code [code]="c.code" [language]="c.lang ?? 'angular-ts'" [filename]="c.filename" />
    }
    @if (s.table; as t) {
      <div class="doc-table" tabindex="0" role="region" [attr.aria-label]="t.caption">
        <table>
          <caption class="visually-hidden">
            {{
              t.caption
            }}
          </caption>
          <thead>
            <tr>
              @for (c of t.columns; track $index) {
                <th scope="col">{{ c }}</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (row of t.rows; track $index) {
              <tr>
                @for (cell of row; track $index) {
                  <td><app-doc-text [text]="cell" /></td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
    @if (s.api; as rows) {
      <app-api-rows [rows]="rows" [label]="s.title" />
    }
    @if (s.markdown; as md) {
      <app-doc-markdown [src]="md" />
    }
    @for (p of s.after ?? []; track $index) {
      <p class="doc-section__text"><app-doc-text [text]="p" /></p>
    }
    @for (child of s.children ?? []; track child.id) {
      <app-doc-section [section]="child" [level]="3" />
    }
  `,
})
export class DocSectionView {
  readonly section = input.required<DocSection>();
  readonly level = input<2 | 3>(2);
}
