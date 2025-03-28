# Nexus3 Chrome Extension Development Notes

## Environment Setup

This Chrome extension is being developed with the following tools and technologies:

1. **Node.js and npm**: For dependency management and build scripts
2. **TensorFlow.js**: For AI capabilities that run locally in the browser
3. **ESBuild**: Fast JavaScript bundler
4. **Chrome Extension Manifest V3**: Following latest extension standards

## Local Development

To set up the local development environment:

1. Clone the repository
2. Run `source ./setup_env.sh` to initialize the virtual environment
3. Run `npm run dev` to build in development mode
4. Load the unpacked extension from the `dist` directory in Chrome

## Hardware Adaptation

The extension automatically detects the user's hardware capabilities:

- When a GPU is available and has sufficient memory, TensorFlow.js operations will use WebGL acceleration
- On systems without GPU or with limited resources, the extension falls back to CPU processing
- Memory usage is dynamically adjusted based on available system resources

## Architecture Notes

- **Service Worker**: Background script that manages the extension lifecycle
- **Content Scripts**: Run on web pages to extract knowledge
- **AI Modules**: All AI processing happens locally on the user's device
- **Knowledge Graph**: Central data structure for organizing captured knowledge
- **Storage**: Uses Chrome's storage API with optimized compression

## Current Priorities

1. Implement core functionality for data extraction and organization
2. Build CPU/GPU auto-detection and hardware adaptation
3. Optimize UI components for clarity and simplicity
4. Ensure proper error handling and recovery
5. Maintain Chrome Web Store compliance

## Performance Optimization

- AI models are loaded on-demand to minimize memory footprint
- Lazy loading is used for components that aren't immediately needed
- Background processing is done in chunks to avoid blocking the UI
- IndexedDB is used for efficient storage of larger knowledge structures
