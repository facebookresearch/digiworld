export const baseTheme = {
  typography: {
    fonts: {
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
    },
    primary: {
      light: 'spaceGroteskLight',
      normal: 'spaceGroteskRegular',
      medium: 'spaceGroteskMedium',
      semiBold: 'spaceGroteskSemiBold',
      bold: 'spaceGroteskBold',
    },
    secondary: {
      thin: 'HelveticaNeue-Thin',
      light: 'HelveticaNeue-Light',
      normal: 'Helvetica Neue',
      medium: 'HelveticaNeue-Medium',
    },
    code: {
      normal: 'Courier',
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    '3xl': 64,
  },
  timing: {
    fast: 200,
    normal: 300,
    slow: 500,
  },
  styles: {
    shadow: {
      sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.18,
        shadowRadius: 1.0,
        elevation: 1,
      },
      md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
      },
    },
    borderRadius: {
      sm: 4,
      md: 8,
      lg: 12,
      xl: 16,
      full: 9999,
    },
  },
}
