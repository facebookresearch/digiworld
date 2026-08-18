# @andojo/shared-theme

A comprehensive, runtime-configurable theme system for React Native applications with support for custom colors, fonts, and component styles through JSON configuration files.

## Features

✨ **Runtime Theme Loading** - Load and change themes dynamically from JSON without rebuilding  
🎨 **Complete Color System** - Comprehensive color palette with semantic naming  
📝 **Typography Control** - Custom font families and text styling  
🔧 **Component Customization** - Override styles for Button, Input, Text, Screen components  
🌓 **Light/Dark Mode** - Built-in support for theme modes  
📦 **Multiple Themes** - Load bundles of themes and switch between them  
⚡ **Performance Optimized** - Built-in caching and efficient updates  
🔒 **Type Safe** - Full TypeScript support

## Quick Start

### Installation

```bash
yarn add @andojo/shared-theme
```

### Basic Usage

```typescript
// App.tsx
import { ThemeProvider } from '@andojo/shared-theme'

export default function App() {
  return (
    <ThemeProvider>
      <MyApp />
    </ThemeProvider>
  )
}

// MyScreen.tsx
import { Screen, Button, Text, useTheme } from '@andojo/shared-theme'

function MyScreen() {
  const { theme } = useTheme()
  
  return (
    <Screen>
      <Text preset="heading">Hello World</Text>
      <Button text="Press Me" variant="primary" />
    </Screen>
  )
}
```

### Load Custom Theme at Runtime

```typescript
import { useTheme } from '@andojo/shared-theme'

function ThemeSettings() {
  const { loadThemeFromJSON } = useTheme()
  
  const loadCustomTheme = async () => {
    const response = await fetch('https://api.myapp.com/theme.json')
    const themeJSON = await response.text()
    loadThemeFromJSON(themeJSON)
  }
  
  return <Button onPress={loadCustomTheme} text="Load Theme" />
}
```

## Theme Configuration

Create a JSON file to customize your theme:

```json
{
  "name": "MyTheme",
  "mode": "light",
  "colors": {
    "palette": {
      "primary500": "#2196F3",
      "secondary500": "#9C27B0"
    }
  },
  "components": {
    "button": {
      "defaultHeight": 56,
      "defaultBorderRadius": 12,
      "primaryBackground": "#2196F3",
      "primaryText": "#FFFFFF"
    },
    "input": {
      "fontSize": 16,
      "borderColor": "#BBDEFB"
    }
  }
}
```

## Components

### Button

```typescript
<Button 
  text="Click Me" 
  variant="primary" // or "secondary", "outline"
  onPress={() => console.log('Pressed')}
/>
```

### Input

```typescript
<Input
  placeholder="Enter text"
  variant="bordered" // or "underlined", "plain"
  LeftAccessory={IconComponent}
/>
```

### Text

```typescript
<Text 
  preset="heading"  // or "subheading", "bold", etc.
  size="large"
  weight="semiBold"
>
  Hello World
</Text>
```

### Screen

```typescript
<Screen 
  preset="scroll" // or "fixed", "auto"
  safeAreaEdges={['top', 'bottom']}
>
  {children}
</Screen>
```

## API

### useTheme Hook

```typescript
const {
  theme,                      // Current theme object
  mode,                       // 'light' | 'dark'
  componentStyles,            // Component style overrides
  loadThemeFromJSON,          // Load theme from JSON string
  loadThemeFromConfig,        // Load theme from config object
  loadThemeBundle,            // Load multiple themes
  setTheme,                   // Switch between loaded themes
  updateComponentStyles,      // Update component styles
} = useTheme()
```

### Access Theme Values

```typescript
const { theme } = useTheme()

// Colors
theme.colors.palette.primary500
theme.colors.text
theme.colors.background

// Typography
theme.typography.primary.bold
theme.typography.secondary.normal

// Spacing
theme.spacing.md
theme.spacing.xl

// Styles
theme.styles.borderRadius.lg
theme.styles.shadow.md
```

## Configuration Examples

See the `config-examples/` directory for complete examples:

- `theme-light-example.json` - Complete light theme configuration
- `theme-dark-example.json` - Complete dark theme configuration  
- `theme-bundle-example.json` - Multiple themes in one bundle

## Documentation

For comprehensive documentation, see [THEME_CONFIG_GUIDE.md](./THEME_CONFIG_GUIDE.md)

Topics covered:
- Complete configuration structure
- Loading themes at runtime
- Component style customization
- Typography and color system
- API reference
- Best practices
- Troubleshooting

## Exports

```typescript
// Components
export { Button, Input, Text, Screen, Icon, AutoImage, LoadingOverlay }
export { Toast, useToast, useToastProvider }
export { GluestackProvider }

// Hooks & Context
export { useTheme, ThemeProvider }
export { useAppTheme }

// Theme Configuration
export { ThemeLoader, ComponentStyleManager }
export { defaultComponentStyles }
export type { 
  ThemeConfig, 
  RuntimeThemeBundle,
  ComponentStyleConfig,
  ColorPalette,
  SemanticColors,
  TypographyConfig
}

// Theme Utilities
export { baseTheme, metrics, spacing, typography }
export { useSafeAreaInsetsStyle }

// Types
export type { 
  Theme, 
  ThemeColors, 
  ThemeTypography,
  AppTheme,
  ThemeMode
}
```

## TypeScript

Full TypeScript support with comprehensive type definitions:

```typescript
import type { 
  ThemeConfig,
  ComponentStyleConfig,
  RuntimeThemeBundle
} from '@andojo/shared-theme'

const config: ThemeConfig = {
  name: 'MyTheme',
  mode: 'light',
  colors: { /* ... */ },
  components: { /* ... */ }
}
```

## Advanced Usage

### Initialize with Custom Theme

```typescript
import { ThemeProvider, ThemeConfig } from '@andojo/shared-theme'

const initialTheme: ThemeConfig = {
  name: 'AppTheme',
  mode: 'light',
  colors: { /* ... */ }
}

export default function App() {
  return (
    <ThemeProvider initialThemeConfig={initialTheme}>
      <MyApp />
    </ThemeProvider>
  )
}
```

### Load Theme Bundle

```typescript
import { useTheme, RuntimeThemeBundle } from '@andojo/shared-theme'

const bundle: RuntimeThemeBundle = {
  version: '1.0.0',
  defaultTheme: 'light',
  themes: {
    light: { /* ... */ },
    dark: { /* ... */ },
    ocean: { /* ... */ }
  }
}

function ThemeSwitcher() {
  const { loadThemeBundle, setTheme } = useTheme()
  
  useEffect(() => {
    loadThemeBundle(bundle)
  }, [])
  
  return (
    <>
      <Button onPress={() => setTheme('light')} text="Light" />
      <Button onPress={() => setTheme('dark')} text="Dark" />
      <Button onPress={() => setTheme('ocean')} text="Ocean" />
    </>
  )
}
```

### Update Component Styles Programmatically

```typescript
import { ComponentStyleManager } from '@andojo/shared-theme'

// Update specific component styles
ComponentStyleManager.updateButton({
  defaultHeight: 48,
  primaryBackground: '#FF0000'
})

// Reset to defaults
ComponentStyleManager.reset()
```

## License

Private - Part of @andojo monorepo

## Support

For issues and questions, please refer to the main monorepo documentation.

