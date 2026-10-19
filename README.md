# LeadFlow CRM

A focused, mobile-responsive lead manager for independent professionals. Built as a serious first freelance portfolio project: a polished interface, small understandable modules, explicit security boundaries, and honest setup/test documentation.

## Status: first working version, not production-certified

- The interface and isolated demo can run **without a Supabase account**.
- Live authentication and PostgreSQL CRUD require **your Supabase configuration and migration**.
- No live Supabase project was connected or tested while generating this project. Do not claim otherwise in your portfolio.
- See `TESTING.md` for local checks performed and the remaining release gates.

## Quick start — interface first

Prerequisites: Node.js 22.12+ (Node 24 recommended), npm, and a modern browser.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`). Click **Explore the demo**. Try adding, editing, searching, filtering, and deleting a lead. Demo records are fictional `.example` contacts generated in memory; all changes disappear on reload or exit. No demo records are seeded into PostgreSQL, and no localStorage database is used.

## Exact manual Supabase setup — you must do these steps

### 1. Create your project and copy public configuration

1. Create a Supabase project on the **Free plan**. Keep its database password private; it is not needed by this frontend.
2. In the project dashboard, locate your **Project URL** and **publishable key** under the API/project connection settings (dashboard labels may vary). Use the publishable key, not a secret key or service-role key. A legacy public `anon` key also works with the variable below if your project uses legacy keys.
3. In this project folder, copy `.env.example` to `.env` and replace both placeholders:

```dotenv
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_public_publishable_key
```

All `VITE_` variables are bundled into public JavaScript. **Never put service-role keys, database passwords, test-account passwords, or Supabase secret keys in a `VITE_` variable.** `.env` is ignored by Git. Restart Vite after any change. Public config is expected to be visible; RLS, not key secrecy, protects records.

### 2. Configure email/password authentication

1. In **Authentication → Providers / Sign In**, enable **Email** with password sign-in.
2. Keep **Confirm email** enabled. The app shows a confirmation instruction instead of pretending signup has completed when Supabase does not return a session.
3. Set a minimum password length of **12** in your Auth password settings to match the signup/reset UI. Use available free password-security controls; no paid features are required by this app.
4. In **Authentication → URL Configuration**, use `http://localhost:5173/` as the local **Site URL** while developing.
5. Add these exact local **Redirect URLs**:
   - `http://localhost:5173/`
   - `http://localhost:5173/?flow=recovery`
6. After deployment, set **Site URL** to your final HTTPS origin and add:
   - `https://YOUR-SITE/`
   - `https://YOUR-SITE/?flow=recovery`
   Replace `YOUR-SITE` with your actual domain; do not use a wildcard production allowlist.
7. If Supabase rejects signup or reset mail, inspect its Auth logs, email delivery restrictions, and rate limits. The built-in sender is for limited testing and can restrict recipient addresses; it is not a production delivery guarantee. For public launch, configure a verified sender/SMTP provider whose terms fit your budget, and test delivery. No paid email/API dependency is bundled or required to explore this project.

The app uses the Supabase browser session flow and listens for `PASSWORD_RECOVERY`. Reset links return to `/?flow=recovery`; the recovery screen requires a valid Supabase session before `updateUser` can succeed. Opening that URL alone does not authorize a password change. Test complete email links in the same browser and another device. If a link is expired, request a fresh one; canceling recovery signs out.

### 3. Apply the database migration

**Do this before creating real leads.** No table is created automatically by the browser.

1. Open the project's **SQL Editor** and start a new query.
2. Copy the entire file `supabase/migrations/202610190001_create_leads.sql` into the editor.
3. Run it **once**, and confirm the transaction succeeds. It intentionally fails rather than quietly overwriting an existing table. If your project already has `public.leads`, inspect/migrate that schema separately; do not drop customer data to retry this script.
4. Verify `public.leads` has RLS enabled and exactly the four expected owner policies. The table contains UUID `id`, `user_id` referencing `auth.users`, required `name`, optional email/phone/company/notes, constrained status, and server-generated `created_at`.
5. Keep the API row limit at its default **1,000 or at least 500**, because the client retrieves records in stable 500-row batches. Do not disable RLS or grant table access to `anon` to fix an error.

Alternatively, if you already use the Supabase CLI, link your project and run `supabase db push` from this folder. Use **either** SQL Editor **or** migration push for this initial migration, not both without reconciling migration history.

Policies for SELECT, INSERT, UPDATE and DELETE all check `auth.uid() = user_id`; UPDATE includes both USING and WITH CHECK. Only `authenticated` receives table privileges, and UPDATE is column-restricted so `id`, `user_id`, and `created_at` cannot be edited through the client role. The UI never supplies a creation timestamp for real inserts. The migration does not insert sample leads.

### 4. Verify before calling it functional

Use two separately confirmed test accounts and the checklist in `TESTING.md`. Verify persistence after refresh, all CRUD operations, reset mail flow, and cross-account isolation. Database table-editor access as the project owner is **not an RLS test**; owner/service-role contexts bypass these protections.

## Features

