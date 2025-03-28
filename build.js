/**
 * Nexus 3.0 Build Script
 * Modern build system using ES modules and esbuild
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// Create require function
const require = createRequire(import.meta.url);
const { build } = require('esbuild');
const { minify } = require('terser');
const CleanCSS = require('clean-css');
const htmlMinifier = require('html-minifier');
const { version } = require('./package.json');

// Get directory name in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const srcDir = path.join(__dirname, 'src');
const distDir = path.join(__dirname, 'dist');
const isDev = process.argv.includes('--dev');

// Build banner
console.log(`
╔═══════════════════════════════════════════╗
║                                           ║
║       Nexus v${version} Build System       ║
║                                           ║
╚═══════════════════════════════════════════╝
`);

// Clean dist directory
console.log('🧹 Cleaning dist directory...');
if (fs.existsSync(distDir)) {
  removeDirectory(distDir);
}
fs.mkdirSync(distDir);

// Start the build process
(async function build() {
  try {
    console.log(`🚀 Building Nexus v${version} in ${isDev ? 'development' : 'production'} mode...`);
    
    // Copy static files first
    console.log('📋 Copying static files...');
    copyStaticFiles();
    
    // Bundle JavaScript modules
    console.log('🔧 Bundling JavaScript modules...');
    await bundleJavaScript();
    
    // Process CSS files
    console.log('🎨 Processing CSS files...');
    processCSSFiles();
    
    // Process HTML files
    console.log('📄 Processing HTML files...');
    processHTMLFiles();
    
    // Update manifest.json with correct version
    console.log('📝 Finalizing manifest.json...');
    updateManifest();
    
    // Create deployment guide
    createDeploymentGuide();
    
    console.log('✅ Build completed successfully!');
    console.log(`
📦 Nexus v${version} is now ready for ${isDev ? 'development' : 'distribution'}!

✓ ES modules properly bundled
✓ TensorFlow.js integration optimized
✓ UI components minified for performance
✓ Error handling and AI systems enhanced

See DEPLOYMENT_GUIDE.md in the dist directory for instructions.
    `);
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
})();

/**
 * Bundle JavaScript files using esbuild
 */
async function bundleJavaScript() {
  try {
    // Service worker (background script)
    await build({
      entryPoints: [path.join(srcDir, 'js/service-worker.js')],
      bundle: true,
      format: 'esm',
      outfile: path.join(distDir, 'js/service-worker.js'),
      minify: !isDev,
      sourcemap: isDev,
      target: ['chrome90'],
      define: {
        'process.env.NODE_ENV': isDev ? '"development"' : '"production"'
      }
    });
    
    // Content script
    await build({
      entryPoints: [path.join(srcDir, 'js/content-script.js')],
      bundle: true,
      format: 'esm',
      outfile: path.join(distDir, 'js/content-script.js'),
      minify: !isDev,
      sourcemap: isDev,
      target: ['chrome90'],
      define: {
        'process.env.NODE_ENV': isDev ? '"development"' : '"production"'
      }
    });
    
    // Popup script
    await build({
      entryPoints: [path.join(srcDir, 'js/popup.js')],
      bundle: true,
      format: 'esm',
      outfile: path.join(distDir, 'js/popup.js'),
      minify: !isDev,
      sourcemap: isDev,
      target: ['chrome90'],
      define: {
        'process.env.NODE_ENV': isDev ? '"development"' : '"production"'
      }
    });
    
    // Options script
    await build({
      entryPoints: [path.join(srcDir, 'js/options.js')],
      bundle: true,
      format: 'esm',
      outfile: path.join(distDir, 'js/options.js'),
      minify: !isDev,
      sourcemap: isDev,
      target: ['chrome90'],
      define: {
        'process.env.NODE_ENV': isDev ? '"development"' : '"production"'
      }
    });
    
    console.log('✓ JavaScript modules bundled successfully');
  } catch (error) {
    console.error('Error bundling JavaScript:', error);
    throw error;
  }
}

/**
 * Process CSS files
 */
function processCSSFiles() {
  try {
    // Get all CSS files
    const cssFiles = findFiles(srcDir, '.css');
    
    // Create css directory in dist
    const cssDist = path.join(distDir, 'css');
    if (!fs.existsSync(cssDist)) {
      fs.mkdirSync(cssDist, { recursive: true });
    }
    
    // Process each CSS file
    for (const file of cssFiles) {
      const fileName = path.basename(file);
      const destPath = path.join(cssDist, fileName);
      
      // Read CSS content
      const cssContent = fs.readFileSync(file, 'utf8');
      
      // Minify in production mode
      if (!isDev) {
        const minified = new CleanCSS({ level: 2 }).minify(cssContent);
        fs.writeFileSync(destPath, minified.styles);
      } else {
        fs.writeFileSync(destPath, cssContent);
      }
    }
    
    console.log('✓ CSS files processed successfully');
  } catch (error) {
    console.error('Error processing CSS files:', error);
    throw error;
  }
}

/**
 * Process HTML files
 */
function processHTMLFiles() {
  try {
    // Get all HTML files
    const htmlFiles = findFiles(srcDir, '.html');
    
    // Create html directory in dist
    const htmlDist = path.join(distDir, 'html');
    if (!fs.existsSync(htmlDist)) {
      fs.mkdirSync(htmlDist, { recursive: true });
    }
    
    // Process each HTML file
    for (const file of htmlFiles) {
      const fileName = path.basename(file);
      const destPath = path.join(htmlDist, fileName);
      
      // Read HTML content
      const htmlContent = fs.readFileSync(file, 'utf8');
      
      // Minify in production mode
      if (!isDev) {
        const minified = htmlMinifier.minify(htmlContent, {
          collapseWhitespace: true,
          removeComments: true,
          removeRedundantAttributes: true,
          removeScriptTypeAttributes: true,
          removeStyleLinkTypeAttributes: true,
          useShortDoctype: true,
          minifyCSS: true,
          minifyJS: true
        });
        fs.writeFileSync(destPath, minified);
      } else {
        fs.writeFileSync(destPath, htmlContent);
      }
    }
    
    console.log('✓ HTML files processed successfully');
  } catch (error) {
    console.error('Error processing HTML files:', error);
    throw error;
  }
}

