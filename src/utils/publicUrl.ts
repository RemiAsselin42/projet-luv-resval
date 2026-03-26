/**
 * Utility for resolving URLs to files in the /public directory.
 *
 * ## Why this exists
 *
 * Vite treats two categories of assets differently:
 *
 * 1. **Imported assets** (`import url from './foo.png'`) — Vite processes these,
 *    hashes the filename, and rewrites the URL automatically. Safe to use as-is.
 *
 * 2. **Public directory assets** (`/public/...`) — Vite copies them verbatim to
 *    the output root and does NOT rewrite references to them in JS/TS code.
 *    They must be referenced with the correct base prefix at runtime.
 *
 * When `base` is set in `vite.config.ts` (e.g. `base: '/projet-luv-resval/'`),
 * a hardcoded `/foo.png` path will 404 in production because the file is served
 * at `/projet-luv-resval/foo.png`. `import.meta.env.BASE_URL` always holds the
 * correct base, whether running locally (`/`) or deployed (`/projet-luv-resval/`).
 *
 * ## Usage
 *
 * Always use `publicUrl()` instead of bare `/` paths whenever referencing files
 * from the `public/` folder inside JavaScript or TypeScript:
 *
 * @example
 * publicUrl('Logo-AWA.png')
 * // → '/projet-luv-resval/Logo-AWA.png'  (prod)
 * // → '/Logo-AWA.png'                     (dev, base: '/')
 *
 * @example
 * publicUrl('audio/pads/DRUMS-pad-snare.wav')
 * // → '/projet-luv-resval/audio/pads/DRUMS-pad-snare.wav'
 *
 * @param path - Path to the public asset, relative to the public root.
 *               A leading slash is accepted and stripped automatically.
 */
export const publicUrl = (path: string): string =>
  `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;
