import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CodeBlock } from 'docs-kit/ui/code-block';
import { NguTable, type NguTableColumn, type NguTableQuery } from 'ngu-table';
import { loadOrders, type Order } from '../demos/fake-server';

/** The code beside the live demo. Keep it in step with the template and the columns. */
const CODE = `readonly columns: NguTableColumn<Order>[] = [
  { field: 'code', header: 'Order' },
  { field: 'customer.name', header: 'Customer' },
  { field: 'owner', header: 'Owner', type: 'avatar' },
  { field: 'placed', header: 'Placed', type: 'date' },
  { field: 'total', header: 'Total', type: 'currency' },
  { field: 'status', header: 'Status', type: 'badge' },
];

readonly loadOrders = (q: NguTableQuery) =>
  this.http.get<NguTablePage<Order>>('/api/orders', { params: toParams(q) });`;

const TEMPLATE = `<ngu-table [fetchFn]="loadOrders" [columns]="columns"
           showEdit showDelete showExport />`;

interface Request {
  readonly id: number;
  readonly text: string;
}

@Component({
  selector: 'app-home',
  imports: [RouterLink, CodeBlock, NguTable],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  protected readonly code = CODE;
  protected readonly template = TEMPLATE;
  protected readonly load = loadOrders;

  protected readonly columns: NguTableColumn<Order>[] = [
    { field: 'code', header: 'Order' },
    { field: 'customer.name', header: 'Customer' },
    { field: 'owner', header: 'Owner', type: 'avatar' },
    { field: 'placed', header: 'Placed', type: 'date' },
    { field: 'total', header: 'Total', type: 'currency', currencyCode: 'INR' },
    { field: 'status', header: 'Status', type: 'badge' },
  ];

  /** The requests the table made, newest first. */
  protected readonly requests = signal<readonly Request[]>([]);
  private nextId = 0;

  protected readonly installCopied = signal(false);

  protected asked(q: NguTableQuery): void {
    const parts = [`page ${q.page}`, `size ${q.size}`];
    if (q.search) parts.push(`"${q.search}"`);
    if (q.sort) parts.push(`${q.sort} ${q.order}`);
    const request = { id: this.nextId++, text: parts.join(' · ') };
    this.requests.update((list) => [request, ...list].slice(0, 6));
  }

  protected async copyInstall(): Promise<void> {
    try {
      await navigator.clipboard.writeText('npm install ngu-table');
      this.installCopied.set(true);
      setTimeout(() => this.installCopied.set(false), 2000);
    } catch {
      // The command is visible; people can select it.
    }
  }
}
