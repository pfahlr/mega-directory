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

Tailwind utility classes power the UI through the official `@astrojs/tailwind` integration. Styles compile from `src/styles/global.css`, so no CDN script is required—Astro handles the PostCSS + Tailwind pipeline during `astro dev` and `astro build`.

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

1. Wire directory data to the API once endpoints stabilize (dynamic fetch for `/directories/[slug]` routes).
2. Expand SEO metadata per-directory (og:image overrides, structured data).
3. Add smoke tests for Astro pages + visual regression coverage.
