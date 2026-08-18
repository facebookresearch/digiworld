// Copyright (c) Meta Platforms, Inc. and affiliates.
import { getLatestInteraction } from '@andojo/shared-interaction-tracking'
import { Instance, SnapshotIn, SnapshotOut, types } from 'mobx-state-tree'

export interface SessionFormData {
  [key: string]: unknown
  status?: string
  completedAt?: number
  lastUpdated?: number
}

const SessionDataModel = types.model('SessionData').props({
  screenName: types.string,
  route: types.string,
  startTime: types.number,
  endTime: types.optional(types.number, 0),
  sessionData: types.frozen<SessionFormData>({}),
  action: types.optional(types.string, ''),
  timestamp: types.number,
})

export const SessionModel = types.model('Session').props({
  id: types.identifier,
  data: SessionDataModel,
})
export const SessionStore = types
  .model('SessionStore')
  .props({
    session: types.maybeNull(SessionModel),
  })
  .views(self => ({
    getSession() {
      // Otherwise, return the current session
      return self.session
    },
  }))
  .actions(self => ({
    async handleDeepLink(sessionId: string) {
      const validTimestamp = Date.now()

      const { data } = getLatestInteraction()
      const { screenName, route } = data
      console.log('📸 Session capture:', {
        sessionId,
        screenName,
        route,
        metadata: data?.metadata,
      })

      // Combine metadata with any existing formData from the interaction
      const sessionData = {
        ...(data?.metadata || {}),
        formData: data?.formData || data?.metadata || {},
      }

      // Create new session
      const session = SessionModel.create({
        id: sessionId,
        data: {
          screenName: screenName || 'Unknown',
          route: route || '/',
          startTime: validTimestamp,
          timestamp: validTimestamp,
          sessionData,
        },
      })

      self.session = session
      console.log('✅ Session saved:', sessionId)
      return session
    },
    clearAllSessions() {
      self.session = null
    },
    restore(data: any) {
      Object.keys(data).forEach(key => {
        if (key in self) {
          ;(self as any)[key] = data[key]
        }
      })
    },
  }))

export interface Session extends Instance<typeof SessionModel> {}
export interface SessionStoreModel extends Instance<typeof SessionStore> {}
export interface SessionStoreSnapshot
  extends SnapshotOut<typeof SessionStore> {}
export interface SessionStoreSnapshotIn
  extends SnapshotIn<typeof SessionStore> {}
