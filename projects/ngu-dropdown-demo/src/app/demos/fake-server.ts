import type { NguDropdownPage, NguDropdownQuery } from 'ngu-dropdown';
import { Observable } from 'rxjs';

/** Stands in for your API: 50,000 customers, answered after 350 ms. */
export interface Customer {
  id: number;
  name: string;
  city: string;
  region: Region;
}

export type Region = 'North' | 'South' | 'East' | 'West';

export const REGIONS: readonly Region[] = ['North', 'South', 'East', 'West'];

const LATENCY = 350;

const FIRST = [
  'Amber',
  'Apex',
  'Atlas',
  'Blue',
  'Bright',
  'Cedar',
  'Coastal',
  'Crown',
  'Delta',
  'Eastern',
  'Evergreen',
  'First',
  'Golden',
  'Granite',
  'Harbor',
  'Highland',
  'Iron',
  'Lakeside',
  'Liberty',
  'Lotus',
  'Maple',
  'Metro',
  'Northern',
  'Oak',
  'Pacific',
  'Pioneer',
  'Prime',
  'Red',
  'River',
  'Royal',
  'Silver',
  'Summit',
  'Sun',
  'Swift',
  'Union',
  'United',
  'Valley',
  'Vista',
  'Western',
  'Zenith',
];
const TRADE = [
  'Agro',
  'Auto',
  'Bakery',
  'Cables',
  'Ceramics',
  'Chemicals',
  'Cotton',
  'Dairy',
  'Electric',
  'Engineering',
  'Exports',
  'Fabrics',
  'Foods',
  'Forge',
  'Freight',
  'Glass',
  'Healthcare',
  'Imports',
  'Interiors',
  'Logistics',
  'Machines',
  'Marine',
  'Metals',
  'Mills',
  'Motors',
  'Packaging',
  'Paper',
  'Pharma',
  'Plastics',
  'Polymers',
  'Power',
  'Retail',
  'Rubber',
  'Seeds',
  'Spices',
  'Steel',
  'Systems',
  'Textiles',
  'Tools',
  'Traders',
];
const KIND = [
  'Ltd',
  'Pvt Ltd',
  'LLP',
  '& Co',
  'Group',
  'Industries',
  'Enterprises',
  'Corporation',
  'Holdings',
  'International',
  'Works',
  'Partners',
  'Agencies',
  'Associates',
  'Brothers',
  'Company',
  'Global',
  'Trading',
  'Ventures',
  'Solutions',
  'Supplies',
  'Services',
  'Sons',
  'Network',
  'Overseas',
  'Unlimited',
  'Collective',
  'Alliance',
  'Distributors',
  'House',
  'Labs',
  'Union',
];
const CITIES: Record<Region, readonly string[]> = {
  North: ['Delhi', 'Jaipur', 'Lucknow', 'Chandigarh'],
  South: ['Chennai', 'Bengaluru', 'Kochi', 'Hyderabad'],
  East: ['Kolkata', 'Patna', 'Guwahati', 'Bhubaneswar'],
  West: ['Mumbai', 'Pune', 'Ahmedabad', 'Surat'],
};

function customer(id: number): Customer {
  const i = id - 1;
  const region = REGIONS[(i * 7) % 4];
  return {
    id,
    name: `${FIRST[i % 40]} ${TRADE[Math.floor(i / 40) % 40]} ${KIND[Math.floor(i / 1600) % 32]}`,
    city: CITIES[region][i % 4],
    region,
  };
}

let all: readonly Customer[] | undefined;

/** Built on the first request, not when the page loads. */
function table(): readonly Customer[] {
  return (all ??= Array.from({ length: 50_000 }, (_, i) => customer(i + 1)));
}

/** `GET /customers?page&size&search&sort&order&region`, as a paged response. */
export function loadCustomers(query: NguDropdownQuery): Observable<NguDropdownPage<Customer>> {
  const search = query.search.toLowerCase();
  const region = query.filters['region'] as Region | null | undefined;

  let rows = table().filter(
    (c) => (!search || c.name.toLowerCase().includes(search)) && (!region || c.region === region),
  );
  if (query.sort === 'name') {
    const sign = query.order === 'desc' ? -1 : 1;
    rows = [...rows].sort((a, b) => sign * a.name.localeCompare(b.name));
  }

  const start = query.page * query.size;
  return later({ content: rows.slice(start, start + query.size), totalElements: rows.length });
}

/** `GET /customers?ids=…`, for naming ids a form loaded. */
export function findCustomers(ids: readonly unknown[]): Observable<Customer[]> {
  return later(ids.map((id) => table()[Number(id) - 1]).filter((c) => c !== undefined));
}

export interface Plant {
  code: string;
  name: string;
  region: Region;
}

/** `GET /plants`: a short master list the API sends whole, not in pages. */
export function loadPlants(): Observable<Plant[]> {
  return later(
    REGIONS.flatMap((region) =>
      CITIES[region].flatMap((city, c) =>
        [1, 2, 3].map((n) => ({
          code: `PL-${region[0]}${c + 1}${n}`,
          name: `${city} plant ${n}`,
          region,
        })),
      ),
    ),
  );
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
