<!-- What does this change, and why? Link the issue it closes: "Closes #123". -->

## Checklist

- [ ] Specs cover the change, including at least one failure path.
- [ ] The docs site shows it (a demo or a code sample), or the change is internal.
- [ ] New or changed public types have TSDoc, and `npm run api:check` passes (run `npm run api:update` if the API change is intended).
- [ ] It works by keyboard alone, and axe reports no violations on the pages it touches.
- [ ] `CHANGELOG.md` of the package has an entry under the next version, with a migration note for anything breaking.
