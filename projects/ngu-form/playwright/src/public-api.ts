/*
 * Public API Surface of ngu-form/playwright: drive ngu-form forms from Playwright tests.
 * It has no dependencies; pass it a Playwright `page` or `locator`.
 */

export {
  nguForm,
  NguFieldDriver,
  NguFormDriver,
  NguListDriver,
  type NguPlaywrightLocator,
  type NguPlaywrightScope,
  type NguPlaywrightValue,
} from './driver';
