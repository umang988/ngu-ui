# Security policy

This repository publishes two npm packages, `ngu-form` and `ngu-dropdown`.

## Supported versions

Security fixes go into the latest minor release of the current major version. When a new
major version comes out, the previous major still gets security fixes for six months.

| Package | Supported |
| --- | --- |
| `ngu-form` | latest `0.x` until 1.0.0, then latest `1.x` |
| `ngu-dropdown` | latest `0.x` |

## Reporting a vulnerability

Please do not open a public issue. Report it privately through GitHub:
[Report a vulnerability](https://github.com/umang988/ngu-ui/security/advisories/new).

Include the package and version, what an attacker can do, and the smallest form spec or
component that shows it. You will get a reply within seven days. Once a fix is released, the
advisory is published with credit to you, unless you prefer otherwise.

## What counts

Both libraries run in the browser, inside the app that uses them. Issues we treat as
vulnerabilities include:

- Script injection through labels, hints, options, error messages, translations or run-time
  field definitions (`DynamicField` JSON), which are meant to render as text.
- Values that should never be stored ending up in drafts: passwords, captcha tokens and fields
  marked `persist: false`.
- Captcha tokens reused across submits, or sent where the app did not ask.
- Uploads that skip the `accept` or size checks the spec declares.

Not in scope: problems in the app's own submit action or server, and behavior that needs the
attacker to already control the app's code or form definitions.
