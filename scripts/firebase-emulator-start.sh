#!/bin/bash

# Firebase Emulator Start Script
# Starts Firebase emulators with data persistence for local development

echo "Starting Firebase Emulators..."

# Set Google Application Credentials
export GOOGLE_APPLICATION_CREDENTIALS="${PWD}/functions/gcp-credentials.json"

# Start emulators with data persistence
# - Imports existing data on startup
# - Exports data on shutdown to preserve state
firebase emulators:start \
  --only auth,functions,firestore,storage \
  --export-on-exit .emulator-persisted-data \
  --import .emulator-persisted-data

echo "Firebase Emulators stopped"