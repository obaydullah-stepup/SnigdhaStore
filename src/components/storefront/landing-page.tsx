const TAILWIND_CDN_URL = "https://cdn.tailwindcss.com";

/**
 * Renders a LANDING page from author-supplied HTML, CSS and JS.
 *
 * The markup is injected as-is because that is the point of the feature: an
 * admin-authored hero section or custom layout cannot be expressed through the
 * text renderer. Everything here is gated at write time to SUPER_ADMIN (see
 * `authorizePageType` in `src/actions/admin/content-pages.ts`), so this is
 * trusted-editor input rather than user input.
 *
 * The admin's CSS is wrapped in a single `@layer components` so author rules
 * land below Tailwind's `utilities` layer, letting a page override the defaults
 * without needing `!important` everywhere.
 *
 * The single layer name is deliberate: `@layer components, utilities { ... }`
 * (a comma-separated layer list) fails to parse in Chromium and silently
 * discards the whole block, leaving the page unstyled. Verified by injecting
 * each form and reading back `style.sheet.cssRules.length`.
 */
export function LandingPage({
  html,
  css,
  js,
  useTailwindCdn,
}: {
  html: string;
  css: string | null;
  js: string | null;
  useTailwindCdn: boolean;
}) {
  const scoped = css?.trim() ? `@layer components {\n${css}\n}` : null;

  return (
    <div data-landing-page="" className="contents">
      {scoped ? (
        <style
          data-landing-page-css=""
          dangerouslySetInnerHTML={{ __html: scoped }}
        />
      ) : null}
      {useTailwindCdn ? (
        <script src={TAILWIND_CDN_URL} data-landing-page-tailwind="" async />
      ) : null}
      <div
        data-landing-page-html=""
        className="contents"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {js?.trim() ? (
        <script
          data-landing-page-js=""
          dangerouslySetInnerHTML={{ __html: js }}
        />
      ) : null}
    </div>
  );
}
