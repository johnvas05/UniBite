// Embeds the screenshots/*.png inline (base64) into report.html so the report
// is a single self-contained file (survives moving / Print-to-PDF).
//
// Idempotent and re-runnable: tags the <img> with data-shot="<file>", so after
// re-capturing you can run it again to refresh the embedded images.
//   node embed-screenshots.js     (or: npm run embed)
//
// Images that don't exist yet (e.g. the manual mobile shots 09/10) are left as
// external placeholders and get embedded automatically once you add them.

const fs = require('fs');
const path = require('path');

const root = __dirname;
const htmlPath = path.join(root, 'report.html');
let html = fs.readFileSync(htmlPath, 'utf8');

let embedded = 0;
let pending = [];

html = html.replace(/<img\b[^>]*>/g, (tag) => {
  // Resolve the source filename: prefer data-shot (already embedded once), else src="screenshots/NAME".
  const byData = tag.match(/data-shot="([^"]+)"/);
  const bySrc = tag.match(/src="screenshots\/([^"]+)"/);
  const file = byData ? byData[1] : bySrc ? bySrc[1] : null;
  if (!file) return tag;

  const fp = path.join(root, 'screenshots', file);
  if (!fs.existsSync(fp)) { pending.push(file); return tag; }

  const b64 = fs.readFileSync(fp).toString('base64');
  let out = tag.replace(/\ssrc="[^"]*"/, ` src="data:image/png;base64,${b64}"`);
  if (!/data-shot=/.test(out)) out = out.replace(/<img/, `<img data-shot="${file}"`);
  embedded++;
  return out;
});

fs.writeFileSync(htmlPath, html);
console.log(`Embedded ${embedded} screenshot(s) into report.html`);
if (pending.length) console.log('Still external (not captured yet):', pending.join(', '));
