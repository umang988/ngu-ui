import type { DynamicField } from 'ngu-form';

/** Pretends to fetch question definitions as JSON from a server. */
export async function fetchQuestions(signal: AbortSignal): Promise<DynamicField[]> {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, 800);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
  });
  // Plain JSON: no functions, string patterns, showIf conditions.
  return JSON.parse(`[
    { "key": "role", "label": "Your role", "type": "select", "required": true, "placeholder": "Choose…",
      "options": [{ "value": "dev", "label": "Developer" }, { "value": "lead", "label": "Tech lead" }, { "value": "other", "label": "Other" }] },
    { "key": "years", "label": "Years with Angular", "type": "number", "min": 0, "max": 40 },
    { "key": "signals", "label": "Do you use signals?", "type": "radio", "default": "yes",
      "options": [{ "value": "yes", "label": "Yes" }, { "value": "no", "label": "No" }] },
    { "key": "blocker", "label": "What is stopping you?", "type": "textarea", "span": 2, "required": "Tell us what blocks you",
      "showIf": { "key": "signals", "equals": "no" } },
    { "key": "github", "label": "GitHub username", "pattern": "[a-zA-Z0-9-]{1,39}", "hint": "Letters, digits and dashes" },
    { "key": "email", "label": "Email", "type": "email", "required": true }
  ]`);
}
