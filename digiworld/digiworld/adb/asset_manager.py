# Copyright (c) Meta Platforms, Inc. and affiliates.
import argparse
import shutil
import zipfile
from pathlib import Path


class AssetManager:
    def __init__(self, base_dir):
        self.base_dir = Path(base_dir)
        self.data_dir = self.base_dir / "data"

    def clean_assets(self, app_package=None, profile_name=None):
        """Clean extracted assets for specific package/profile or all"""
        if app_package:
            package_dir = self.data_dir / app_package
            if not package_dir.exists():
                print(f"Package {app_package} not found")
                return

            if profile_name:
                # Clean specific profile
                assets_dir = package_dir / profile_name / "mockdata" / "assets"
                if assets_dir.exists():
                    shutil.rmtree(assets_dir)
                    print(f"Cleaned assets for {app_package}/{profile_name}")
            else:
                # Clean all profiles in package
                for profile in package_dir.iterdir():
                    if profile.is_dir():
                        assets_dir = profile / "mockdata" / "assets"
                        if assets_dir.exists():
                            shutil.rmtree(assets_dir)
                print(f"Cleaned assets for all profiles in {app_package}")
        else:
            # Clean all packages
            for package in self.data_dir.iterdir():
                if package.is_dir():
                    for profile in package.iterdir():
                        if profile.is_dir():
                            assets_dir = profile / "mockdata" / "assets"
                            if assets_dir.exists():
                                shutil.rmtree(assets_dir)
            print("Cleaned assets for all packages and profiles")

    def extract_assets(self, app_package, profile_name):
        """Extract assets from zip file to the appropriate location"""
        # Construct paths
        mockdata_dir = self.data_dir / app_package / profile_name / "mockdata"
        zip_file = mockdata_dir / "media.zip"
        assets_dir = mockdata_dir / "assets"

        # Create assets directory if it doesn't exist
        assets_dir.mkdir(parents=True, exist_ok=True)

        # Extract zip file
        if zip_file.exists():
            with zipfile.ZipFile(zip_file, "r") as zip_ref:
                zip_ref.extractall(assets_dir)
            # Remove __MACOSX directory if it exists
            macosx_dir = assets_dir / "__MACOSX"
            if macosx_dir.exists() and macosx_dir.is_dir():
                shutil.rmtree(macosx_dir)
            print(f"Extracted assets to {assets_dir}")
        else:
            print(f"Zip file not found at {zip_file}")

    def process_package(self, app_package):
        """Process all profiles in a specific package"""
        package_dir = self.data_dir / app_package
        if not package_dir.exists():
            print(f"Package {app_package} not found")
            return

        for profile in package_dir.iterdir():
            if profile.is_dir():
                self.extract_assets(app_package, profile.name)

    def process_all_packages(self):
        """Process all profiles in all packages"""
        for app_package in self.data_dir.iterdir():
            if app_package.is_dir():
                self.process_package(app_package.name)


def main():
    parser = argparse.ArgumentParser(description="Manage assets for Android apps")
    parser.add_argument(
        "--package", help="Specific package to process (e.g., com.andojomail.sbx)"
    )
    parser.add_argument("--profile", help="Specific profile to process")
    parser.add_argument(
        "--clean", action="store_true", help="Clean assets before extraction"
    )
    args = parser.parse_args()

    # Get the directory where this script is located
    base_dir = Path(__file__).parent
    manager = AssetManager(base_dir)

    if args.clean:
        manager.clean_assets(args.package, args.profile)

    if args.package:
        if args.profile:
            manager.extract_assets(args.package, args.profile)
        else:
            manager.process_package(args.package)
    else:
        manager.process_all_packages()


if __name__ == "__main__":
    main()
