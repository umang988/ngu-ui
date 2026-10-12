import type { NguDropdownPage, NguDropdownQuery } from 'ngu-dropdown';

export interface City {
  readonly id: number;
  readonly name: string;
  readonly country: string;
}

const PARTS = [
  'Ash',
  'Bel',
  'Cor',
  'Dun',
  'El',
  'Fair',
  'Glen',
  'Har',
  'Ivy',
  'Jun',
  'Kel',
  'Lin',
  'Mar',
  'Nor',
  'Oak',
  'Pen',
];
const ENDS = ['ford', 'ton', 'by', 'wick', 'mouth', 'field', 'haven', 'stead'];
const COUNTRIES = ['India', 'Germany', 'Brazil', 'Canada', 'Japan', 'Kenya'];

/** 10,000 made-up cities, built once. */
const CITIES: readonly City[] = Array.from({ length: 10_000 }, (_, i) => ({
  id: i + 1,
  name: `${PARTS[i % PARTS.length]}${ENDS[Math.floor(i / PARTS.length) % ENDS.length]}${i >= 128 ? ` ${Math.floor(i / 128) + 1}` : ''}`,
  country: COUNTRIES[i % COUNTRIES.length],
}));

/** A fake server: one page of matches after a short delay, like an HTTP call. */
export function searchCities(
  query: NguDropdownQuery,
  { signal }: { signal: AbortSignal },
): Promise<NguDropdownPage<City>> {
  const term = query.search.toLowerCase();
  const matches = term ? CITIES.filter((c) => c.name.toLowerCase().includes(term)) : CITIES;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () =>
        resolve({
          content: matches.slice(query.page * query.size, (query.page + 1) * query.size),
          totalElements: matches.length,
        }),
      250,
    );
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}
