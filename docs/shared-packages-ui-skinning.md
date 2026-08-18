<!-- Copyright (c) Meta Platforms, Inc. and affiliates. -->
# Shared Theme Package for UI Skinning

This document explains how the `@andojo/shared-theme` package provides a comprehensive UI skinning solution for the Andojo React Native applications.

## Overview

The Andojo monorepo uses the shared theme package to ensure consistent UI/UX across all applications while allowing for app-specific customization and component theming.

## @andojo/shared-theme Package

### Purpose
The shared theme package provides a unified design system that ensures consistency across all Andojo applications while allowing for app-specific customization.

### Key Features

#### 1. **Multi-App Theming System**
- **App-specific themes**: Each app (ecommerce, eats, music, message, etc.) has its own color palette
- **Light/Dark mode support**: Separate theme files for light and dark modes
- **Consistent base structure**: All themes share the same typography, spacing, and timing configurations

#### 2. **Design Tokens**
```typescript
// Consistent spacing across all apps
spacing: {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, '2xl': 48, '3xl': 64
}

// Typography system
typography: {
  primary: fonts.spaceGrotesk,    // Main brand font
  secondary: Platform.select({...}), // Platform-specific secondary font
  code: Platform.select({...})     // Monospace for code
}

// Metrics for consistent sizing
metrics: {
  text: { tiny: 10, small: 12, medium: 14, large: 16, xl: 20, xxl: 24, xxxl: 32, xxxxl: 40 },
  icons: { tiny: 12, small: 16, medium: 24, large: 32, xl: 48 },
  buttonHeight: 56,
  inputHeight: 56,
  avatarSizeSmall: 32,
  avatarSizeMedium: 48,
  avatarSizeLarge: 64
}
```

#### 3. **Reusable Glue Stack UI Components**
- **Text**: Typography component with preset styles and size/weight options
- **Screen**: Layout component with safe area handling and scroll presets
- **Button**: Consistent button styling with variants
- **Input**: Form input component with validation states
- **Icon**: Icon wrapper with consistent sizing
- **Toast**: Notification system
- **LoadingOverlay**: Loading states
- **AutoImage**: Image component with fallback handling

#### 4. **Theme Context**
Provides theme switching capabilities and ensures all components use the correct theme:
```typescript
// Usage in components
import { useAppTheme } from '@andojo/shared-theme'
import { colors, metrics } from '@andojo/shared-theme'

const MyComponent = () => {
  const { colors, isDark } = useAppTheme()
  return (
    <View style={{ backgroundColor: colors.background }}>
      <Text style={{ color: colors.text }}>Hello World</Text>
    </View>
  )
}
```

### Component Customization Capabilities

The shared theme package provides extensive customization options for all components:

#### 1. **Text Component Customization**
```typescript
// Size variants
<Text text="Large heading" size="xxl" weight="bold" />
<Text text="Medium text" size="medium" weight="normal" />
<Text text="Small caption" size="small" weight="medium" />

// Preset styles
<Text text="Heading" preset="heading" />
<Text text="Subheading" preset="subheading" />
<Text text="Form label" preset="formLabel" />
<Text text="Helper text" preset="formHelper" />

// Custom styling
<Text 
  text="Custom styled text"
  style={{ 
    color: colors.primary500,
    fontFamily: typography.secondary.bold,
    textAlign: 'center'
  }}
/>
```

#### 2. **Button Component Customization**
```typescript
// Variant customization
<Button 
  text="Primary Button"
  variant="primary"
  size="large"
  onPress={handlePress}
/>

<Button 
  text="Secondary Button"
  variant="secondary"
  size="medium"
  disabled={true}
/>

// Custom styling
<Button 
  text="Custom Button"
  style={{
    backgroundColor: colors.accent500,
    borderRadius: metrics.borderRadiusLarge,
    borderWidth: 2,
    borderColor: colors.primary500
  }}
  textStyle={{
    color: colors.neutral100,
    fontWeight: 'bold'
  }}
/>
```

