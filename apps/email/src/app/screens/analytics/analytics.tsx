import { StyleSheet, View, TouchableOpacity } from 'react-native'
import { Screen, Text, ListView } from '@/components'
import { colors } from '@andojo/shared-theme'
import { router } from 'expo-router'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/models/helpers/useStores'
import { Session } from '@/models/SessionStore'
import { useState, useEffect, useCallback } from 'react'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'

export default observer(function AnalyticsScreen() {
  const { sessionStore } = useStores()
  const { trackScreenMount, trackClick } = useInteractionTracking(
    'Analytics',
    '/(tabs)/analytics',
  )

  useEffect(() => {
    trackScreenMount({
      sessionCount: sessionStore.session.length,
    })
  }, [trackScreenMount, sessionStore.session.length])

  const handleSessionPress = useCallback(
    (sessionId: string) => {
      const session = sessionStore.getSession(sessionId)
      trackClick('sessionCard', {
        sessionId,
        screenName: session?.data.screenName,
        route: session?.data.route,
      })
      if (session) {
        if (session.data.route.startsWith('/screens/')) {
          router.push({
            pathname: session.data.route as
              | '/screens/auth/login'
              | '/screens/analytics/sessions',
            params: { sessionId },
          })
        } else {
          router.push({
            pathname: session.data.route as '/(tabs)',
            params: { sessionId },
          })
        }
      }
    },
    [trackClick, sessionStore],
  )

  return (
    <Screen preset="fixed" contentContainerStyle={styles.container}>
      <Text
        text="Session History"
        size="xxl"
        weight="bold"
        style={styles.title}
      />
      <Text
        text={`${sessionStore.session.length} sessions stored`}
        size="sm"
        style={styles.subtitle}
      />

      <ListView
        data={sessionStore.session.slice().reverse()}
        renderItem={({ item }) => (
          <SessionCard
            session={item}
            onPress={() => handleSessionPress(item.id)}
          />
        )}
        estimatedItemSize={200}
        contentContainerStyle={styles.listContent}
        keyExtractor={item => item.id}
      />
    </Screen>
  )
})

const SessionCard = ({
  session,
  onPress,
}: {
  session: Session
  onPress: () => void
}) => {
  const [isListExpanded, setIsListExpanded] = useState(false)
  const [expandedValues, setExpandedValues] = useState<Record<string, boolean>>(
    {},
  )

  const toggleListExpand = (e: any) => {
    e.stopPropagation()
    setIsListExpanded(!isListExpanded)
  }

  const toggleValueExpand = (key: string) => (e: any) => {
    e.stopPropagation()
    setExpandedValues(prev => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const formatValue = (value: any): string => {
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2)
    }
    return String(value)
  }

  const formDataEntries = Object.entries(session.data.formData || {})
  const hasMoreThanFiveEntries = formDataEntries.length > 2
  const displayedEntries = isListExpanded
    ? formDataEntries
    : formDataEntries.slice(0, 5)

  return (
    <TouchableOpacity style={styles.sessionCard} onPress={onPress}>
      <View style={styles.sessionHeader}>
        <View style={styles.sessionHeaderLeft}>
          <Text
            text={session.data.screenName}
            size="lg"
            weight="medium"
            style={styles.sessionId}
          />
          <Text text={session.data.route} size="xs" style={styles.routeName} />
        </View>
        <Text
          text={new Date(session.data.startTime).toLocaleString()}
          size="xs"
          style={styles.timestamp}
        />
      </View>

      <Text text={`ID: ${session.id}`} size="xs" style={styles.sessionIdText} />

      <View style={styles.statesContainer}>
        <View style={styles.formDataHeader}>
          <Text text="Form Data:" size="sm" weight="medium" />
          {hasMoreThanFiveEntries && (
            <TouchableOpacity
              onPress={toggleListExpand}
              style={styles.expandButton}
            >
              <Text
                text={
                  isListExpanded
                    ? 'Show Less'
                    : `Show More (${formDataEntries.length - 5})`
                }
                size="xs"
                style={styles.expandButtonText}
              />
            </TouchableOpacity>
          )}
        </View>
        {displayedEntries.map(([key, value]) => {
          const formattedValue = formatValue(value)
          const isLongValue = formattedValue.length > 30
          const isValueExpanded = expandedValues[key]

          return (
            <View key={key} style={styles.stateItem}>
              <Text text={key} size="sm" style={styles.stateKey} />
              <View style={styles.stateValueContainer}>
                <Text
                  text={
                    isLongValue && !isValueExpanded
                      ? formattedValue.slice(0, 30) + '...'
                      : formattedValue
                  }
                  size="xs"
                  style={styles.stateValue}
                />
                {isLongValue && (
                  <TouchableOpacity
                    onPress={toggleValueExpand(key)}
                    style={styles.readMoreButton}
                  >
                    <Text
                      text={isValueExpanded ? 'Show Less' : 'Read More'}
                      size="xs"
                      style={styles.readMoreText}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )
        })}
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  expandButton: {
    marginLeft: 8,
  },
  expandButtonText: {
    color: colors.palette.primary500,
  },
  formDataHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  listContent: {
    padding: 20,
    paddingTop: 10,
  },
  readMoreButton: {
    marginTop: 4,
  },
  readMoreText: {
    color: colors.palette.primary500,
    fontWeight: '500',
  },
  routeName: {
    color: colors.textDim,
    marginTop: 2,
  },
  sessionCard: {
    backgroundColor: colors.palette.neutral100,
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: colors.palette.neutral900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sessionHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  sessionId: {
    color: colors.text,
  },
  sessionIdText: {
    color: colors.textDim,
    fontSize: 12,
    marginBottom: 8,
  },
  stateItem: {
    marginTop: 8,
    paddingLeft: 16,
  },
  stateKey: {
    color: colors.text,
    fontWeight: '500',
    marginBottom: 4,
  },
  stateValue: {
    color: colors.textDim,
    flexWrap: 'wrap',
  },
  stateValueContainer: {
    flex: 1,
  },
  statesContainer: {
    marginTop: 12,
  },
  subtitle: {
    color: colors.textDim,
    marginBottom: 10,
    marginHorizontal: 16,
    marginTop: 8,
  },
  timestamp: {
    color: colors.textDim,
  },
  title: {
    marginHorizontal: 16,
    marginTop: 40,
  },
})
