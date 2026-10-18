# Alan is available

My own take on the products I'd love to work on.

## Develop

```bash
pnpm dev
```

## Adding a product

Copy `src/content/products/_template.mdx` to `<company-slug>.mdx`, edit it, and
register it in `src/content/products/index.ts`.
It shows up at `/<company-slug>` and in the row on the homepage (favorites first,
then by `order`).

Logos go in `public/logos/` as single-color SVGs. Style the card with
`background` (any CSS background, gradients included) and `foreground`, plus
optional `backgroundDark` / `foregroundDark`, `flat` and `grain`.
