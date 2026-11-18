# Gallery previews

Generated from the original uploads with:

```sh
node scripts/build-previews.cjs
```

Requires Node.js, ImageMagick (`magick`) and FFmpeg (`ffmpeg`). The script reads
`workData` in `index.html`, creates 480px and 960px WebP images, and extracts one
960px video poster, plus compact cursor and favicon assets. Run it after adding an artwork. It preserves transparency,
normalizes EXIF orientation, and applies the existing `cropHeight` to previews.
Original files remain unchanged and are used by the full-size artwork viewer.
