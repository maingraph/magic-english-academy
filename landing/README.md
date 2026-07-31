# Magic English landing

Standalone static sales site. It does not import platform code or access authenticated APIs.

## Local development

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:4173`.

## Environment

- `PLATFORM_URL` — public learning-platform origin.
- `CONTACT_URL` — support/contact URL used by contact actions.
- `LANDING_CANONICAL_URL` — canonical public landing origin.

`npm run build` writes deployable files to `dist/`. Gemini landing work should remain inside `landing/**`; platform work remains inside `platform/**`.
