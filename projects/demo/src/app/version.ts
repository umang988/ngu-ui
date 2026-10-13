import dropdown from '../../../ngu-dropdown/package.json';
import pkg from '../../../ngu-form/package.json';

/** The library's version, read from its package.json so the site never shows a stale one. */
export const VERSION: string = pkg.version;

/** ngu-dropdown's version, for demos of `ngu-form/dropdown` opened on StackBlitz. */
export const DROPDOWN_VERSION: string = dropdown.version;
