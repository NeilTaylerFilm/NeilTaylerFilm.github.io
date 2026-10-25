# Gallery media design

The photography gallery and PhotoViewer reuse the site's current editorial visual system.

- Colors come from `src/styles/global.css`: `--bg`, `--surface`, `--surface-raised`, `--text`, `--muted`, `--border`, `--control-border`, `--accent`, and `--accent-ink`.
- Justified rows keep their existing 6px gap and ratio-based sizing. Video posters fill their media box with `object-fit: cover` while the video ratio reserves space before thumbnails load.
- A small centered play mark distinguishes a video without changing the gallery layout. Existing button, caption, dialog, and focus styles remain the source for viewer controls.
- New controls use visible focus states, descriptive labels, and the existing reduced-motion behavior.

## Blog video embeds

- Article text stays 700px wide; centered images and videos extend 60px beyond it on each side. At 1050px and narrower, media returns to the article text width.
- The poster fills a responsive article figure with a 16:9 ratio by default; `aspectRatio` sets another width-to-height ratio without changing the surrounding layout.
- A keyboard-focusable Play button contains the poster image. Activation replaces it with a privacy-enhanced iframe in the same frame.
- The poster uses `ResponsiveImage`, and the caption area keeps a Watch on YouTube link available. Focus uses the existing `--accent` token.
