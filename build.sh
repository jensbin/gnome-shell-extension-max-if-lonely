#!/bin/bash

# Define variables
EXTENSION_NAME="max-if-lonely"
EXTENSION_UUID="gnome-shell-extension-max-if-lonely"
SRC_DIR="src"
BUILD_DIR="build"
DIST_DIR="dist"
ZIP_FILE="${EXTENSION_UUID}.zip"

# Clean up previous builds
rm -rf "${BUILD_DIR}"
rm -f "${DIST_DIR}/${ZIP_FILE}"

# Create build directory
mkdir -p "${BUILD_DIR}/${EXTENSION_UUID}"

# Copy source files to build directory
cp -r "${SRC_DIR}/"* "${BUILD_DIR}/${EXTENSION_UUID}/"

# Compile the schema file
glib-compile-schemas "${BUILD_DIR}/${EXTENSION_UUID}/schemas"

# Create the zip file
cd "${BUILD_DIR}" || exit
zip -r "../${DIST_DIR}/${ZIP_FILE}" "${EXTENSION_UUID}/"

# Clean up build directory
cd ..
rm -rf "${BUILD_DIR}"

echo "Build complete: ${ZIP_FILE}"
