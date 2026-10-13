import type { NguFieldRenderContext } from 'ngu-form';

/** Id of the message under a control, for `aria-describedby`, or null. */
export function messageId(c: NguFieldRenderContext): string | null {
  return c.error || c.pending || c.warning || c.hint ? `${c.id}-msg` : null;
}
