import { Component, provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication, type BootstrapContext } from '@angular/platform-browser';
import { provideServerRendering, renderApplication } from '@angular/platform-server';
import { Observable } from 'rxjs';
import { answer, type Order } from '../testing/helpers';
import { NguTable } from './table';
import type { NguTableColumn, NguTablePage, NguTableQuery } from './types';

@Component({
  selector: 'test-ssr-root',
  imports: [NguTable],
  template: `<ngu-table [fetchFn]="load" [columns]="columns" />`,
})
class SsrRoot {
  readonly columns: NguTableColumn<Order>[] = [{ field: 'code', header: 'Code' }];

  /** Answers later, like a real request, so rendering has something to wait for. */
  readonly load = (query: NguTableQuery) =>
    new Observable<NguTablePage<Order>>((subscriber) => {
      const timer = setTimeout(() => {
        subscriber.next(answer(query));
        subscriber.complete();
      }, 30);
      return () => clearTimeout(timer);
    });
}

describe('NguTable on the server', () => {
  it('waits for the first page, so the HTML has the rows', async () => {
    const html = await renderApplication(
      (context: BootstrapContext) =>
        bootstrapApplication(
          SsrRoot,
          { providers: [provideZonelessChangeDetection(), provideServerRendering()] },
          context,
        ),
      { document: '<html><head></head><body><test-ssr-root></test-ssr-root></body></html>' },
    );

    expect(html).toContain('ORD-001');
    expect(html).toContain('ORD-010');
    expect(html).toContain('Showing 1–10 of 57');
    expect(html).not.toContain('class="ngu-tbl-placeholder"');
  });
});
