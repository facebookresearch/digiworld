import { StyleSheet, View, TouchableOpacity, FlatList } from 'react-native'
import { Screen, Text } from '@/components'
import { colors } from '@andojo/shared-theme'
import { router } from 'expo-router'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/models/helpers/useStores'
import { Session } from '@/models/SessionStore'
import { useEffect, useCallback } from 'react'
import { useInteractionTracking } from '@andojo/shared-interaction-tracking'

export default observer(function SessionsScreen() {
  const { sessionStore } = useStores()
  const { trackScreenMount, trackClick } = useInteractionTracking(
    'Sessions',
    '/screens/analytics/sessions',
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
        if (session.data.route === '/') {
          router.push({
            pathname: '/' as const,
            params: { sessionId },
          })
        } else {
          router.push({
            pathname: session.data.route as any,
            params: { sessionId },
          })
        }
      }
    },
    [trackClick, sessionStore],
  )

  const renderSession = useCallback(
    ({ item }: { item: Session }) => {
      return (
        <SessionCard
          session={item}
          onPress={() => handleSessionPress(item.id)}
        />
      )
    },
    [handleSessionPress],
  )

  const sessions = sessionStore.session.slice().reverse()

  return (
    <Screen preset="fixed" style={styles.screen}>
      <View style={styles.header}>
        <Text
          text="Session History"
          size="xxl"
          weight="bold"
          style={styles.title}
        />
        <Text
          text="Tap on a session to restore its state"
          size="sm"
          style={styles.subtitle}
        />
      </View>

      {sessions.length === 0 ? (
        <View style={styles.emptyState}>
          <Text text="No sessions yet" size="lg" style={styles.emptyText} />
          <Text
            text="Visit some screens to create sessions"
            size="sm"
            style={styles.emptySubtext}
          />
        </View>
      ) : (
        <FlatList
          data={sessions}
          renderItem={renderSession}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text
                text="No sessions found"
                size="lg"
                style={styles.emptyText}
              />
            </View>
          }
        />
      )}
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
  return (
    <TouchableOpacity style={styles.sessionCard} onPress={onPress}>
      <View style={styles.sessionHeader}>
        <Text
          text={session.data.screenName}
          size="lg"
          weight="medium"
          style={styles.sessionId}
        />
        <Text
          text={new Date(session.data.startTime).toLocaleString()}
          size="xs"
          style={styles.timestamp}
        />
      </View>

      <View style={styles.statesContainer}>
        <Text text="Form Data:" size="sm" weight="medium" />
        {Object.entries(session.data.formData || {}).map(([key, value]) => (
          <View key={key} style={styles.stateItem}>
            <Text text={key} size="sm" style={styles.screenType} />
            <Text
              text={
                typeof value === 'object'
                  ? JSON.stringify(value)
                  : String(value)
              }
              size="xs"
              style={styles.stateTimestamp}
            />
          </View>
        ))}
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  emptyState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  emptySubtext: {
    color: colors.textDim,
  },
  emptyText: {
    color: colors.text,
    marginBottom: 8,
  },
  header: {
    padding: 20,
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
  },
  screen: {
    flex: 1,
  },
  screenType: {
    color: colors.text,
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
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sessionId: {
    color: colors.text,
  },
  stateItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingLeft: 16,
  },
  stateTimestamp: {
    color: colors.textDim,
  },
  statesContainer: {
    marginTop: 12,
  },
  subtitle: {
    color: colors.textDim,
    marginTop: 8,
  },
  timestamp: {
    color: colors.textDim,
  },
  title: {
    marginTop: 40,
  },
})