#### 3. **Screen Component Customization**
```typescript
// Preset layouts
<Screen preset="fixed" backgroundColor={colors.background}>
  <Content />
</Screen>

<Screen preset="scroll" safeAreaEdges={['top', 'bottom']}>
  <ScrollableContent />
</Screen>

<Screen preset="auto" keyboardOffset={100}>
  <AutoScrollContent />
</Screen>

// Custom configuration
<Screen 
  backgroundColor={colors.primary100}
  statusBarStyle="dark"
  keyboardBottomOffset={50}
  safeAreaEdges={['top']}
>
  <Content />
</Screen>
```

#### 4. **Input Component Customization**
```typescript
// Input variants
<Input 
  placeholder="Enter text"
  variant="outlined"
  size="large"
  error="Invalid input"
/>

<Input 
  placeholder="Search..."
  variant="filled"
  size="medium"
  leftIcon="search"
  rightIcon="clear"
/>

// Custom styling
<Input 
  placeholder="Custom input"
  style={{
    borderColor: colors.primary500,
    borderRadius: metrics.borderRadiusLarge,
    backgroundColor: colors.neutral100
  }}
  inputStyle={{
    color: colors.text,
    fontSize: metrics.text.large
  }}
/>
```

#### 5. **Icon Component Customization**
```typescript
// Size variants
<Icon name="heart" size="tiny" color={colors.primary500} />
<Icon name="star" size="small" color={colors.accent500} />
<Icon name="check" size="medium" color={colors.success500} />
<Icon name="arrow" size="large" color={colors.text} />

// Custom styling
<Icon 
  name="custom-icon"
  size="xl"
  style={{
    backgroundColor: colors.primary100,
    borderRadius: metrics.borderRadiusMedium,
    padding: metrics.small
  }}
/>
```

#### 6. **Toast Component Customization**
```typescript
// Toast variants
<Toast 
  message="Success message"
  variant="success"
  duration={3000}
/>

<Toast 
  message="Error message"
  variant="error"
  action={{
    label: "Retry",
    onPress: handleRetry
  }}
/>

// Custom styling
<Toast 
  message="Custom toast"
  style={{
    backgroundColor: colors.accent500,
    borderRadius: metrics.borderRadiusLarge
  }}
  textStyle={{
    color: colors.neutral100,
    fontWeight: 'bold'
  }}
/>
```

### App-Specific Color Palettes

Each app maintains its own color palette while sharing the same design system:

#### Ecommerce App
```typescript
palette: {
  primary500: '#2E8B57',    // Green brand color
  secondary500: '#41476E',   // Blue-gray accent
  accent500: '#FFBB50',      // Orange accent
  // ... neutral colors
}
```

#### Music App
```typescript
palette: {
  primary500: '#6366F1',     // Purple brand color
  secondary500: '#8B5CF6',   // Violet accent
  accent500: '#F59E0B',      // Amber accent
  // ... neutral colors
}
```

#### Message App
```typescript
palette: {
  primary500: '#3B82F6',     // Blue brand color
  secondary500: '#1E40AF',   // Dark blue accent
  accent500: '#10B981',      // Green accent
  // ... neutral colors
}
```



## Component Theming and Customization

### 1. **Consistent Visual Language**
The shared theme ensures all apps follow the same design principles:
- **Typography**: Consistent font families and sizing
- **Spacing**: Unified spacing scale across all components
- **Colors**: App-specific palettes with consistent semantic meaning
- **Components**: Reusable UI components with consistent behavior

### 2. **Brand Differentiation**
While maintaining consistency, each app can express its unique brand:
- **Ecommerce**: Green primary color for trust and growth
- **Music**: Purple primary color for creativity and energy
- **Message**: Blue primary color for communication and reliability
- **Eats**: Orange primary color for appetite and excitement

### 3. **Advanced Component Customization**
Components can be customized at multiple levels:

#### **Theme-Level Customization**
```typescript
// Custom theme configuration
const customTheme = {
  colors: {
    ...baseColors,
    customPrimary: '#FF6B35',
    customSecondary: '#4ECDC4'
  },
  metrics: {
    ...baseMetrics,
    customSpacing: 20,
    customBorderRadius: 25
  }
}
```

