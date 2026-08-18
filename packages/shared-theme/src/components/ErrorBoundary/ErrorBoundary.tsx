import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Clipboard } from 'react-native'
import { ErrorDetails } from './ErrorDetails'

interface Props {
  /**
   * The child components to render
   */
  children: ReactNode
  /**
   * Called when an error is caught
   */
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  /**
   * Optional catchAll prop - if true, will catch all errors including those in event handlers
   */
  catchAll?: boolean
}

interface State {
  error: Error | null
}

/**
 * Error boundary component that catches JavaScript errors anywhere in its child component tree.
 * Renders a fallback UI instead of the component tree that crashed.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  private handleReset = () => {
    this.setState({ error: null })
  }

  private handleCopy = async () => {
    if (this.state.error) {
      const errorText = `Error: ${this.state.error.message}\n\nStack: ${this.state.error.stack}`
      await Clipboard.setString(errorText)
    }
  }

  render() {
    const { error } = this.state
    const { children, catchAll } = this.props

    if (error) {
      return (
        <ErrorDetails
          error={error}
          onReset={this.handleReset}
          onCopy={this.handleCopy}
        />
      )
    }

    if (catchAll) {
      return <React.Suspense fallback={null}>{children}</React.Suspense>
    }

    return children
  }
}

// Create a hook for functional components to throw errors
export function useErrorBoundary(): (error: Error) => void {
  return React.useCallback((error: Error) => {
    throw error
  }, [])
}
