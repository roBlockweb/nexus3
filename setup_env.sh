#!/bin/bash
# Setup script for Nexus3 development environment

echo "Setting up Nexus3 development environment..."

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

# Install development tools
echo "Installing development tools..."
npm install -g eslint prettier

echo "Environment setup complete!"
echo "To activate the environment, run: source venv/bin/activate"
