# Mega Directory · Astro Frontend

Accessible-by-default Astro frontend that powers the public marketing site for Mega Directory. It ships with a hero layout, listing cards, category highlights, and supporting sections tuned for SEO + performance.

## Project Structure

```
astro/
├── public/                # Static assets
├── src/
│   ├── components/        # Base UI building blocks
│   ├── layouts/           # Shared layout w/ header + footer
│   ├── pages/             # Route-driven content
│   └── styles/            # Global CSS + design tokens
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

Tailwind utility classes power the UI. Because this environment is offline, the project currently relies on the Tailwind CDN runtime that is injected from `BaseLayout.astro`. Once network access is available you can run `npm install` to pull down the declared Tailwind devDependencies and replace the CDN include with a local build.

## Getting Started

```bash
cd astro
npm install          # pulls Astro + Tailwind dependencies (requires network)
npm run dev          # http://localhost:4321
```

## Production Build

```bash
npm run build
npm run preview
```

## Notable Components

- `HeroSection.astro` & `CategoryCard.astro`: composable hero + grid building blocks.
- `ListingItem.astro`: semantic `<article>` cards with WCAG-friendly focus states.
- `SiteHeader.astro` & `SiteFooter.astro`: responsive chrome with skip-link support baked in.

## Next Steps

1. Run `npm install` when network access is available to materialize Tailwind locally.
2. Configure `@astrojs/tailwind` (already declared) and swap the CDN script for the compiled CSS output.
3. Add dynamic data fetching from the API server once endpoints are ready.