#### **Component-Level Customization**
```typescript
// Extending existing components
const CustomButton = ({ variant = 'custom', ...props }) => {
  const { colors, metrics } = useAppTheme()
  
  const customStyles = {
    custom: {
      backgroundColor: colors.customPrimary,
      borderRadius: metrics.customBorderRadius,
      borderWidth: 3,
      borderColor: colors.customSecondary
    }
  }
  
  return (
    <Button 
      {...props}
      style={[customStyles[variant], props.style]}
    />
  )
}
```

#### **Instance-Level Customization**
```typescript
// Inline customization for specific use cases
<Button 
  text="Special Action"
  style={{
    backgroundColor: colors.accent500,
    borderRadius: metrics.borderRadiusLarge,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8
  }}
  textStyle={{
    color: colors.neutral100,
    fontWeight: 'bold',
    fontSize: metrics.text.large
  }}
/>
```

### 4. **Theme Switching and Dynamic Theming**
The system supports dynamic theme switching:
```typescript
// Dark/Light mode switching
const { toggleTheme, isDark } = useAppTheme()

// App-specific theme switching
const { switchAppTheme } = useAppTheme()
switchAppTheme('ecommerce') // Switch to ecommerce theme

// Runtime theme modification
const { updateTheme } = useAppTheme()
updateTheme({
  colors: { primary500: '#FF6B35' },
  metrics: { buttonHeight: 64 }
})
```

## Benefits for UI Skinning

### 1. **Scalability**
- New apps can easily adopt the design system
- Consistent onboarding experience across all apps
- Reduced design debt and maintenance overhead

### 2. **Developer Experience**
- Type-safe theme usage with TypeScript
- IntelliSense support for colors, spacing, and components
- Consistent API across all applications

### 3. **Performance**
- Optimized asset loading and caching
- Reduced bundle size through shared components
- Efficient theme switching without re-renders

### 4. **Maintainability**
- Centralized design system updates
- Single source of truth for assets
- Easy A/B testing of themes and assets

### 5. **Accessibility**
- Consistent contrast ratios across themes
- Unified accessibility features in shared components
- Platform-specific adaptations handled automatically

## Usage Examples

### Basic Component with Theme
```typescript
import { Text, colors, metrics } from '@andojo/shared-theme'

const WelcomeMessage = () => (
  <Text 
    text="Welcome to Andojo"
    size="xxl"
    weight="bold"
    style={{ 
      color: colors.text,
      marginBottom: metrics.large 
    }}
  />
)
```

### Custom Themed Component
```typescript
import { Text, Button, colors, metrics } from '@andojo/shared-theme'

const CustomCard = ({ title, description, onPress }) => {
  const { colors, metrics } = useAppTheme()
  
  return (
    <View style={{
      backgroundColor: colors.background,
      borderRadius: metrics.borderRadiusLarge,
      padding: metrics.large,
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3
    }}>
      <Text 
        text={title}
        size="large"
        weight="bold"
        style={{ color: colors.text, marginBottom: metrics.small }}
      />
      <Text 
        text={description}
        size="medium"
        style={{ color: colors.textDim, marginBottom: metrics.medium }}
      />
      <Button 
        text="Action"
        variant="primary"
        size="medium"
        onPress={onPress}
        style={{
          backgroundColor: colors.primary500,
          borderRadius: metrics.borderRadiusMedium
        }}
      />
    </View>
  )
}
```

## Best Practices

### 1. **Theme Usage**
- Always use theme colors instead of hardcoded values
- Use semantic color names (text, background, primary) over specific colors
- Leverage the spacing and metrics system for consistent layouts

### 2. **Component Customization**
- Extend existing components with custom variants when possible
- Use theme tokens (colors, metrics, spacing) instead of hardcoded values
- Create reusable custom components that follow the design system

### 3. **Component Development**
- Extend existing shared components when possible
- Maintain consistent prop interfaces across similar components
- Use TypeScript for type safety and better developer experience

### 4. **Performance**
- Use theme tokens for consistent styling without runtime calculations
- Leverage component memoization for frequently used custom components
- Implement proper theme switching without unnecessary re-renders

This shared theme package provides a robust foundation for maintaining consistent, scalable, and maintainable UI across all Andojo applications while allowing for extensive component customization and brand expression. 