# La Fontana — website prototype v1

A self-contained **HTML / CSS / JavaScript** starter built from the supplied photos and La Fontana printed menu. No framework, build process or backend required.

## How to run

Open `index.html` in a modern browser. For testing on mobile devices or during development, serve the folder with:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Files

- `index.html` — semantic markup and page sections
- `styles.css` — design system, desktop/mobile, true circular pizza and curved ring
- `app.js` — full menu data, rotating ring, gallery, pizza transitions, quantities and demo basket
- `assets/` — pizza photos (transparent cut-outs + gallery thumbnails; Bruschetta still uses a prototype illustration), storefront and decorative artwork

## Included

- Cinematic storefront blended into cream page background
- Responsive navigation (desktop + mobile)
- **15 menu items** with the menu's prices and ingredients
- Pizza names written along the curved rail above the pizza (SVG text on a path), each with its dot on the line; 7 visible on wide screens, 5 on mid-size screens and 3 on small phones (never overlapping the arrows)
- Changing pizza turns the ring: the outgoing pizza turns away around its centre while the new one turns in (24° per step) and cross-fades over it, always settling upright; arrows, names, gallery cards and keyboard arrows all scroll through every item
- Top-down pizza photos as transparent cut-outs with a soft shadow (no plate or painted edge)
- The scroll presentation crops round pizzas at 58% of their diameter; sizing adapts to the viewport and available space above the thumbnail grid without stretching photos.
- All 15 cards in a two-row desktop grid, four-column mobile grid
- Product details, quantity selector, demo basket saved in localStorage
- Compact ingredient boxes each have a top-right × to remove that base ingredient. Reset restores the original recipe; changing pizza resets removals. Removed ingredients disappear from the description and are recorded as "Without" in the saved basket and copied order. Different removal combinations stay separate, with no discount on the base pizza price.
- A Topping dropdown above Add to basket offers the 12 confirmed reference extras, each at £1.00 per pizza with No / x1 / x2 choices. Extras update the button total and are included in saved basket lines and the copied pre-order summary. Different topping combinations stay separate; choosing another pizza resets extras.
- Product name, description and ingredients reserve the maximum measured height across all pizzas at the current width, keeping the Add to basket button stationary as selection changes.
- Copyable pre-order summary and click-to-call number
- Keyboard controls, semantic buttons and reduced-motion support
- Bidirectional scroll-through menu: pinning starts at the OUR PIZZAS heading, which stays visible above the presentation while scrolling from Margherita to Capricciosa, then releases into the rest of the page. Native scrolling works with touch, mouse and keyboard; direct selection stays synchronized while pinned. All thumbnails stay visible in a multi-row grid, including on mobile; the presentation fills the viewport without an empty area below the grid. Reduced motion disables rotation and cross-fading without disabling selection.

## Next steps / production limitations

1. **Send the Figma motion link.** Match its easing and timing in `animateRing()` / `showPizzaPhoto()`; the rail geometry and pizza turn are tuned with the `--arc-*` and `--pizza-turn` tokens on `.pizza-stage` in `styles.css`.
2. **Pizza photos.** 13 of the 15 items use the supplied cut-out photos (`Pizze LA FONTANA/Scontornate`). Margherita now uses the supplied transparent photo; **Bruschetta still uses the old prototype illustration** and should be replaced with `assets/bruschetta*.webp`. Format: `assets/<id>-feature.webp` is a square transparent image with the pizza centred and touching the edges of the square (the site turns it around the centre); `assets/<id>.webp` is a 480×190 close-up for the gallery and basket. The enlarged calzone is positioned in the upper half of its square, and the stage expands on larger screens when it is selected.
3. The source restaurant menu has no pizza-size options. None have been invented. Prices remain the original per-item menu prices.
4. Basket is an interactive *front-end demo only*, not a live ecommerce checkout; payments, order transmission, customer accounts, stock and order dispatch must be built/connected separately.
5. Confirm latest product prices, opening hours, allergen information, delivery/collection availability and contact details before launch. The supplied printed menu states pre-order phone `07719 663 540`, Thursday–Saturday 17:00–21:00, and `53a High Street, Thames Ditton KT7 0SF`.
6. Google Fonts require an internet connection; robust fallback fonts are provided.
7. The optional topping list and £1.00 supplement were confirmed from the reference, not the restaurant's printed menu. Confirm their availability and prices with La Fontana before launch.

## Design tokens

Cream `#F8F1E4` · Green `#063C2B` · Dark green `#082C22` · Coral `#C65739`.

Primary font: Playfair Display (headings) / DM Sans (UI).