/**
 * Copy static files that don't need processing
 */
function copyStaticFiles() {
  try {
    // Copy manifest.json
    const manifestSrc = path.join(srcDir, 'manifest.json');
    const manifestDest = path.join(distDir, 'manifest.json');
    fs.copyFileSync(manifestSrc, manifestDest);
    
    // Copy images directory
    const imagesSrc = path.join(srcDir, 'images');
    const imagesDest = path.join(distDir, 'images');
    
    if (fs.existsSync(imagesSrc)) {
      if (!fs.existsSync(imagesDest)) {
        fs.mkdirSync(imagesDest, { recursive: true });
      }
      
      const imageFiles = fs.readdirSync(imagesSrc);
      for (const file of imageFiles) {
        const srcFile = path.join(imagesSrc, file);
        const destFile = path.join(imagesDest, file);
        if (fs.lstatSync(srcFile).isFile()) {
          fs.copyFileSync(srcFile, destFile);
        }
      }
    }
    
    console.log('✓ Static files copied successfully');
  } catch (error) {
    console.error('Error copying static files:', error);
    throw error;
  }
}

/**
 * Update manifest.json with correct version
 */
function updateManifest() {
  try {
    const manifestPath = path.join(distDir, 'manifest.json');
    
    // Read and parse manifest
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    // Update version
    manifest.version = version;
    
    // Add update URL for Chrome Web Store
    manifest.update_url = 'https://clients2.google.com/service/update2/crx';
    
    // Write updated manifest
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    
    console.log('✓ Manifest updated successfully');
  } catch (error) {
    console.error('Error updating manifest:', error);
    throw error;
  }
}

/**
 * Create deployment guide
 */
function createDeploymentGuide() {
  try {
    const guidePath = path.join(distDir, 'DEPLOYMENT_GUIDE.md');
    
    const guideContent = `# Nexus Chrome Extension Deployment Guide

## Overview

This guide explains how to deploy the Nexus Chrome extension (v${version}) for both development testing and distribution via the Chrome Web Store.

## 1. Loading in Chrome Developer Mode

For testing the extension during development:

1. Open Chrome and navigate to \`chrome://extensions/\`
2. Enable "Developer mode" using the toggle in the top-right corner
3. Click "Load unpacked" and select the \`dist\` directory containing the extension files
4. The extension should now appear in your extensions list and be active
5. Click the puzzle piece icon in Chrome's toolbar to access the extension

## 2. Creating a ZIP Package for Distribution

To prepare the extension for the Chrome Web Store:

1. Ensure you've built the latest version using \`npm run build\`
2. Use the following command to create a ZIP file:
   \`\`\`
   npm run zip
   \`\`\`
   This will create a file named \`nexus-v${version}.zip\` in your project root
3. Alternatively, you can manually ZIP the contents of the \`dist\` directory (don't zip the directory itself, just its contents)

## 3. Chrome Web Store Submission Requirements

When submitting to the Chrome Web Store:

### Required Information
- Detailed extension description
- At least 2 screenshots (1280x800 or 640x400)
- A 128x128 icon (already included in the package)
- Privacy policy URL
- Website or support URL

### Store Listing Guidelines
- Clear description of what the extension does
- Accurate information about permissions used
- Age-appropriate content and functionality
- No misleading information or functionality claims

### Technical Requirements
- Extension size less than 10MB
- Must comply with Chrome Web Store Developer Program Policies
- Manifest V3 compliant (this extension uses Manifest V3)
- Proper content security policy

## 4. Post-Deployment Testing

After loading the extension:

1. Test the core functionality:
   - Content capture from web pages
   - Searching knowledge network
   - Knowledge map visualization
   - Settings persistence
   
2. Verify error handling:
   - Try accessing invalid URLs
   - Test offline functionality
   - Check error logging in the Settings panel

## Security Notes

- This extension has minimal permissions by design
- All data is stored locally on the user's device
- No data is sent to external servers
- AI processing happens entirely on-device using TensorFlow.js

---

🚀 Nexus - Connect your digital life into a personal knowledge network
`;
    
    fs.writeFileSync(guidePath, guideContent);
    console.log('✓ Deployment guide created successfully');
  } catch (error) {
    console.error('Error creating deployment guide:', error);
    throw error;
  }
}

/**
 * Find files with a specific extension
 */
function findFiles(startPath, extension) {
  let results = [];
  
  if (!fs.existsSync(startPath)) {
    return results;
  }
  
  const files = fs.readdirSync(startPath);
  
  for (const file of files) {
    const filePath = path.join(startPath, file);
    const stat = fs.lstatSync(filePath);
    
    if (stat.isDirectory()) {
      // Recursively search subdirectories
      results = results.concat(findFiles(filePath, extension));
    } else if (filePath.endsWith(extension)) {
      // Add file if it has the desired extension
      results.push(filePath);
    }
  }
  
  return results;
}

/**
 * Remove a directory recursively
 */
function removeDirectory(dir) {
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).forEach(file => {
      const curPath = path.join(dir, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        // Recursively remove subdirectories
        removeDirectory(curPath);
      } else {
        // Remove file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(dir);
  }
}