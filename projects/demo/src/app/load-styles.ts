/**
 * Adds a stylesheet that angular.json builds but does not inject (`inject: false`), once. The
 * Material, PrimeNG and Tailwind demos load their CSS this way, so other pages never get it.
 */
export function loadStyles(href: string): void {
  if (
    typeof document === 'undefined' ||
    document.querySelector(`link[data-demo-styles="${href}"]`)
  ) {
    return;
  }
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.dataset['demoStyles'] = href;
  document.head.append(link);
}
