# Screen reader pass

A manual test of the demo with VoiceOver and NVDA. axe and the unit specs check the
markup; this checks what people actually hear. Record each result in the table at the end.

## Setup

| Screen reader | Browser | How to start |
| --- | --- | --- |
| VoiceOver (macOS) | Safari | Cmd+F5. Use VO = Ctrl+Option. |
| NVDA 2025 or later (Windows) | Firefox and Chrome | Ctrl+Alt+N. Use browse mode (default) and focus mode (NVDA+Space). |

Run the demo with `npm start` and open each example from **Examples**. Clear site data
between runs so drafts from an earlier run do not appear.

## Script

Each step lists what should be heard. Small wording differences between screen readers
are fine; missing or doubled information is not.

### 1. Sign in (`/examples/login`)

1. Tab to Email. Expect: "Email, required, edit text" (or "required, invalid entry: no").
2. Press Enter on the empty form. Expect: focus moves to Email, then once "2 fields need
   attention." Nothing is read twice.
3. Tab to the password, then to Show. Expect: "Show password, button". Press it. Expect:
   "Your password is visible".

### 2. Create an account (`/examples/signup`)

1. Press Create account on the empty form. Expect: focus on the summary, "There is a
   problem" followed by the list of links. NVDA may also say "alert".
2. Tab to the second link and press Enter. Expect: focus in Username with its error read
   as the description.
3. Type a password. Expect: "Password strength: Too weak", then a new level only when it
   changes, not on every key.
4. Arrow through the checklist (browse mode). Expect: "At least 8 characters, done" or
   "…, not yet" per item.
5. Type `ana@gmial.com` in Email and Tab away. Return to Email. Expect the description
   "Warning: Did you mean ana@gmail.com?" and no "invalid".
6. Type `admin` as the username. Expect: "Checking…" once, then the error is not read
   until you return to the field (known behavior, see the roadmap's known gaps).

### 3. Place an order (`/examples/order`)

1. Activate Add item. Expect: focus in the new row's first field.
2. Activate Remove on a row. Expect: focus moves to the next row, or to Add item.
3. Check that the list reads as "list, N items" and each row as a list item.

### 4. Edit a profile (`/examples/profile`)

1. Load the page. Expect: "Loading…" once; fields are not announced as empty inputs.
2. Change the bio, wait two seconds, reload. Expect after load: "Your unsaved changes from
   <time> were restored." read once as a status.
3. Change Display name, then a checkbox, then press Ctrl+Z (Cmd+Z in VoiceOver may need
   VO pass-through: VO+Tab first, or test with the Undo button). Expect: "Undone" and focus
   on the field that changed back.
4. Activate Discard changes. Expect: "Your unsaved changes were discarded." and focus in
   the first field.
5. Type `2500000` in Yearly salary and Tab away. Return. Expect it read as 25,00,000 (or
   "twenty-five lakh" depending on the voice).

### 5. In three languages (`/examples/languages`)

1. Switch to हिन्दी, then العربية. Expect: labels and errors read in a Hindi and an Arabic
   voice (the form sets `lang`). If the voice stays English, note it.
2. In Arabic, press تسجيل on the empty form. Expect the summary read in Arabic, and focus
   order right to left within rows.
3. In Hindi, type the phone number with Devanagari digits. Expect it read back as digits.

### 6. Survey from an API (`/examples/survey`)

1. Answer "No" to "Do you use signals?". Expect: the follow-up question is reachable next
   in the tab order, and nothing is announced unexpectedly.

## Results

| Step | VoiceOver + Safari | NVDA + Firefox | NVDA + Chrome | Notes |
| --- | --- | --- | --- | --- |
| 1.1 | | | | |
| 1.2 | | | | |
| 1.3 | | | | |
| 2.1 | | | | |
| 2.2 | | | | |
| 2.3 | | | | |
| 2.4 | | | | |
| 2.5 | | | | |
| 2.6 | | | | |
| 3.1 | | | | |
| 3.2 | | | | |
| 3.3 | | | | |
| 4.1 | | | | |
| 4.2 | | | | |
| 4.3 | | | | |
| 4.4 | | | | |
| 4.5 | | | | |
| 5.1 | | | | |
| 5.2 | | | | |
| 5.3 | | | | |
| 6.1 | | | | |

Mark each cell Pass, Fail or Partial. File an issue for every Fail, and decide the
"errors on blur are not announced" gap in the roadmap with these results.
