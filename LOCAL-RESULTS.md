# Observed local verification — first version

Environment: Node.js 24.14.1, Linux, system Chromium, unconfigured Supabase frontend.

| Check | Result |
| --- | --- |
| TypeScript + Vite production build | Passed |
| Vitest domain tests | 6 passed |
| Playwright demo tests | 4 passed, across desktop 1440×1000 and mobile 390×844 |
| npm audit (including development dependencies) | 0 reported vulnerabilities at generation time |
| Console exceptions during tested demo CRUD flow | None observed |
| Horizontal page overflow in desktop/mobile demo entry tests | None observed |
| Visual inspection | Login, signup, reset/recovery layouts, desktop/mobile dashboard, dark dashboard, add/edit dialogs (including mobile scroll), delete confirmation, mobile navigation, profile dropdown and empty search state inspected |
| Real Supabase signup/signin/signout | Not tested — no project configured |
| Password-reset email delivery and session callback | Not tested — layout inspection is not authentication testing |
| PostgreSQL persistence and CRUD | Not tested — migration supplied, not applied |
| Cross-account RLS and anonymous denial | Not tested — opt-in two-account script supplied |
| Physical Android device and production deployment | Not tested — user steps supplied |

Reset/recovery layout captures used isolated unconfigured fixtures, not real recovery sessions. Browser emulation is not device certification. The audit is a point-in-time package advisory check, not a security audit. `TESTING.md` lists remaining release gates. No claim of full live functionality or production readiness is made.
