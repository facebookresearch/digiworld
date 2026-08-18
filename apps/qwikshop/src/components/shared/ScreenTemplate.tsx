// Copyright (c) Meta Platforms, Inc. and affiliates.
import React from 'react'
import { ScrollView, View, StyleSheet } from 'react-native'
import { GradientBackground } from './GradientBackground'
import { GradientHeader } from './GradientHeader'

interface ScreenTemplateProps {
  children: React.ReactNode
  title?: string
  showHeader?: boolean
  showBackButton?: boolean
  headerRightComponent?: React.ReactNode
  scrollable?: boolean
  backgroundVariant?: 'primary' | 'secondary' | 'accent' | 'background' | 'card'
  headerVariant?: 'primary' | 'secondary' | 'accent'
}

export const ScreenTemplate: React.FC<ScreenTemplateProps> = ({
  children,
  title,
  showHeader = false,
  showBackButton = true,
  headerRightComponent,
  scrollable = true,
  backgroundVariant = 'background',
  headerVariant = 'primary',
}) => {
  const ContentComponent = scrollable ? ScrollView : View

  return (
    <GradientBackground variant={backgroundVariant}>
      {showHeader && title && (
        <GradientHeader
          title={title}
          showBackButton={showBackButton}
          rightComponent={headerRightComponent}
          variant={headerVariant}
        />
      )}

      <ContentComponent
        style={scrollable ? styles.scrollContent : styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={scrollable ? styles.scrollContainer : undefined}
      >
        {children}
      </ContentComponent>
    </GradientBackground>
  )
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 16,
  },
})
