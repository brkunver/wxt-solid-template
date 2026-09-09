# Project guidance

- This is a WXT browser extension using SolidJS, TypeScript, and Tailwind CSS v4.
- Target Manifest V3 for Chrome and Firefox.
- Source entrypoints live in `entrypoints/`, not `src/entrypoints/`.
- The content UI entrypoint is `entrypoints/content/index.tsx`. Initer may replace it with `entrypoints/content.ts` when content UI is disabled.
- Use WXT's `browser` global instead of `chrome`.
- Follow `.prettierrc.json`; formatting is available through the editor extension.

## Commands and configuration

- Initer supports Bun, npm, and pnpm. Use the package manager selected for this project, as reflected in the `manager` script and generated lockfile. The template defaults to Bun.
- Use the existing scripts in `package.json` for development, type checking, builds, and ZIP archives.
- WXT generates the manifest from `wxt.config.ts` and entrypoint metadata. Do not edit `.output/` or `.wxt/` files.
- Extension name and description come from `package.json`. Initer sets the package name; update the description for the actual project.
- Browser auto-launch is disabled in `wxt.config.ts`; load the generated extension manually.
- Keep the content script's `<all_urls>` match until the project's requirements specify its target sites.
- Configure a project-specific Firefox extension ID in `manifest.browser_specific_settings.gecko.id` before distribution.
- Keep Firefox's data collection declaration consistent with the project's actual behavior.

## Storage and localization

- If storage is needed, use WXT Storage from `#imports` and check for existing definitions in `utils/storage.ts` first.
- Use the `local:` prefix for local storage and ensure the manifest includes the `storage` permission.
- If localization is needed, use `@wxt-dev/i18n` with `#i18n`. Initer can install and configure the module and create `locales/en.yml`.
- Do not assume storage or i18n is enabled; both are optional in Initer.

## Project manager

- `manager.cjs` runs with Bun or Node: `<runtime> manager.cjs <bun|npm|pnpm> <push|publish>`.
- `push` merges local `dev` into `main` and pushes `main` and tags to `origin`.
- `publish` additionally publishes an npm package; it does not submit an extension to browser stores. Private packages are rejected before Git changes.
- Run these commands only when the user requests the corresponding push or publication.

## References

- https://wxt.dev/guide/essentials/entrypoints
- https://wxt.dev/guide/essentials/config/manifest
- https://wxt.dev/guide/essentials/storage
