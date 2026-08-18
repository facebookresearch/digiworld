#!/bin/bash

# App package name
APP_PACKAGE="com.andojopay.sbx"
TARGET_DIR="/storage/emulated/0/Android/data/$APP_PACKAGE/files/mockdata"

# Colors for output
GREEN=$'\033[0;32m'
RED=$'\033[0;31m'
NC=$'\033[0m'

echo "🚀 Starting data transfer..."

# Check if device is connected
if ! adb devices | grep -q "device$"; then
    echo "${RED}❌ No Android device connected${NC}"
    exit 1
fi

# Create directory structure
echo "📁 Creating directory structure..."
adb shell "mkdir -p $TARGET_DIR"

# Push files
echo "📦 Copying files..."
adb push src/data/mock-users.json "$TARGET_DIR/"
adb push src/data/mock-wallet.json "$TARGET_DIR/"
adb push src/data/mock-transactions.json "$TARGET_DIR/"
adb push src/data/mock-contacts.json "$TARGET_DIR/"

# Verify transfer
echo "\n${GREEN}Verifying transferred files:${NC}"
adb shell "ls -l $TARGET_DIR"

if [ $? -eq 0 ]; then
    echo "\n${GREEN}✨ Data transfer complete!${NC}"
    
    # Show first few lines of each file
    echo "\n${GREEN}Checking mock-users.json:${NC}"
    adb shell "head -n 3 $TARGET_DIR/mock-users.json"
    
    echo "\n${GREEN}Checking mock-wallet.json:${NC}"
    adb shell "head -n 3 $TARGET_DIR/mock-wallet.json"
    
    echo "\n${GREEN}Files location:${NC} $TARGET_DIR"
else
    echo "${RED}❌ Transfer failed${NC}"
fi