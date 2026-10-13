import type { NguTablePage, NguTableQuery } from 'ngu-table';
import { Observable } from 'rxjs';

/** Stands in for your API: 5,000 orders, answered after 350 ms. */
export interface Order {
  id: number;
  code: string;
  customer: { name: string; city: string };
  region: Region;
  placed: string;
  total: number;
  status: Status;
  paid: boolean;
  owner: string;
  email: string;
  phone: string;
  fulfilled: number;
}

export type Region = 'North' | 'South' | 'East' | 'West';
export type Status = 'DRAFT' | 'PENDING' | 'ON_HOLD' | 'ACTIVE' | 'DELIVERED' | 'CANCELLED';

export const REGIONS: readonly Region[] = ['North', 'South', 'East', 'West'];
export const STATUSES: readonly Status[] = [
  'DRAFT',
  'PENDING',
  'ON_HOLD',
  'ACTIVE',
  'DELIVERED',
  'CANCELLED',
];

const LATENCY = 350;

const FIRST = ['Amber', 'Apex', 'Atlas', 'Cedar', 'Coastal', 'Crown', 'Delta', 'Golden', 'Harbor'];
const TRADE = ['Agro', 'Cables', 'Dairy', 'Exports', 'Foods', 'Logistics', 'Metals', 'Textiles'];
const KIND = ['Ltd', 'Pvt Ltd', 'LLP', '& Co', 'Traders', 'Industries', 'Enterprises'];
const CITIES: Record<Region, readonly string[]> = {
  North: ['Delhi', 'Jaipur', 'Lucknow', 'Chandigarh'],
  South: ['Chennai', 'Bengaluru', 'Kochi', 'Hyderabad'],
  East: ['Kolkata', 'Patna', 'Guwahati', 'Bhubaneswar'],
  West: ['Mumbai', 'Pune', 'Ahmedabad', 'Surat'],
};
const OWNERS = [
  'Asha Rao',
  'Vikram Shah',
  'Meera Iyer',
  'Rahul Verma',
  'Priya Nair',
  'Arjun Mehta',
  'Kavya Reddy',
  'Rohan Das',
];

/** The same order for the same id, every time. */
export function order(id: number): Order {
  const i = id - 1;
  const region = REGIONS[(i * 7) % 4];
  const owner = OWNERS[(i * 5) % OWNERS.length];
  const status = STATUSES[(i * 11) % STATUSES.length];
  const day = new Date(Date.UTC(2026, 0, 1) + ((i * 37) % 280) * 86_400_000);
  return {
    id,
    code: `SO-${10_000 + id}`,
    customer: {
      name: `${FIRST[i % FIRST.length]} ${TRADE[Math.floor(i / 9) % TRADE.length]} ${KIND[Math.floor(i / 72) % KIND.length]}`,
      city: CITIES[region][i % 4],
    },
    region,
    placed: day.toISOString().slice(0, 10),
    total: Math.round(((i * 7919) % 250_000) + 1_500) + ((i * 13) % 100) / 100,
    status,
    paid: status === 'DELIVERED' || (status === 'ACTIVE' && i % 2 === 0),
    owner,
    email: `${owner.split(' ')[0].toLowerCase()}@example.com`,
    phone: `+91 98${String(10_000_000 + ((i * 7_654_321) % 89_999_999)).slice(0, 8)}`,
    fulfilled:
      status === 'DELIVERED'
        ? 100
        : status === 'ACTIVE'
          ? (i * 17) % 100
          : status === 'DRAFT'
            ? 0
            : (i * 7) % 60,
  };
}

let all: readonly Order[] | undefined;
let many: readonly Order[] | undefined;

/** Built on the first request, not when the page loads. */
function orders(): readonly Order[] {
  return (all ??= Array.from({ length: 5_000 }, (_, i) => order(i + 1)));
}

/** 50,000 orders for the virtual scrolling demos, built only when one of them opens. */
export function manyOrders(): readonly Order[] {
  return (many ??= Array.from({ length: 50_000 }, (_, i) => order(i + 1)));
}

/** The first `count` orders, for tables that get their rows in hand. */
export function someOrders(count: number): Order[] {
  return orders()
    .slice(0, count)
    .map((o) => ({ ...o, customer: { ...o.customer } }));
}

function read(row: unknown, path: string): any {
  return path.split('.').reduce<any>((value, key) => value?.[key], row);
}

/**
 * `GET /orders?page&size&search&sort&order&status&region&paid`, as a Spring Data page.
 * `status` may be one value or a list.
 */
export function loadOrders(query: NguTableQuery): Observable<NguTablePage<Order>> {
  return answer(orders(), query);
}

/** The same API over 50,000 orders. */
export function loadManyOrders(query: NguTableQuery): Observable<NguTablePage<Order>> {
  return answer(manyOrders(), query);
}

function answer(all: readonly Order[], query: NguTableQuery): Observable<NguTablePage<Order>> {
  const term = query.search.toLowerCase();
  const { status, region, paid } = query.filters as {
    status?: Status | Status[] | null;
    region?: Region | null;
    paid?: boolean | null;
  };
  const statuses = status == null ? [] : Array.isArray(status) ? status : [status];

  let rows = all.filter(
    (o) =>
      (!term ||
        o.code.toLowerCase().includes(term) ||
        o.customer.name.toLowerCase().includes(term)) &&
      (!statuses.length || statuses.includes(o.status)) &&
      (!region || o.region === region) &&
      (paid == null || o.paid === paid),
  );

  if (query.sort) {
    const sign = query.order === 'desc' ? -1 : 1;
    const key = query.sort;
    rows = [...rows].sort((a, b) => {
      const x = read(a, key);
      const y = read(b, key);
      return sign * (typeof x === 'number' ? x - y : String(x).localeCompare(String(y)));
    });
  }

  const start = query.page * query.size;
  return later({
    content: rows.slice(start, start + query.size),
    totalElements: rows.length,
    totalPages: Math.ceil(rows.length / query.size),
  });
}

/** A server that is down. */
export function failOrders(): Observable<NguTablePage<Order>> {
  return new Observable((subscriber) => {
    const timer = setTimeout(() => subscriber.error(new Error('503 Service Unavailable')), LATENCY);
    return () => clearTimeout(timer);
  });
}

/** Answers after the latency, like HttpClient; unsubscribing cancels, like an aborted request. */
function later<T>(value: T): Observable<T> {
  return new Observable((subscriber) => {
    const timer = setTimeout(() => {
      subscriber.next(value);
      subscriber.complete();
    }, LATENCY);
    return () => clearTimeout(timer);
  });
}
