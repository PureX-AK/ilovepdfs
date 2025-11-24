#!/bin/bash

# Azure App Service startup script
# This script runs before the app starts

# Install Python dependencies if requirements.txt exists
if [ -f "requirements.txt" ]; then
    echo "Installing Python dependencies..."
    pip install -r requirements.txt --user
fi

# Ensure Python scripts are executable
chmod +x scripts/*.py

# Start the Next.js app (Azure will handle this, but we can set environment)
export NODE_ENV=production

echo "Startup script completed"

