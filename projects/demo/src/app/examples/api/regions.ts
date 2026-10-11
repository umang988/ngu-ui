import type { Choice } from 'ngu-form';

export const COUNTRIES: readonly Choice<string>[] = [
  { value: 'in', label: 'India' },
  { value: 'us', label: 'United States' },
  { value: 'sg', label: 'Singapore' },
];

/** States or regions per country. Singapore has none, so the field is optional there. */
export const REGIONS: Readonly<Record<string, readonly Choice<string>[]>> = {
  in: [
    { value: 'gj', label: 'Gujarat' },
    { value: 'mh', label: 'Maharashtra' },
    { value: 'ka', label: 'Karnataka' },
  ],
  us: [
    { value: 'ca', label: 'California' },
    { value: 'ny', label: 'New York' },
    { value: 'tx', label: 'Texas' },
  ],
  sg: [],
};
