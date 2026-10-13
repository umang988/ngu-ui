import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DocText } from './doc-text';
import type { ApiGroup, ApiRow } from './model';

/** Rows of options, inputs or members: name, type, default and description. */
@Component({
  selector: 'app-api-rows',
  imports: [DocText],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: block' },
  template: `
    <div class="doc-table" tabindex="0" role="region" [attr.aria-label]="label()">
      <table>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Type</th>
            @if (hasDefaults()) {
              <th scope="col">Default</th>
            }
            <th scope="col">Description</th>
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.name) {
            <tr>
              <th scope="row">
                <code>{{ row.name }}</code>
                @if (row.note) {
                  <span class="doc-table__note">{{ row.note }}</span>
                }
              </th>
              <td>
                <code class="doc-table__type">{{ row.type }}</code>
              </td>
              @if (hasDefaults()) {
                <td>
                  @if (row.default) {
                    <code>{{ row.default }}</code>
                  }
                </td>
              }
              <td><app-doc-text [text]="row.description" /></td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class ApiRows {
  readonly rows = input.required<readonly ApiRow[]>();
  /** Read by screen readers as the table's name. */
  readonly label = input.required<string>();
  protected readonly hasDefaults = computed(() => this.rows().some((r) => r.default !== undefined));
}

/** One group of the API tab: options, inputs, outputs or members, as a table. */
@Component({
  selector: 'app-api-table',
  imports: [DocText, ApiRows],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'doc-section' },
  template: `
    @let g = group();
    <div class="doc-section__head">
      <h2 [id]="g.id">{{ g.title }}</h2>
    </div>
    @if (g.text) {
      <p class="doc-section__text"><app-doc-text [text]="g.text" /></p>
    }
    <app-api-rows [rows]="g.rows" [label]="g.title" />
  `,
})
export class ApiTable {
  readonly group = input.required<ApiGroup>();
}
