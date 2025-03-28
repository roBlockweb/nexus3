# Nexus: Personal Knowledge Ecosystem

A Chrome extension that helps you capture, connect, and rediscover knowledge from across the web. Using locally-run AI, Nexus transforms how you collect and interact with information.

![Nexus Logo](docs/nexus-logo.png)

## Features

- **Content Capture**: Easily save content from any web page with a single click
- **AI Processing**: Automatic categorization, entity extraction, and connection discovery
- **Knowledge Map**: Visual exploration of your personal knowledge network
- **100% Private**: All processing happens locally on your device
- **Cross-Device Sync**: Securely sync your knowledge graph across devices (optional)
- **Smart Search**: Find connections and insights you might have missed
- **Adaptive Performance**: Automatically adjusts to your hardware capabilities

## Privacy & Security

Nexus is designed with privacy as a core principle:

- All AI processing runs locally on your device
- No data is sent to external servers
- Optional encryption for stored data
- Minimal permissions required
- Open source for transparency and security

## Installation

### From Chrome Web Store

1. Visit the [Nexus Chrome Web Store page](https://chrome.google.com/webstore/detail/nexus-personal-knowledge/xxxxxxxxxxxx)
2. Click "Add to Chrome"
3. Follow the onboarding instructions

### For Developers

1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run build` to build the extension
4. Load the `dist` folder as an unpacked extension in Chrome
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` directory

## Usage

### Quick Start

1. Click the Nexus icon in your Chrome toolbar
2. Use the "Capture Page" button to save the current page
3. Nexus will process the content and add it to your knowledge graph
4. View your knowledge map to explore connections

### Keyboard Shortcuts

- `Ctrl+Shift+S` (or `Cmd+Shift+S` on Mac): Capture current page
- `Ctrl+Shift+F` (or `Cmd+Shift+F` on Mac): Quick search your knowledge

### Settings

Access settings by clicking the gear icon in the popup or visiting the options page:

- **AI Processing Level**: Choose between minimal, balanced, or full processing
- **Appearance**: Customize the look and feel
- **Hardware Optimization**: Control CPU/GPU usage
- **Data Management**: Export, import, or clear your knowledge data

## Technical Details

### Architecture

Nexus uses a modular architecture to maintain flexibility and performance:

- **Core**: Central knowledge graph and data management
- **AI**: Local TensorFlow.js models for content processing
- **UI**: Clean, responsive interface components
- **Extractors**: Specialized content extraction for different page types

### Hardware Adaptation

Nexus automatically detects and adapts to your hardware:

- Uses GPU acceleration when available
- Gracefully falls back to CPU processing when necessary
- Adjusts model complexity based on available resources
- Battery-aware processing on mobile devices

### AI Models

Nexus includes several lightweight but powerful AI models:

- **Entity Recognition**: Identifies people, places, concepts, etc.
- **Categorization**: Automatically classifies content
- **Relationship Extraction**: Discovers connections between concepts
- **Summarization**: Creates concise summaries of long content

## Development

### Prerequisites

- Node.js 14+
- npm 7+

### Setup

```
git clone https://github.com/roBlockweb/nexus.git
cd nexus
npm install
```

### Build Commands

- `npm run build`: Production build
- `npm run dev`: Development build with watch mode
- `npm run clean`: Clean the dist directory
- `npm run test`: Run tests
- `npm run lint`: Run ESLint
- `npm run zip`: Create a distributable ZIP package

### Project Structure

```
nexus/
├── dist/                # Built extension
├── src/
│   ├── css/             # Stylesheets
│   ├── html/            # HTML pages
│   ├── images/          # Images and icons
│   ├── js/
│   │   ├── ai/          # AI models and processing
│   │   ├── core/        # Core functionality
│   │   ├── extractors/  # Content extraction
│   │   ├── ui/          # UI components
│   │   ├── utils/       # Utility functions
│   │   ├── popup.js     # Popup script
│   │   ├── options.js   # Options page script
│   │   ├── content-script.js  # Content script
│   │   └── service-worker.js  # Background script
│   └── manifest.json    # Extension manifest
├── build.js             # Build script
├── package.json
└── README.md
```

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT License](LICENSE)

## Acknowledgements

- [TensorFlow.js](https://www.tensorflow.org/js) - Machine learning for JavaScript
- [ESBuild](https://esbuild.github.io/) - Fast JavaScript bundler
- And all our open-source contributors!
