import type { Choice } from 'ngu-form';

/** Unit prices in rupees, by product code. */
export const PRICES: Readonly<Record<string, number>> = {
  tea: 240,
  coffee: 410,
  honey: 325.5,
  jaggery: 96,
};

export const PRODUCTS: readonly Choice<string>[] = [
  { value: 'tea', label: 'Assam tea, 500 g' },
  { value: 'coffee', label: 'Coorg coffee, 250 g' },
  { value: 'honey', label: 'Forest honey, 400 g' },
  { value: 'jaggery', label: 'Jaggery, 1 kg' },
];
