# Design: AuthSphere

The locked system. Every Hallmark run reads this first and pages share it. Change it on purpose; the file is the rule.

## System

- Genre: modern-minimal
- Shape of the first page: app screen (Security & Identity Control Plane)
- Theme: Console (by request) · colourway: graphite (dark console)
- Axes: dark/grotesk-sans/chromatic-amber · posture: restrained

## Tokens

[`apps/web/src/styles/tokens.css`](./apps/web/src/styles/tokens.css) is the single canonical source of truth for design tokens and Tailwind CSS v4 bridge. The roles:

```css
@theme static {
  --color-paper: oklch(17% 0.008 250);
  --color-paper-2: oklch(21% 0.009 250);
  --color-paper-3: oklch(13.5% 0.007 250);
  --color-ink: oklch(95% 0.005 250);
  --color-ink-2: oklch(83% 0.008 250);
  --color-muted: oklch(71% 0.01 250);
  --color-rule: oklch(31% 0.01 250);
  --color-rule-2: oklch(42% 0.012 250);
  --color-accent: oklch(82% 0.15 80);
  --color-accent-ink: oklch(18% 0.04 75);
  --color-accent-soft: oklch(29% 0.05 80);
  --color-focus: oklch(82% 0.15 80);
  --color-cool: oklch(77% 0.12 245);
  --color-cool-soft: oklch(29% 0.05 245);
  --color-ok: oklch(76% 0.15 150);
  --color-ok-soft: oklch(24.5% 0.03 150);
  --color-bad: oklch(70% 0.17 25);
  --color-bad-soft: oklch(24.5% 0.035 25);
  --font-display: "Host Grotesk", ui-sans-serif, system-ui, sans-serif;
  --font-body: "Host Grotesk", ui-sans-serif, system-ui, sans-serif;
  --font-outlier: "Atkinson Hyperlegible Mono", ui-monospace, monospace;
  --radius-card: 10px;
  --radius-pill: 6px;
  --rule-hair: 1px;
  --shadow-card: none;
  --tracking-display: -0.03em;
  --display-weight: 500;
}

:root {
  color-scheme: dark;
  --dur-micro: 120ms;
  --dur-short: 220ms;
  --dur-long: 420ms;
}
```

The spacing scale, type scale, easings, durations, and layers live in [`apps/web/src/styles/tokens.css`](./apps/web/src/styles/tokens.css).

## Controls

- Primary: Fill `var(--color-accent)` with text `var(--color-accent-ink)` · radius 6px (`--radius-pill`) · height 36px (44px mobile touch target) · `:active` scale(0.98)
- Secondary: 1px hairline `var(--color-rule)` on `var(--color-paper-2)` · same radius and height
- Destructive: Fill `var(--color-bad-soft)` with 1px `var(--color-bad)` (30% opacity) border and text `var(--color-bad)` · same radius and height
- Inputs: 1px hairline `var(--color-rule)` on `var(--color-paper-3)`, focus ring 2px `var(--color-focus)` · height 36px (44px mobile touch target)

## Motion

- Character: still, calm; `--dur-micro` (120ms) and `--dur-short` (220ms); zero decorative reveal animations; under `prefers-reduced-motion: reduce` transitions complete at 0.01ms.

## Exports

[`apps/web/src/styles/tokens.css`](./apps/web/src/styles/tokens.css) bridged via Tailwind CSS v4 `@theme static`, imported alongside [`apps/web/src/styles/base.css`](./apps/web/src/styles/base.css) (`layer(base)`) in [`apps/web/src/index.css`](./apps/web/src/index.css).
