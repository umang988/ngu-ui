/*
 * Public API Surface of ngu-table
 */

export * from './lib/types';
export { NguTable, type NguTableSource } from './lib/table';
export { NguTableCell, NguTableEmpty, NguTableRowActions } from './lib/templates';
// Also in `ngu-table/config`, which an app config should import from: it holds only the
// defaults, so the table stays out of the initial bundle.
export {
  provideNguTableConfig,
  type NguTableConfig,
  type NguTableMessages,
  type NguTableSearchMemory,
} from 'ngu-table/config';
