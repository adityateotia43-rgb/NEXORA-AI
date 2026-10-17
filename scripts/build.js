/**
 * NEXORA AI — Production Build & Asset Verification Script
 * Validates frontend assets, HTML integrity, CSS stylesheets, and prepares production distribution.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

console.log('===================================================');
console.log('  🏗️   NEXORA AI Web App — Production Build Pipeline');
console.log('===================================================');

// 1. Asset Verification
const criticalFiles = [
  { file: 'index.html', required: true, minSize: 1000 },
  { file: 'styles.css', required: true, minSize: 500 },
  { file: 'app.js', required: true, minSize: 1000 },
  { file: 'server.js', required: true, minSize: 1000 },
  { file: '.env.example', required: true, minSize: 100 }
];

let hasErrors = false;

console.log('\n[1/4] Verifying critical assets...');
for (const item of criticalFiles) {
  const filePath = path.join(ROOT_DIR, item.file);
  if (!fs.existsSync(filePath)) {
    console.error(`  ❌ Missing required asset: ${item.file}`);
    hasErrors = true;
    continue;
  }
  const stat = fs.statSync(filePath);
  if (stat.size < item.minSize) {
    console.error(`  ❌ Asset too small (${stat.size} bytes < ${item.minSize} bytes): ${item.file}`);
    hasErrors = true;
    continue;
  }
  const sizeKb = (stat.size / 1024).toFixed(1);
  console.log(`  ✓ ${item.file.padEnd(16)} [${sizeKb.padStart(6)} KB] Validated`);
}

if (hasErrors) {
  console.error('\nBuild failed during asset verification.');
  process.exit(1);
}

// 2. HTML Integrity Validation
console.log('\n[2/4] Validating HTML structure & meta headers...');
const htmlContent = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
const htmlChecks = [
  { desc: 'DOCTYPE declaration', check: htmlContent.includes('<!DOCTYPE html>') },
  { desc: 'HTML Lang attribute', check: /<html[^>]*lang=["'][a-z]+/i.test(htmlContent) },
  { desc: 'Viewport meta tag', check: /<meta[^>]*name=["']viewport["']/i.test(htmlContent) },
  { desc: 'Title tag present', check: /<title>[^<]+<\/title>/i.test(htmlContent) },
  { desc: 'Script tag references app.js', check: /<script[^>]*src=["']\/?app\.js["']/i.test(htmlContent) },
  { desc: 'Stylesheet link references styles.css', check: /<link[^>]*href=["']\/?styles\.css["']/i.test(htmlContent) }
];

for (const check of htmlChecks) {
  if (!check.check) {
    console.warn(`  ⚠️  Warning: Missing recommended ${check.desc}`);
  } else {
    console.log(`  ✓ ${check.desc}`);
  }
}

// 3. CSS Syntax Sanity Check
console.log('\n[3/4] Verifying CSS syntax balance...');
const cssContent = fs.readFileSync(path.join(ROOT_DIR, 'styles.css'), 'utf8');
const openBraces = (cssContent.match(/{/g) || []).length;
const closeBraces = (cssContent.match(/}/g) || []).length;

if (openBraces !== closeBraces) {
  console.error(`  ❌ Unmatched CSS braces: ${openBraces} opening vs ${closeBraces} closing braces`);
  process.exit(1);
} else {
  console.log(`  ✓ CSS rules matched (${openBraces} selectors / rules validated)`);
}

// 4. Create / Refresh Production Distribution Directory (dist)
console.log('\n[4/4] Generating production distribution bundle (/dist)...');
if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

// Copy client assets to dist
const distFiles = ['index.html', 'styles.css', 'app.js'];
for (const file of distFiles) {
  const src = path.join(ROOT_DIR, file);
  const dest = path.join(DIST_DIR, file);
  fs.copyFileSync(src, dest);
  const stat = fs.statSync(dest);
  console.log(`  ✓ Copied ${file} -> dist/${file} (${(stat.size / 1024).toFixed(1)} KB)`);
}

// Create build metadata manifest
const buildManifest = {
  appName: 'NEXORA AI',
  version: '2.4.0',
  buildTimestamp: new Date().toISOString(),
  environment: 'production',
  assets: distFiles.map(file => {
    const stat = fs.statSync(path.join(DIST_DIR, file));
    return {
      file,
      sizeBytes: stat.size,
      sizeKb: parseFloat((stat.size / 1024).toFixed(2))
    };
  })
};

fs.writeFileSync(path.join(DIST_DIR, 'build-manifest.json'), JSON.stringify(buildManifest, null, 2));
console.log('  ✓ Generated dist/build-manifest.json');

console.log('\n===================================================');
console.log('  ✅  BUILD SUCCEEDED: Production assets ready');
console.log(`  📁  Distribution folder: ${DIST_DIR}`);
console.log('===================================================\n');
