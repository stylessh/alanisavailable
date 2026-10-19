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

## Desktop apps

Products that are desktop apps run on the shared macOS layer in `src/os/macos`
(assets in `public/os/macos`). It's the one thing products share, so every app
gets the same windowing:

```tsx
<MacOS dock={dockWith({ id: "rex", name: "Rex", icon: "/products/<slug>/…/dock-icon.png" })}>
  <MacWindow id="rex" app={{ id: "rex", name: "Rex", menus: […] }} width={1000} height={600}>
    <div {...DRAG_REGION}>…title bar… <TrafficLights left={14} top={14} /></div>
    …the app…
  </MacWindow>
</MacOS>
```

- Windows drag by any element marked `DRAG_REGION` (buttons, tabs and inputs
  inside it keep their clicks); double-clicking it zooms.
- The traffic lights close, minimize into the app's Dock icon and go full screen
  (Option-click zooms). ⌃⌘F toggles full screen.
- Clicking the desktop gives focus to Finder; the Dock brings windows back.
  Closed and minimized windows stay mounted, so apps keep their state.
- Inside a window, `useMacWindow()` gives the app its size (reflow to it), its
  focus (only take keys while focused) and the window controls.
- The product supplies only its app: window content, Dock icon, menus.
