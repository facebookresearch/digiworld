import { ComponentStyleConfig } from './themeConfig.types'

/**
 * Default component styles
 */
export const defaultComponentStyles: ComponentStyleConfig = {
  button: {
    defaultHeight: 56,
    defaultBorderRadius: 12,
    defaultPaddingHorizontal: 24,
    defaultPaddingVertical: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    defaultHeight: 56,
    defaultBorderRadius: 14,
    defaultPaddingHorizontal: 12,
    defaultPaddingVertical: 15,
    fontSize: 16,
    fontWeight: '500',
    borderWidth: 1,
    placeholderColor: 'rgba(0,0,0,0.4)',
    textColor: '#1a1a1a',
  },
  text: {
    defaultFontSize: 14,
    defaultLineHeight: 20,
    headingFontSize: 32,
    headingLineHeight: 40,
    subheadingFontSize: 20,
    subheadingLineHeight: 28,
  },
  screen: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
}

/**
 * Component Style Manager
 * Manages and provides component-specific styling configuration
 */
export class ComponentStyleManager {
  private static styles: ComponentStyleConfig = { ...defaultComponentStyles }

  /**
   * Load component styles from configuration
   */
  static loadStyles(config?: ComponentStyleConfig): void {
    if (!config) return

    this.styles = {
      button: { ...defaultComponentStyles.button, ...config.button },
      input: { ...defaultComponentStyles.input, ...config.input },
      text: { ...defaultComponentStyles.text, ...config.text },
      screen: { ...defaultComponentStyles.screen, ...config.screen },
    }
  }

  /**
   * Get all component styles
   */
  static getAll(): ComponentStyleConfig {
    return this.styles
  }

  /**
   * Get button styles
   */
  static getButton() {
    return this.styles.button || defaultComponentStyles.button
  }

  /**
   * Get input styles
   */
  static getInput() {
    return this.styles.input || defaultComponentStyles.input
  }

  /**
   * Get text styles
   */
  static getText() {
    return this.styles.text || defaultComponentStyles.text
  }

  /**
   * Get screen styles
   */
  static getScreen() {
    return this.styles.screen || defaultComponentStyles.screen
  }

  /**
   * Reset to default styles
   */
  static reset(): void {
    this.styles = { ...defaultComponentStyles }
  }

  /**
   * Update specific component styles at runtime
   */
  static updateButton(styles: Partial<ComponentStyleConfig['button']>): void {
    this.styles.button = { ...this.styles.button, ...styles }
  }

  static updateInput(styles: Partial<ComponentStyleConfig['input']>): void {
    this.styles.input = { ...this.styles.input, ...styles }
  }

  static updateText(styles: Partial<ComponentStyleConfig['text']>): void {
    this.styles.text = { ...this.styles.text, ...styles }
  }

  static updateScreen(styles: Partial<ComponentStyleConfig['screen']>): void {
    this.styles.screen = { ...this.styles.screen, ...styles }
  }
}
