/**
 * BREACHMATRIX — Production Deployment Build & Packaging Script
 * 
 * Organizes and packages ONLY the pure website files into the `dist/` folder
 * so you can deploy to Netlify, Vercel, Cloudflare Pages, GitHub Pages, or any static host
 * without any dev dependencies, node_modules, or scratch files.
 *
 * Usage:
 *   npm run build
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

  // Standalone Production Site Files
const PRODUCTION_FILES = [
  'index.html',
  'about.html',
  'products.html',
  'works.html',
  'service.html',
  'styles.css',
  'app.js',
  'gsap.min.js',
  'ScrollTrigger.min.js',
  'scroll-reveal.js',
  'story-bundle.js',
  'orb-content-capture.js',
  'ghost-fibers.js'
];

const ASSET_DIRS = [
  'assets',
  'works images',
  'leadership_image'
];

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function copyDirRecursive(src, dest) {
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function generateRobotsTxt() {
  const robots = `User-agent: *
Allow: /
Sitemap: https://breachmatrix.io/sitemap.xml
`;
  fs.writeFileSync(path.join(DIST_DIR, 'robots.txt'), robots, 'utf8');
}

function generateSitemapXml() {
  const date = new Date().toISOString().split('T')[0];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://breachmatrix.io/</loc>
    <lastmod>${date}</lastmod>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://breachmatrix.io/about.html</loc>
    <lastmod>${date}</lastmod>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://breachmatrix.io/products.html</loc>
    <lastmod>${date}</lastmod>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://breachmatrix.io/works.html</loc>
    <lastmod>${date}</lastmod>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://breachmatrix.io/service.html</loc>
    <lastmod>${date}</lastmod>
    <priority>0.8</priority>
  </url>
</urlset>`;
  fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemap, 'utf8');
}

function build() {
  console.log('⚡ [BREACHMATRIX] Packaging site files for standalone deployment...\n');

  // 1. Prepare clean dist folder
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
  }
  ensureDir(DIST_DIR);

  // 2. Copy production files
  let copiedCount = 0;
  for (const file of PRODUCTION_FILES) {
    const srcPath = path.join(ROOT_DIR, file);
    const destPath = path.join(DIST_DIR, file);

    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
      const stat = fs.statSync(destPath);
      const kb = (stat.size / 1024).toFixed(1);
      console.log(`  ✓ Copied: ${file.padEnd(20)} (${kb} KB)`);
      copiedCount++;
    } else {
      console.warn(`  ⚠ Warning: Missing expected file ${file}`);
    }
  }

  // 3. Copy assets directory
  for (const dir of ASSET_DIRS) {
    const srcDir = path.join(ROOT_DIR, dir);
    const destDir = path.join(DIST_DIR, dir);

    if (fs.existsSync(srcDir)) {
      copyDirRecursive(srcDir, destDir);
      console.log(`  ✓ Copied assets directory: /${dir}`);
    }
  }

  // 4. Generate SEO metadata(robots.txt, sitemap.xml)
  generateRobotsTxt();
  console.log('  ✓ Generated: robots.txt');
  generateSitemapXml();
  console.log('  ✓ Generated: sitemap.xml');

  console.log(`\n🎉 [SUCCESS] Deployment directory ready at: ./dist/`);
  console.log('   You can now deploy ONLY the contents of `dist/` directly to:');
  console.log('   - Netlify (Drag & drop `dist` onto Netlify Drop)');
  console.log('   - Vercel (`vercel deploy --prod ./dist`)');
  console.log('   - Cloudflare Pages / GitHub Pages / AWS S3\n');
}

build();
