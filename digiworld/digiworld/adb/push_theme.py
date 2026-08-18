#!/usr/bin/env python3
# Copyright (c) Meta Platforms, Inc. and affiliates.
"""
Simple Theme Push Script - No Dependencies

Pushes a theme to the Transit app without requiring full ADBActions initialization.
Perfect for quick theme testing.

Usage:
    python3 push_theme.py <theme_name>

Examples:
    python3 push_theme.py theme1-blue
    python3 push_theme.py theme2-green
    python3 push_theme.py theme3-dark
    python3 push_theme.py theme4-purple
"""

import sys
import os
import json
import subprocess
import time

BUNDLE_ID = 'com.andojotransit.sbx'
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

def run_adb(command):
    """Run ADB command and return output"""
    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=30
        )
        return result.stdout.strip()
    except Exception as e:
        print(f"Error running command: {e}")
        return None

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 push_theme.py <theme_name>")
        print("\nAvailable themes:")
        print("  - theme1-blue    (Transit Blue - Light)")
        print("  - theme2-green   (Transit Green - Light)")
        print("  - theme3-dark    (Transit Dark - Dark mode)")
        print("  - theme4-purple  (Transit Purple - Light)")
        print("\nExample:")
        print("  python3 push_theme.py theme2-green")
        sys.exit(1)
    
    theme_name = sys.argv[1]
    
    print(f"\n{'='*60}")
    print(f"🎨 Theme Push: {theme_name}")
    print(f"{'='*60}\n")
    
    # 1. Find theme file
    theme_file_path = os.path.join(
        SCRIPT_DIR,
        'data',
        BUNDLE_ID,
        'themes',
        f"{theme_name}.json"
    )
    
    print(f"📂 Looking for: {theme_file_path}")
    
    if not os.path.exists(theme_file_path):
        print(f"❌ Theme file not found!")
        print(f"\nAvailable themes:")
        themes_dir = os.path.join(SCRIPT_DIR, 'data', BUNDLE_ID, 'themes')
        if os.path.exists(themes_dir):
            for f in os.listdir(themes_dir):
                if f.endswith('.json') and f != 'README.md':
                    print(f"  - {f[:-5]}")
        sys.exit(1)
    
    # 2. Validate JSON
    print("📋 Validating theme...")
    try:
        with open(theme_file_path, 'r', encoding='utf-8') as f:
            theme_config = json.load(f)
        
        if 'colors' not in theme_config:
            print("❌ Invalid theme: missing 'colors' field")
            sys.exit(1)
        
        theme_display_name = theme_config.get('name', theme_name)
        theme_mode = theme_config.get('mode', 'unknown')
        print(f"✅ Valid theme: {theme_display_name} ({theme_mode} mode)")
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON: {e}")
        sys.exit(1)
    
    # 3. Check device
    print("\n📱 Checking device connection...")
    devices = run_adb("adb devices")
    if not devices or len(devices.split('\n')) < 2:
        print("❌ No device connected!")
        print("Connect a device and try again.")
        sys.exit(1)
    print("✅ Device connected")
    
    # 4. Create themes directory on device
    print("\n📁 Preparing device storage...")
    device_theme_dir = f"/storage/emulated/0/Android/data/{BUNDLE_ID}/files/themes"
    run_adb(f"adb shell mkdir -p {device_theme_dir}")
    print("✅ Theme directory ready")
    
    # 5. Push theme file (always as theme.json)
    print(f"\n📤 Pushing theme...")
    print(f"   Source: {theme_name}.json")
    print(f"   Target: theme.json")
    
    remote_path = f"{device_theme_dir}/theme.json"
    push_cmd = f"adb push '{theme_file_path}' '{remote_path}'"
    
    try:
        result = subprocess.run(
            push_cmd,
            shell=True,
            capture_output=True,
            text=True,
            timeout=30
        )
        
        output = result.stdout + result.stderr
        
        if result.returncode == 0 or 'bytes' in output.lower():
            print(f"✅ Theme pushed successfully")
            if output.strip():
                print(f"   {output.strip()}")
        else:
            print(f"❌ Push failed")
            print(f"   Error: {output}")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Push failed: {e}")
        sys.exit(1)
    
    # 6. Verify file on device
    print("\n🔍 Verifying theme on device...")
    check_result = run_adb(f"adb shell ls {remote_path}")
    if remote_path in check_result:
        print(f"✅ Theme file confirmed on device")
    else:
        print(f"⚠️  Could not verify (but push succeeded)")
    
    # 7. Restart app
    print(f"\n🔄 Restarting app...")
    
    # Force stop
    run_adb(f"adb shell am force-stop {BUNDLE_ID}")
    print("   🛑 App stopped")
    
    time.sleep(1)
    
    # Start app
    run_adb(f"adb shell am start -n {BUNDLE_ID}/.MainActivity")
    print("   🚀 App starting...")
    
    # Wait for app to start
    time.sleep(3)
    
    # 8. Success!
    print(f"\n{'='*60}")
    print(f"✅ SUCCESS!")
    print(f"{'='*60}")
    print(f"\nTheme '{theme_display_name}' has been applied!")
    print("Check your device to see the new colors.")
    print(f"\n💡 Tip: Run 'adb logcat -s ReactNativeJS:*' to see app logs")

if __name__ == '__main__':
    main()

