/*
 * Public API Surface of ngu-table
 */

export * from './lib/types';
export { NguTable, type NguTableSource } from './lib/table';
export { NguTableCell, NguTableEmpty, NguTableRowActions } from './lib/templates';
export {
  provideNguTableConfig,
  type NguTableConfig,
  type NguTableMessages,
  type NguTableSearchMemory,
} from './lib/config';
