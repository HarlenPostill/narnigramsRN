# Narnigrams website

Independent, minimal Vite + TypeScript SPA. No backend, analytics, remote fonts, or runtime framework. All website source and assets live here, separate from the Expo app.

## Develop

Use Node 22 (also configured for Vercel):

```sh
cd landing
npm ci
npm run dev
```

`npm run build` typechecks and produces `dist/`. `npm run preview` serves that production build locally.

## Deploy on Vercel

1. Import this repository as a new Vercel project.
2. Set **Root Directory** to **landing**. Do not choose the repository root, which contains the Expo app.
3. Select the **Vite** preset and Node **22.x**. The included `vercel.json` sets install to `npm ci`, build to `npm run build`, and output to `dist`.
4. Optionally add the public environment variables below, then deploy. Changes to these variables require a rebuild.
5. Attach `www.narnigrams.com` (the domain used in the app's existing `.env.example`) or your chosen domain in Vercel, and configure DNS as instructed by Vercel.
6. Disable deployment protection on the production site so App Review and players can read support and policy pages without signing in.
7. Check `/`, `/terms`, `/support`, and `/privacy` directly and after refreshing. `vercel.json` includes the documented SPA rewrite, so deep links serve the app.

Vercel reference: https://vercel.com/docs/frameworks/frontend/vite#using-vite-to-make-spas

## Public configuration

Copy `.env.example` to `.env.local` for local overrides, or set these in Vercel:

- `VITE_SUPPORT_EMAIL`: defaults to the supplied `hrln-interactive@gmail.com`.
- `VITE_OPERATOR_NAME`: confirmed legal operator name, shown in policies and footer.
- `VITE_APP_STORE_URL`: an `https://apps.apple.com/…` URL. Until supplied, the homepage displays “Coming soon to iPhone” instead of a broken download link.

No secrets belong in `VITE_*` variables; they are bundled into public JavaScript.

## Pages and publication

- `/`: marketing page.
- `/terms`: terms of use.
- `/support`: email contact and self-service FAQs, including account deletion.
- `/privacy`: privacy policy reflecting `docs/PRIVACY.md` and the current implementation.

Policy copy is in `src/main.ts`. The operator name was not supplied, so terms/privacy display a pre-launch draft notice until configured. Before release, confirm the legal operator, intended audience, Firebase processing locations, deployed TTL/log/backup retention, support email provider retention, and applicable international processing disclosures. Replace the general retention wording with those confirmed operational details and update the policy date. The repository describes intended TTL settings; it does not prove those settings are deployed. No policy-compliance certification is implied.

Once the site is live, set the mobile app's `EXPO_PUBLIC_PRIVACY_URL` and `EXPO_PUBLIC_SUPPORT_URL` to your final HTTPS `/privacy` and `/support` URLs and rebuild the app. Use the same URLs in App Store Connect. Hosting the site does not automatically update the mobile app configuration.

The site uses client-side navigation with history/back support, accessible navigation and FAQ controls, a missing-page view, and responsive styling. Unknown paths display the missing-page view but return HTTP 200 through the SPA fallback. Social metadata in initial HTML is generic; individual titles are updated in the browser.
