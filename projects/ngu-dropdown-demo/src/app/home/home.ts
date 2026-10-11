import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CodeBlock } from 'docs-kit/ui/code-block';
import { NguDropdown, type NguDropdownQuery } from 'ngu-dropdown';
import { findCustomers, loadCustomers } from '../demos/fake-server';

/** The code beside the live demo. Keep it in step with the template. */
const SERVICE = `readonly loadCustomers = ({ page, size, search }: NguDropdownQuery) =>
  this.http.get<NguDropdownPage<Customer>>('/api/customers', {
    params: { page, size, search },
  });`;

const TEMPLATE = `<ngu-dropdown [fetchFn]="loadCustomers"
              [(value)]="customerId"
              optionValue="id" optionLabel="name" />`;

interface Request {
  readonly id: number;
  readonly page: number;
  readonly search: string;
}

@Component({
  selector: 'app-home',
  imports: [RouterLink, CodeBlock, NguDropdown],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  protected readonly service = SERVICE;
  protected readonly template = TEMPLATE;
  protected readonly load = loadCustomers;
  protected readonly lookup = findCustomers;

  protected readonly customerId = signal<number | null>(null);
  /** The requests the dropdown made, newest first. */
  protected readonly requests = signal<readonly Request[]>([]);
  private nextId = 0;

  protected readonly installCopied = signal(false);

  protected asked(query: NguDropdownQuery): void {
    const request = { id: this.nextId++, page: query.page, search: query.search };
    this.requests.update((list) => [request, ...list].slice(0, 7));
  }

  protected async copyInstall(): Promise<void> {
    try {
      await navigator.clipboard.writeText('npm install ngu-dropdown');
      this.installCopied.set(true);
      setTimeout(() => this.installCopied.set(false), 2000);
    } catch {
      // The command is visible; people can select it.
    }
  }
}
