# Gallery media design

The photography gallery and PhotoViewer reuse the site's current editorial visual system.

- Colors come from `src/styles/global.css`: `--bg`, `--surface`, `--surface-raised`, `--text`, `--muted`, `--border`, `--control-border`, `--accent`, and `--accent-ink`.
- Justified rows keep their existing 6px gap and ratio-based sizing. Video posters fill their media box with `object-fit: cover` while the video ratio reserves space before thumbnails load.
- A small centered play mark distinguishes a video without changing the gallery layout. Existing button, caption, dialog, and focus styles remain the source for viewer controls.
- New controls use visible focus states, descriptive labels, and the existing reduced-motion behavior.
