# Nexus Chrome Extension Deployment Guide

This guide explains how to deploy the Nexus Chrome extension for both development testing and distribution via the Chrome Web Store.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Building the Extension](#building-the-extension)
3. [Local Testing](#local-testing)
4. [Chrome Web Store Preparation](#chrome-web-store-preparation)
5. [Submission Process](#submission-process)
6. [Post-Submission](#post-submission)
7. [Updating the Extension](#updating-the-extension)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying the extension, ensure you have:

- Node.js 14+ and npm 7+ installed
- A Google developer account (for Chrome Web Store submission)
- The Nexus source code from the repository
- Chrome browser installed

## Building the Extension

1. Clone the repository:
   ```
   git clone https://github.com/roBlockweb/nexus.git
   cd nexus
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Build the extension:
   
   For development:
   ```
   npm run dev
   ```
   
   For production:
   ```
   npm run build
   ```

4. The built extension will be in the `dist` directory.

## Local Testing

### Loading in Chrome Developer Mode

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" using the toggle in the top-right corner
3. Click "Load unpacked" and select the `dist` directory containing the extension files
4. The extension should now appear in your extensions list and be active
5. Click the puzzle piece icon in Chrome's toolbar to access the extension

### Testing Checklist

Verify that these key features work correctly:

- [ ] Extension popup opens correctly
- [ ] Page content can be captured
- [ ] AI processing works (categorization, entity extraction)
- [ ] Knowledge map displays properly
- [ ] Search functionality works
- [ ] Settings can be changed and persist
- [ ] Hardware adaptation functions properly

## Chrome Web Store Preparation

### Creating a ZIP Package

Create a ZIP file containing the extension:

```
npm run zip
```

This will create a file named `nexus-v[version].zip` in your project root.

Alternatively, manually ZIP the contents of the `dist` directory (don't zip the directory itself, just its contents).

### Required Assets

Prepare the following assets for your Chrome Web Store listing:

1. **Extension Icon**:
   - 128x128 PNG icon (already included in the built package)

2. **Screenshots** (at least 1, up to 5):
   - 1280x800 or 640x400 pixels
   - Show key features of the extension
   - Suggested screenshots:
     - Popup interface
     - Content capture in action
     - Knowledge map visualization
     - Settings page

3. **Promotional Images** (optional):
   - Small promotional tile: 440x280 pixels
   - Large promotional tile: 920x680 pixels
   - Marquee promotional tile: 1400x560 pixels

4. **Description**:
   - Short description (up to 132 characters)
   - Full description (up to 16,000 characters)
   - Highlight key features, benefits, and privacy focus

5. **Additional Information**:
   - Website or support URL
   - Privacy policy URL
   - Optional YouTube video

## Submission Process

1. Go to the [Chrome Developer Dashboard](https://chrome.google.com/webstore/developer/dashboard)

2. Sign in with your Google account

3. Pay the one-time developer registration fee (if you haven't already)

4. Click "Add new item" and upload your ZIP file

5. Fill in the required information:
   - Store listing details
   - Privacy practices
   - Content rating
   - Distribution countries

6. Add the prepared screenshots and promotional images

7. Select distribution options:
   - Choose whether to publish immediately or manually
   - Select target audience and regions

8. Submit for review

## Post-Submission

- The review process typically takes 24-72 hours
- You'll receive an email notification when the review is complete
- If rejected, address the issues and resubmit

## Updating the Extension

When releasing updates:

1. Increment the version number in `package.json`
2. Make necessary code changes
3. Build the extension: `npm run build`
4. Create a new ZIP package: `npm run zip`
5. In the Chrome Developer Dashboard, select your extension
6. Click "Package" > "Upload new package"
7. Upload the new ZIP file
8. Submit for review

## Troubleshooting

### Common Issues

1. **Extension not loading locally**:
   - Ensure the `manifest.json` file is at the root of the `dist` directory
   - Check for any console errors in the Extensions page
   - Try reloading the extension

2. **Submission rejected**:
   - Read the rejection reasons carefully
   - Common issues include:
     - Missing privacy policy
     - Insufficient permissions justification
     - Misleading description
     - Security concerns
   - Address all issues and resubmit

3. **Performance problems**:
   - Check if the wrong models are being loaded
   - Verify that hardware detection is working properly
   - Test on different hardware configurations

### Getting Help

- Check the [Chrome Extensions documentation](https://developer.chrome.com/docs/extensions/)
- Visit the [Chrome Web Store Developer Support](https://developer.chrome.com/docs/webstore/support/)
- Open an issue on the [GitHub repository](https://github.com/roBlockweb/nexus/issues)

## Final Checklist Before Submission

- [ ] Extension version is correct
- [ ] All required permissions are justified
- [ ] Privacy policy is in place and accurate
- [ ] Description clearly explains the extension's functionality
- [ ] Screenshots and images meet size requirements
- [ ] All links in the store listing work
- [ ] ZIP file contains all necessary files
- [ ] Extension passes all local tests

---

For additional help, contact the Nexus development team at [support@example.com](mailto:support@example.com).
