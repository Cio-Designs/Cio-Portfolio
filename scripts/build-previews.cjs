// Rebuild the lightweight gallery assets: node scripts/build-previews.cjs
// Requires ImageMagick (magick) and FFmpeg. Original uploads are never changed.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {execFile} = require('node:child_process');
const {promisify} = require('node:util');
const run = promisify(execFile);
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const data = vm.runInNewContext(
  html.slice(html.indexOf('const workData='), html.indexOf('const brandProjects=')) + ';workData',
  {}, {timeout: 1000}
);
const items = [...new Map(Object.values(data).flatMap(group => group.items).map(item => [item.src, item])).values()];
let completed = 0;
async function build(item) {
  const input = path.join(root, item.src);
  const base = path.join(root, 'previews', item.src.replace(/\.[^/.]+$/, ''));
  fs.mkdirSync(path.dirname(base), {recursive: true});
  if (item.type === 'video') {
    await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', '1', '-i', input,
      '-frames:v', '1', '-vf', 'scale=960:-2', '-c:v', 'libwebp', '-quality', '85', `${base}-poster.webp`]);
  } else {
    for (const width of [480, 960]) {
      const args = ['-limit', 'thread', '2', input, '-auto-orient'];
      // Match the existing artwork crop in gallery previews, without changing the upload.
      if (item.cropHeight) args.push('-crop', `4500x${item.cropHeight}+0+0`, '+repage');
      args.push('-resize', `${width}x`, '-colorspace', 'sRGB', '-strip', '-quality', '85',
        '-define', 'webp:method=5', `${base}-${width}.webp`);
      await run('magick', args);
    }
  }
  completed++;
  if (completed % 10 === 0) console.log(`Built ${completed}/${items.length} artwork previews`);
}
(async () => {
  const queue = [...items];
  await Promise.all(Array.from({length: 2}, async () => {
    while (queue.length) await build(queue.shift());
  }));
  fs.mkdirSync(path.join(root, 'previews/cursors'), {recursive: true});
  for (const name of ['logo-02', 'logo-03']) {
    await run('magick', [path.join(root, `cursors/${name}.png`), '-resize', '64x64', '-strip',
      '-define', 'webp:lossless=true', path.join(root, `previews/cursors/${name}-64.webp`)]);
  }
  await run('magick', [path.join(root, 'CIO-C.png'), '-resize', '64x64', '-strip', path.join(root, 'previews/site-icon-64.png')]);
  const images = items.filter(item => item.type !== 'video');
  const originalBytes = images.reduce((sum, item) => sum + fs.statSync(path.join(root, item.src)).size, 0);
  const previewBytes = images.reduce((sum, item) => sum + fs.statSync(path.join(root, 'previews', item.src.replace(/\.[^/.]+$/, '') + '-960.webp')).size, 0);
  console.log(JSON.stringify({images: images.length, videos: items.length - images.length, originalBytes, preview960Bytes: previewBytes,
    reductionPercent: +(100 * (1 - previewBytes / originalBytes)).toFixed(1)}));
})().catch(error => {console.error(error.message); process.exitCode = 1;});
