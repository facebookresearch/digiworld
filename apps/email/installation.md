# Installation Guide for the App

This guide will help you set up the app from scratch on your local machine. Follow the steps below for both Mac/Linux and Windows environments.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (version 18 or higher)
- **Yarn** (package manager)
- **Git** (for cloning the repository)
- **Watchman** (recommended for macOS users)

### Installing Node.js and Yarn

- **Mac/Linux**: You can install Node.js using Homebrew (for macOS) or your package manager (for Linux):

  ```bash
  # macOS
  brew install node

  # Ubuntu/Debian
  sudo apt update
  sudo apt install nodejs npm

  # Fedora
  sudo dnf install nodejs
  ```

- **Windows**: Download the Node.js installer from the [official website](https://nodejs.org/) and follow the installation instructions. Ensure that the option to install npm is checked.

After installing Node.js, install Yarn globally:

```bash
npm install -g yarn
```

### Installing Git

- **Mac/Linux**: You can install Git using Homebrew or your package manager:

  ```bash
  # macOS
  brew install git

  # Ubuntu/Debian
  sudo apt install git

  # Fedora
  sudo dnf install git
  ```

- **Windows**: Download the Git installer from the [official website](https://git-scm.com/) and follow the installation instructions.

### Installing Watchman (macOS only)

Watchman is a tool developed by Facebook for watching changes in the filesystem. It is highly recommended for macOS users to improve performance.

```bash
brew install watchman
```

## Cloning the Repository

1. Open your terminal (or command prompt on Windows).
2. Navigate to the directory where you want to clone the repository.
3. Run the following command to clone the repository:

   ```bash
   git clone git@github.com:UnifyTech/Andojo-RN-Email-Sandbox.git
   ```

4. Navigate into the cloned directory:

   ```bash
   cd Andojo-RN-Email-Sandbox
   ```

## Installing Dependencies

Once you are in the project directory, install the required dependencies using Yarn:

```bash
yarn install
```

### Installing Peer Dependencies

If you encounter warnings about missing peer dependencies during installation, you can use the following command to automatically install them:

```bash
yarn add <package-name> --install-peer-dependencies
```

This command will:

- Install the specified package.
- Automatically install any peer dependencies that the package requires.

Using the `--install-peer-dependencies` flag can help ensure that your project has all the necessary dependencies to function correctly.

### Common Issues During Installation

- **Permission Issues**: If you encounter permission errors during installation, you may need to use `sudo` on macOS/Linux:

  ```bash
  sudo yarn install
  ```

- **Network Issues**: Ensure you have a stable internet connection while installing dependencies.

## Running the App

To start the app, you can use `npx` to run Expo commands without needing to install `expo-cli` globally. For example:

```bash
npx expo start
```

This will start the Expo development server. You can then open the app on your mobile device using the Expo developer build.

### Opening the App on a Mobile Device

1. Install the **Expo Developer Build** on your device. This is different from the Expo Go app and is specifically designed for development purposes.
2. Scan the QR code displayed in your terminal or browser to open the app on your device.

### Running on an Emulator

#### Setting Up Android Emulator

1. **Install Android Studio**:

   - Download and install Android Studio from the [official website](https://developer.android.com/studio).

2. **Set Up Android SDK**:

   - During installation, ensure that the Android SDK is installed. You can check this in Android Studio under **Preferences** > **Appearance & Behavior** > **System Settings** > **Android SDK**.

3. **Create an Android Virtual Device (AVD)**:

   - Open Android Studio.
   - Go to **Tools** > **AVD Manager**.
   - Click on **Create Virtual Device**.
   - Choose a device definition and click **Next**.
   - Select a system image (preferably one with Google Play) and click **Next**.
   - Configure the AVD settings as needed and click **Finish**.

4. **Start the Emulator**:

   - In the AVD Manager, click the **Play** button next to your newly created AVD to start the emulator.

5. **Run the App**:
   - In your terminal, run:
     ```bash
     npx expo start
     ```
   - Press `a` in the terminal to open the app in the Android emulator.

## Additional Resources for Managing AVDs

For more information on managing Android Virtual Devices (AVDs), you can refer to the official Android documentation: [Managing AVDs](https://developer.android.com/studio/run/managing-avds), or [watch this step by step guide to setup the AVDs](https://www.youtube.com/watch?v=GhuiNcOEv1A)

## Potential Pitfalls

- **Node.js Version**: Ensure you are using Node.js version 14 or higher. You can check your version with:

  ```bash
  node -v
  ```

- **Expo CLI Issues**: If you encounter issues with Expo commands, try clearing the cache:

  ```bash
  npx expo start -c
  ```

- **Network Issues**: Ensure your device is on the same network as your development machine to scan the QR code successfully.

- **Emulator Setup**: If you are using an Android emulator, ensure that it is properly set up and running before starting the app.

- **Permissions**: On Windows, you may need to run your terminal as an administrator to avoid permission issues.

- **Watchman**: If you are on macOS and experience issues with file watching, ensure that Watchman is installed and running.

## Additional Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [Node.js Documentation](https://nodejs.org/en/docs/)
- [Yarn Documentation](https://classic.yarnpkg.com/en/docs/)
- [Git Documentation](https://git-scm.com/doc)

If you encounter any issues, please refer to the documentation or open an issue in the repository.