- Branded sign-in, signup, sign-out, and email password reset screens.
- Responsive desktop sidebar; mobile navigation drawer and stacked lead cards.
- Overview cards for Total, New, Contacted, Won, and Lost (click to filter).
- Search across name, email, phone, company, and notes; combine search with status.
- Add/edit dialog, read-only creation date, delete confirmation, and live count updates.
- Required name, email validation, character limits, loading and retry states, empty states, and success notices.
- Profile dropdown and explicit sign-out action.
- Demo mode with 8 fictional leads, reset button, and no persistence or database writes.
- Native dialogs for focus containment/Escape, labels, keyboard focus, skip link, reduced motion support, and automatic light/dark theme.

## Architecture

```text
src/
  App.tsx          Auth and workspace views, state, dialogs, guarded requests
  domain.ts        Lead types, validation, filtering, counts, demo fixtures
  supabase.ts      Public client configuration and database access
  styles.css       Responsive system, theme, component states
  domain.test.ts   Pure business-rule unit tests
supabase/migrations/  SQL schema, permissions, indexes and RLS
scripts/test-live.mjs  Opt-in two-account CRUD/RLS integration test
tests/demo.spec.ts     Desktop and Android-size demo browser tests
```

React + TypeScript + Vite; Supabase JS for Auth and PostgreSQL access; Lucide icons; plain CSS. React state is the current view, PostgreSQL is the real system of record. The initial load retrieves all records in 500-row batches, then filtering/counts are computed from that loaded set. This is a deliberate small-CRM tradeoff, **not** a scalable analytics architecture. For large accounts, move search/counts/pagination to authorized server queries and retain full RLS coverage. No realtime subscription or offline editing is implemented; **Refresh** fetches changes made elsewhere. Multi-device edits are last-write-wins.

## Security model and limits

- All client queries are untrusted; PostgreSQL RLS enforces ownership independently of UI filters.
- Real leads are never cached in localStorage. Supabase Auth uses its normal browser session storage to persist sign-in; this is **not** a substitute database. On a shared phone, explicitly sign out.
- React escapes lead text. No rich-HTML renderer or `dangerouslySetInnerHTML` is used.
- No secrets or passwords are logged by application code. Do not add credentials to logs or commits.
- Granting UPDATE only on editable columns also protects ownership and timestamps.
- User deletion cascades to leads. Normal lead deletion is permanent and requires UI confirmation.
- Frontend validation improves usability; database constraints also enforce name, lengths, status, ownership, and referential integrity. Email validation is client-side; direct API clients can store malformed email within the size limit. Do not treat stored contact fields as verified identities.
- This browser app has no team sharing, roles, audit trail, backups UI, import/export, MFA flow, multi-tab recovery synchronization, or conflict resolution. Session expiration errors are surfaced rather than silently saving locally.
- Before handling sensitive customer records, review privacy/retention obligations, session lifecycle, database backups, monitoring, abuse controls, and dependencies. Do not put highly sensitive personal data in notes.

## Tests and build

```sh
npm test
npx playwright install chromium
npm run test:e2e
npm run build
npm run preview
```

Playwright tests both a desktop viewport and a 390×844 Android-size viewport. This is browser emulation, not proof of behavior on a physical Android device. See `TESTING.md` for real device and live Supabase tests.

## Test from an Android phone

1. Put the phone and development computer on the same trusted Wi-Fi.
2. Run `npm run dev` (binds to all network interfaces). Allow port 5173 on your computer's local firewall only if appropriate. Do not expose Vite to the public internet.
3. Find your computer's LAN IP and open `http://YOUR-LAN-IP:5173` in Android Chrome.
4. Explore demo mode first; check navigation, all fields, software keyboard, forms, scrolling, edit, delete, search and dark mode. There should be no sideways page scrolling.
5. For emailed Auth links on the phone, add `http://YOUR-LAN-IP:5173/` and `http://YOUR-LAN-IP:5173/?flow=recovery` to Supabase Redirect URLs. `localhost` on a phone refers to the phone, not your computer. Remove temporary LAN redirect entries when finished.
6. For production-like auth/security testing, prefer your deployed **HTTPS** site. LAN HTTP is for trusted local development only.

## Free-tier deployment (static SPA)

A static host such as Netlify or Cloudflare Pages can serve this Vite build; check current free-tier quotas and suitability for your use. No paid APIs are included.

1. Commit the source and `package-lock.json`, **not** `.env` or `node_modules`.
2. Import the repository in your host. Choose Node 22.12+ / 24, build command `npm ci && npm run build`, and output directory `dist`.
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as build environment variables on the host. Redeploy after changing them; Vite injects these values at build time.
4. The app uses a root page and query-string callbacks, not client-side pathname routes. Deploy at the domain root; if you later add routes, configure SPA fallback rewrites. Vite's default `base` is `/`.
5. Add the final HTTPS URLs to Supabase Auth as above and update Site URL.
6. Test on the deployed site with two accounts and a real phone. Confirm requests target the correct Supabase project; verify no secret key appears in built files.
7. Add security headers at your chosen host and test a restrictive Content Security Policy for your exact Supabase origin before public release. No insecure wildcard CSP is supplied as a pretend production guarantee.
8. Do not call the app fully functional or production-ready until all live setup and release tests pass.

## Suggested portfolio narrative

“I built a responsive lead-management SPA with React and TypeScript, connected it to Supabase Auth and PostgreSQL, and enforced per-user ownership through four RLS policies. I separated fictional demo records from customer data and tested the demo across desktop/mobile viewports.” Only claim the connection and live RLS testing after you actually complete them. Include screenshots, a demo URL, test results, design decisions, and known limits instead of claiming enterprise readiness.
