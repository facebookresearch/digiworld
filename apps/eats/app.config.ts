import { ExpoConfig, ConfigContext } from '@expo/config'

/**
 * Use ts-node here so we can use TypeScript for our Config Plugins
 * and not have to compile them to JavaScript
 */
require('ts-node/register')

/**
 * @param config ExpoConfig coming from the static config app.json if it exists
 *
 * You can read more about Expo's Configuration Resolution Rules here:
 * https://docs.expo.dev/workflow/configuration/#configuration-resolution-rules
 */
module.exports = ({ config }: ConfigContext): Partial<ExpoConfig> => {
  const existingPlugins = config.plugins ?? []
  const appVersion = process.env.APP_VERSION || config.version
  const buildNumber = process.env.APP_BUILD_NUMBER
    ? parseInt(process.env.APP_BUILD_NUMBER, 10)
    : undefined

  return {
    ...config,
    version: appVersion,
    android: {
      ...config.android,
      ...(buildNumber !== undefined ? { versionCode: buildNumber } : {}),
    },
    plugins: [
      ...existingPlugins,
      require('./plugins/withSplashScreen').withSplashScreen,
    ],
  }
}
