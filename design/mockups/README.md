# Visual Concepts

These are design reference boards with fictional data, not screenshots of the
application. Their palettes are now implemented as selectable themes in Settings.
The original purple palette is named Midnight Amethyst and remains the default
for every installation. Graphite & Mint is the chosen visual direction and its
coin-and-ledger icon is the shared app icon.

## Dark Themes

- [graphite-mint.png](graphite-mint.png): dark neutral surfaces with mint actions,
  blue and amber accents, and separate income/expense colors.
- [carbon-ice.png](carbon-ice.png): cool neutral dark surfaces with pale-blue
  actions, crisp borders, and separate green/red financial states.
- [obsidian-amber.png](obsidian-amber.png): near-black neutral surfaces with
  warm-gold actions and separate green/red financial states.

Each board includes Home, transaction entry, and launcher-size previews of a
simplified coin-and-ledger icon. Matching icon assets are
[graphite-mint-icon.png](graphite-mint-icon.png),
[carbon-ice-icon.png](carbon-ice-icon.png), and
[obsidian-amber-icon.png](obsidian-amber-icon.png).

The two additional dark concepts can be regenerated with the existing Pillow
installation and project fonts using:

```sh
python3 design/mockups/render_dark_concepts.py
```

The renderer checks the main text, muted text, and button-label contrast pairs
against a 4.5:1 minimum. This is a palette check, not a complete accessibility audit.

## Light Theme

[paper-cobalt.png](paper-cobalt.png) and [paper-cobalt-icon.png](paper-cobalt-icon.png)
show Paper & Cobalt, included as an explicitly selectable light alternative.
Its icon remains a concept; the installed app uses the shared Graphite & Mint mark.
