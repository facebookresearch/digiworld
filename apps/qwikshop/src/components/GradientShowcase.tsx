// Copyright (c) Meta Platforms, Inc. and affiliates.
import React from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { LinearGradient } from 'react-native-linear-gradient'
import { observer } from 'mobx-react-lite'
import { useAppTheme } from '@andojo/shared-theme'

export const GradientShowcase = observer(() => {
  const { theme } = useAppTheme()

  const gradientSamples = [
    {
      name: 'App Background',
      colors: [
        theme.colors.palette.primary100,
        theme.colors.palette.primary200,
        theme.colors.palette.primary300,
      ],
    },
    {
      name: 'Header Primary',
      colors: [
        theme.colors.palette.primary500,
        theme.colors.palette.primary600,
      ],
    },
    {
      name: 'Header Secondary',
      colors: [
        theme.colors.palette.primary400,
        theme.colors.palette.primary500,
      ],
    },
    {
      name: 'Card Primary',
      colors: [theme.colors.card, theme.colors.backgroundSecondary],
    },
    {
      name: 'Card Highlight',
      colors: [theme.colors.palette.primary50, theme.colors.palette.primary100],
    },
    {
      name: 'Button Primary',
      colors: [
        theme.colors.palette.primary500,
        theme.colors.palette.primary600,
      ],
    },
    {
      name: 'Button Secondary',
      colors: [theme.colors.palette.accent500, theme.colors.palette.accent600],
    },
    {
      name: 'Category Card',
      colors: [
        theme.colors.palette.primary100,
        theme.colors.palette.primary200,
      ],
    },
  ]

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>QwikShop Gradient System</Text>
      <Text style={styles.subtitle}>Cohesive and elegant color gradients</Text>

      {gradientSamples.map((sample, index) => (
        <View key={index} style={styles.sampleContainer}>
          <LinearGradient
            colors={sample.colors}
            style={styles.gradientSample}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.sampleText}>{sample.name}</Text>
          </LinearGradient>
        </View>
      ))}
    </ScrollView>
  )
})

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F8F9FA',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#343A40',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6C757D',
    marginBottom: 24,
    textAlign: 'center',
  },
  sampleContainer: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gradientSample: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  sampleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
})
