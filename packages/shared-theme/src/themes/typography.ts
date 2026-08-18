import { Platform } from 'react-native'
import {
  SpaceGrotesk_300Light as spaceGroteskLight,
  SpaceGrotesk_400Regular as spaceGroteskRegular,
  SpaceGrotesk_500Medium as spaceGroteskMedium,
  SpaceGrotesk_600SemiBold as spaceGroteskSemiBold,
  SpaceGrotesk_700Bold as spaceGroteskBold,
} from '@expo-google-fonts/space-grotesk'

export const customFontsToLoad = {
  spaceGroteskLight,
  spaceGroteskRegular,
  spaceGroteskMedium,
  spaceGroteskSemiBold,
  spaceGroteskBold,
}

const fonts = {
  spaceGrotesk: {
    light: 'spaceGroteskLight',
    normal: 'spaceGroteskRegular',
    medium: 'spaceGroteskMedium',
    semiBold: 'spaceGroteskSemiBold',
    bold: 'spaceGroteskBold',
  },
  helveticaNeue: {
    thin: 'HelveticaNeue-Thin',
    light: 'HelveticaNeue-Light',
    normal: 'Helvetica Neue',
    medium: 'HelveticaNeue-Medium',
  },
  courier: {
    normal: 'Courier',
  },
  sansSerif: {
    thin: 'sans-serif-thin',
    light: 'sans-serif-light',
    normal: 'sans-serif',
    medium: 'sans-serif-medium',
  },
  monospace: {
    normal: 'monospace',
  },
}

export const typography = {
  fonts,
  primary: fonts.spaceGrotesk,
  secondary: Platform.select({
    ios: fonts.helveticaNeue,
    android: fonts.sansSerif,
  }),
  code: Platform.select({ ios: fonts.courier, android: fonts.monospace }),
}
