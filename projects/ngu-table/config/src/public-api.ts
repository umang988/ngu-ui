/*
 * Public API Surface of ngu-table/config: the app-wide defaults, apart from the table itself,
 * so an app config can set them without pulling the component into the initial bundle.
 */

export {
  DEFAULT_MESSAGES,
  NGU_TABLE_CONFIG,
  provideNguTableConfig,
  type NguBadgeTone,
  type NguTableConfig,
  type NguTableMessages,
  type NguTableSearchMemory,
  type ResolvedNguTableConfig,
} from './config';
