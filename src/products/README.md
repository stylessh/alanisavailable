# Products

Each product is its own world: its own components, style guide, content and
assets. Nothing in one product folder is shared with another, so a product
can be rebuilt or restyled without touching the rest.

```
src/products/<slug>/
  index.mdx        content, plus `export const metadata` (card + page settings)
  styles.css       the product's style guide: tokens (colors, type, radii,
                   shadows) and its scoped styles, all under one root class
  fonts.ts         next/font declarations used only by this product
  components/      everything that renders this product's page
public/products/<slug>/
  logo.svg         used by the homepage card
  …                every other asset this product uses
```

Only the files a product needs exist; start from `_template/`.

To add a product: copy `_template/` to `src/products/<slug>/`, put its logo in
`public/products/<slug>/logo.svg`, and register it in `index.ts`. The homepage
and `/<slug>` route pick it up from there.

Site-wide pieces (the homepage title, product cards, layout) live in
`src/components` and `src/lib`, not here.
