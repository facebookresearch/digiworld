import {
  Instance,
  SnapshotIn,
  SnapshotOut,
  types,
  getRoot,
} from 'mobx-state-tree'
import { logoutUser } from '../services/api/auth'
import { User } from './types'
import { mutations } from '@/db/mutations'
import { queries } from '@/db/queries'
import { ContactItem } from '@/app/screens/contacts/hooks'

// Callback registry for alert confirmations (outside MST since functions can't be serialized)
const alertCallbackRegistry = new Map<string, () => void>()
let alertCallbackIdCounter = 0

const AlertState = types.model('AlertState', {
  visible: types.optional(types.boolean, false),
  title: types.optional(types.string, ''),
  message: types.optional(types.string, ''),
  preset: types.optional(
    types.enumeration(['default', 'success', 'error', 'warning', 'delete']),
    'default',
  ),
  onConfirmCallbackId: types.maybeNull(types.string),
})

export const UserStoreModel = types
  .model('UserStore')
  .props({
    currentUser: types.maybeNull(types.frozen<User>()),
    authToken: types.maybeNull(types.string),
    navigationSource: types.maybeNull(types.string),
    selectedContacts: types.array(types.string), // observable array
    selectedContactObjects: types.optional(types.frozen<ContactItem[]>(), []),
    currentGroupMembers: types.optional(types.array(types.string), []), // Store current group member IDs
    // Track edited messages across the app
    editedMessageIds: types.optional(types.array(types.string), []),
    // Chat settings
    chatSettings: types.optional(
      types.model({
        fontSize: types.optional(types.string, 'medium'),
        wallpaper: types.optional(types.string, 'default'),
        notificationTone: types.optional(types.string, 'default.mp3'),
      }),
      {
        fontSize: 'medium',
        wallpaper: 'default',
        notificationTone: 'default.mp3',
      },
    ),
    // Add contact form
    contactForm: types.optional(
      types.model({
        name: types.optional(types.string, ''),
        phoneNumber: types.optional(types.string, '+1'),
        avatarUrl: types.maybeNull(types.string),
        currentFocused: types.maybeNull(types.string),
        isLoading: types.optional(types.boolean, false),
        userExists: types.maybeNull(types.frozen()),
        checkingUser: types.optional(types.boolean, false),
      }),
      {
        name: '',
        phoneNumber: '+1',
        avatarUrl: null,
        currentFocused: null,
        isLoading: false,
        userExists: null,
        checkingUser: false,
      },
    ),
    // Groups screen state
    groupsScreen: types.optional(
      types.model({
        isRefreshing: types.optional(types.boolean, false),
        groups: types.optional(types.array(types.frozen()), []),
        isLoading: types.optional(types.boolean, true), // Start with true for initial load
        failedAvatars: types.optional(types.array(types.string), []),
        refreshKey: types.optional(types.number, 0),
        selectedGroupId: types.maybeNull(types.string),
      }),
      {
        isRefreshing: false,
        groups: [],
        isLoading: true, // Start with true for initial load
        failedAvatars: [],
        refreshKey: 0,
        selectedGroupId: null,
      },
    ),
    // Alert state
    alertState: types.optional(AlertState, {
      visible: false,
      title: '',
      message: '',
      preset: 'default',
      onConfirmCallbackId: null,
    }),
  })
  .actions(store => ({
    setCurrentUser(user: User | null) {
      store.currentUser = user
    },

    setAuthToken(token: string | null) {
      store.authToken = token
    },

    setNavigationSource(source: string | null) {
      store.navigationSource = source
    },

    clearNavigationSource() {
      store.navigationSource = null
    },

    toggleContactSelection(contactId: string) {
      console.log('toggleContactSelection', contactId)
      console.log(
        'Before toggle - selectedContacts:',
        store.selectedContacts.slice(),
      )

      const index = store.selectedContacts.indexOf(contactId)
      if (index > -1) {
        store.selectedContacts.splice(index, 1)
        console.log('Removed contact from selection')
      } else {
        store.selectedContacts.push(contactId)
        console.log('Added contact to selection')
      }

      console.log(
        'After toggle - selectedContacts:',
        store.selectedContacts.slice(),
      )
    },

    clearSelectedContacts() {
      store.selectedContacts.clear()
    },

    setSelectedContactObjects(contacts: ContactItem[]) {
      store.selectedContactObjects = contacts
    },

    setCurrentGroupMembers(memberIds: string[]) {
      store.currentGroupMembers.replace(memberIds)
    },

    clearCurrentGroupMembers() {
      store.currentGroupMembers.clear()
    },

    // Edited messages actions
    addEditedMessage(messageId: string) {
      if (!store.editedMessageIds.includes(messageId)) {
        store.editedMessageIds.push(messageId)
      }
    },

    removeEditedMessage(messageId: string) {
      const index = store.editedMessageIds.indexOf(messageId)
      if (index > -1) {
        store.editedMessageIds.splice(index, 1)
      }
    },

    clearEditedMessages() {
      store.editedMessageIds.clear()
    },

    isMessageEdited(messageId: string) {
      return store.editedMessageIds.includes(messageId)
    },

    async login(userDetails: User, authToken: string) {
      try {
        if (userDetails && authToken) {
          this.setCurrentUser(userDetails)
          this.setAuthToken(authToken)
        }
      } catch (error) {
        this.setCurrentUser(null)
        this.setAuthToken(null)
      }
    },

    async logout() {
      try {
        if (store.authToken) {
          await logoutUser(store.authToken)
        }
      } finally {
        const root: any = getRoot(store)
        if (root.uiStore) root.uiStore.resetState()
        if (root.sessionStore) root.sessionStore.clearAllSessions()

        this.setCurrentUser(null)
        this.setAuthToken(null)
      }
    },

    updateUserProfile(profile: Partial<User>) {
      if (store.currentUser) {
        store.currentUser = {
          ...store.currentUser,
          ...profile,
        }
      }
    },

    async updateLastLoggedIn() {
      if (store.currentUser) {
        const updatedUser = {
          ...store.currentUser,
          lastLoggedIn: Date.now(),
        }
        this.setCurrentUser(updatedUser)

        try {
          await mutations.updateUser(store.currentUser.id, {
            lastLoggedIn: Date.now(),
          })
        } catch (error) {
          console.error('Error updating last logged in:', error)
        }
      }
    },

    restore(snapshot: any) {
      try {
        this.setCurrentUser(snapshot.currentUser || null)
        this.setAuthToken(snapshot.authToken || null)

        // Restore chat settings from snapshot and normalize legacy path values.
        if (snapshot.chatSettings) {
          this.setChatSettings({
            fontSize: snapshot.chatSettings.fontSize || 'medium',
            wallpaper: this.normalizeWallpaper(snapshot.chatSettings.wallpaper),
            notificationTone:
              snapshot.chatSettings.notificationTone || 'default.mp3',
          })
        }

        // Restore contact form if present in snapshot
        if (snapshot.contactForm) {
          this.setContactForm({
            name: snapshot.contactForm.name || '',
            phoneNumber: snapshot.contactForm.phoneNumber || '+1',
            avatarUrl: snapshot.contactForm.avatarUrl || null,
          })
          if (snapshot.contactForm.currentFocused) {
            this.setContactFormFocused(
              snapshot.contactForm.currentFocused as 'name' | 'phoneNumber',
            )
          }
          if (snapshot.contactForm.isLoading !== undefined) {
            this.setContactFormLoading(snapshot.contactForm.isLoading)
          }
          if (snapshot.contactForm.userExists !== undefined) {
            this.setContactFormUserExists(snapshot.contactForm.userExists)
          }
          if (snapshot.contactForm.checkingUser !== undefined) {
            this.setContactFormCheckingUser(snapshot.contactForm.checkingUser)
          }
        }

        // Restore groups screen state if present in snapshot
        if (snapshot.groupsScreen) {
          if (snapshot.groupsScreen.selectedGroupId !== undefined) {
            this.setSelectedGroupId(snapshot.groupsScreen.selectedGroupId)
          }
          if (snapshot.groupsScreen.isLoading !== undefined) {
            this.setGroupsScreenLoading(snapshot.groupsScreen.isLoading)
          }
          if (snapshot.groupsScreen.isRefreshing !== undefined) {
            this.setGroupsScreenRefreshing(snapshot.groupsScreen.isRefreshing)
          }
          if (
            snapshot.groupsScreen.groups &&
            Array.isArray(snapshot.groupsScreen.groups)
          ) {
            this.setGroupsScreenGroups(snapshot.groupsScreen.groups)
          }
          if (
            snapshot.groupsScreen.failedAvatars &&
            Array.isArray(snapshot.groupsScreen.failedAvatars)
          ) {
            // Restore failed avatars
            snapshot.groupsScreen.failedAvatars.forEach((groupId: string) => {
              if (!store.groupsScreen.failedAvatars.includes(groupId)) {
                store.groupsScreen.failedAvatars.push(groupId)
              }
            })
          }
          if (snapshot.groupsScreen.refreshKey !== undefined) {
            // Note: refreshKey is typically reset, but we can restore it if needed
            // For now, we'll leave it as is since it's mainly for forcing re-renders
          }
        }

        // Restore alert state if present in snapshot
        if (snapshot.alertState) {
          store.alertState.visible = snapshot.alertState.visible || false
          store.alertState.title = snapshot.alertState.title || ''
          store.alertState.message = snapshot.alertState.message || ''
          store.alertState.preset = snapshot.alertState.preset || 'default'
          // Note: onConfirmCallbackId is not restored as callbacks can't be serialized
        }
      } catch (error) {
        console.error('Error restoring user store:', error)
        this.setCurrentUser(null)
        this.setAuthToken(null)
        // Reset contact form on error
        this.resetContactForm()
      }
    },

    // Chat settings actions
    setChatSettings(settings: {
      fontSize?: string
      wallpaper?: string
      notificationTone?: string
    }) {
      store.chatSettings = {
        ...store.chatSettings,
        ...settings,
      }
    },

    // Contact form actions
    setContactFormField(
      field: 'name' | 'phoneNumber' | 'avatarUrl',
      value: string | null,
    ) {
      if (field === 'avatarUrl') {
        store.contactForm.avatarUrl = value
      } else {
        ;(store.contactForm as any)[field] = value || ''
      }
    },

    setContactForm(form: {
      name?: string
      phoneNumber?: string
      avatarUrl?: string | null
    }) {
      if (form.name !== undefined) {
        store.contactForm.name = form.name
      }
      if (form.phoneNumber !== undefined) {
        store.contactForm.phoneNumber = form.phoneNumber
      }
      if (form.avatarUrl !== undefined) {
        store.contactForm.avatarUrl = form.avatarUrl
      }
    },

    setContactFormFocused(field: 'name' | 'phoneNumber' | null) {
      store.contactForm.currentFocused = field
    },

    setContactFormLoading(loading: boolean) {
      store.contactForm.isLoading = loading
    },

    resetContactForm() {
      store.contactForm.name = ''
      store.contactForm.phoneNumber = '+1'
      store.contactForm.avatarUrl = null
      store.contactForm.currentFocused = null
      store.contactForm.isLoading = false
      store.contactForm.userExists = null
      store.contactForm.checkingUser = false
    },

    setContactFormUserExists(user: any) {
      store.contactForm.userExists = user
    },

    setContactFormCheckingUser(checking: boolean) {
      store.contactForm.checkingUser = checking
    },

    // Groups screen actions
    setGroupsScreenRefreshing(refreshing: boolean) {
      store.groupsScreen.isRefreshing = refreshing
    },

    setGroupsScreenGroups(groups: any[]) {
      store.groupsScreen.groups.replace(groups)
    },

    setGroupsScreenLoading(loading: boolean) {
      store.groupsScreen.isLoading = loading
    },

    addFailedAvatar(groupId: string) {
      if (!store.groupsScreen.failedAvatars.includes(groupId)) {
        store.groupsScreen.failedAvatars.push(groupId)
      }
    },

    removeFailedAvatar(groupId: string) {
      const index = store.groupsScreen.failedAvatars.indexOf(groupId)
      if (index > -1) {
        store.groupsScreen.failedAvatars.splice(index, 1)
      }
    },

    clearFailedAvatars() {
      store.groupsScreen.failedAvatars.clear()
    },

    incrementRefreshKey() {
      store.groupsScreen.refreshKey += 1
    },

    setSelectedGroupId(groupId: string | null) {
      store.groupsScreen.selectedGroupId = groupId
    },

    resetGroupsScreen() {
      store.groupsScreen.isRefreshing = false
      store.groupsScreen.groups.clear()
      store.groupsScreen.isLoading = false // Don't reset to true, keep it false
      store.groupsScreen.failedAvatars.clear()
      store.groupsScreen.refreshKey = 0
      store.groupsScreen.selectedGroupId = null
    },

    // Alert actions
    showAlert(config: {
      title?: string
      message: string
      preset?: 'default' | 'success' | 'error' | 'warning' | 'delete'
      onConfirm?: () => void
    }) {
      // Clear any existing callback
      if (store.alertState.onConfirmCallbackId) {
        alertCallbackRegistry.delete(store.alertState.onConfirmCallbackId)
      }

      // Store callback in registry if provided
      let callbackId: string | null = null
      if (config.onConfirm) {
        callbackId = `alert_${++alertCallbackIdCounter}_${Date.now()}`
        alertCallbackRegistry.set(callbackId, config.onConfirm)
      }

      store.alertState.visible = true
      store.alertState.title = config.title || ''
      store.alertState.message = config.message
      store.alertState.preset = config.preset || 'default'
      store.alertState.onConfirmCallbackId = callbackId
    },

    hideAlert() {
      // Clean up callback from registry
      if (store.alertState.onConfirmCallbackId) {
        alertCallbackRegistry.delete(store.alertState.onConfirmCallbackId)
      }

      store.alertState.visible = false
      store.alertState.title = ''
      store.alertState.message = ''
      store.alertState.preset = 'default'
      store.alertState.onConfirmCallbackId = null
    },

    // Helper to get the onConfirm callback
    getAlertOnConfirm(): (() => void) | null {
      if (!store.alertState.onConfirmCallbackId) {
        return null
      }
      return (
        alertCallbackRegistry.get(store.alertState.onConfirmCallbackId) || null
      )
    },

    setFontSize(fontSize: string) {
      store.chatSettings.fontSize = fontSize
    },

    setWallpaper(wallpaper: string) {
      store.chatSettings.wallpaper = wallpaper
    },

    setNotificationTone(notificationTone: string) {
      store.chatSettings.notificationTone = notificationTone
    },

    // Helper function to normalize wallpaper values
    normalizeWallpaper(wallpaper: string | null | undefined): string {
      if (!wallpaper) return 'default'

      const wallpaperLower = wallpaper.toLowerCase()
      console.log(
        'Normalizing wallpaper:',
        wallpaper,
        '-> lower:',
        wallpaperLower,
      )

      if (wallpaperLower.includes('default')) {
        console.log('Mapped to: default')
        return 'default'
      }
      if (wallpaperLower.includes('gradient')) {
        console.log('Mapped to: gradient')
        return 'gradient'
      }
      if (wallpaperLower.includes('space')) {
        console.log('Mapped to: space')
        return 'space'
      }

      // If none match, default to 'default'
      console.log('No match found, defaulting to: default')
      return 'default'
    },

    async loadChatSettings() {
      if (!store.currentUser?.id) return

      try {
        const chatSettings = await queries.getChatSettings(store.currentUser.id)

        if (chatSettings) {
          this.setChatSettings({
            fontSize: chatSettings.fontSize || 'medium',
            wallpaper: this.normalizeWallpaper(chatSettings.wallpaper),
            notificationTone: chatSettings.notificationTone || 'default.mp3',
          })
        } else {
          // Create default settings for new users
          const defaultSettings = {
            userId: store.currentUser.id,
            fontSize: 'medium',
            wallpaper: 'default',
            notificationTone: 'default.mp3',
          }

          try {
            // Save default settings to database
            const result = await mutations.createChatSettings(defaultSettings)

            if (result.success) {
              // Set in store only if creation was successful
              this.setChatSettings({
                fontSize: 'medium',
                wallpaper: 'default',
                notificationTone: 'default.mp3',
              })
            } else {
              // If creation failed, try to load again in case settings were created by another process
              const retrySettings = await queries.getChatSettings(
                store.currentUser.id,
              )
              if (retrySettings) {
                this.setChatSettings({
                  fontSize: retrySettings.fontSize || 'medium',
                  wallpaper: this.normalizeWallpaper(retrySettings.wallpaper),
                  notificationTone:
                    retrySettings.notificationTone || 'default.mp3',
                })
              } else {
                // Fallback to defaults in store only
                this.setChatSettings({
                  fontSize: 'medium',
                  wallpaper: 'default',
                  notificationTone: 'default.mp3',
                })
              }
            }
          } catch (createError) {
            console.error('Error creating chat settings:', createError)

            // If creation failed due to UNIQUE constraint, try to load existing settings
            if (
              createError instanceof Error &&
              createError.message?.includes('UNIQUE constraint failed')
            ) {
              const retrySettings = await queries.getChatSettings(
                store.currentUser.id,
              )
              if (retrySettings) {
                this.setChatSettings({
                  fontSize: retrySettings.fontSize || 'medium',
                  wallpaper: this.normalizeWallpaper(retrySettings.wallpaper),
                  notificationTone:
                    retrySettings.notificationTone || 'default.mp3',
                })
              } else {
                // Fallback to defaults in store only
                this.setChatSettings({
                  fontSize: 'medium',
                  wallpaper: 'default',
                  notificationTone: 'default.mp3',
                })
              }
            } else {
              // For other errors, fallback to defaults in store only
              this.setChatSettings({
                fontSize: 'medium',
                wallpaper: 'default',
                notificationTone: 'default.mp3',
              })
            }
          }
        }
      } catch (error) {
        console.error('Error loading chat settings:', error)
        // Set defaults even if database operation fails
        this.setChatSettings({
          fontSize: 'medium',
          wallpaper: 'default',
          notificationTone: 'default.mp3',
        })
      }
    },

    async saveChatSettings() {
      if (!store.currentUser?.id) return

      try {
        await mutations.updateChatSettings(store.currentUser.id, {
          fontSize: store.chatSettings.fontSize,
          wallpaper: store.chatSettings.wallpaper,
          notificationTone: store.chatSettings.notificationTone,
        })
      } catch (error) {
        console.error('Error saving chat settings:', error)
      }
    },
  }))
  .views(store => ({
    get isAuthenticated() {
      return !!store.currentUser && !!store.authToken
    },

    get shouldHideCurrentUser() {
      return store.navigationSource === 'groups'
    },

    get isGroupCreationMode() {
      return store.navigationSource === 'groups'
    },

    get selectedContactsCount() {
      return store.selectedContacts.length
    },

    isContactSelected(contactId: string) {
      return store.selectedContacts.includes(contactId)
    },

    isCurrentGroupMember(contactId: string) {
      // Handle both formats: "db-1" and "1"
      const cleanId = contactId.replace('db-', '')
      return store.currentGroupMembers.includes(cleanId)
    },
    get userInitials() {
      if (!store.currentUser?.name) return ''
      const nameParts = store.currentUser.name.split(' ')
      if (nameParts.length >= 2) {
        return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
      }
      return store.currentUser.name.substring(0, 2).toUpperCase()
    },

    get displayName() {
      return store.currentUser?.name || 'User'
    },

    get phoneNumber() {
      return store.currentUser?.phoneNumber || ''
    },

    get avatarUrl() {
      return store.currentUser?.avatarUrl || null
    },

    get lastLoggedIn() {
      return store.currentUser?.lastLoggedIn || 0
    },

    get currentFontSize() {
      return store.chatSettings.fontSize
    },

    get currentWallpaper() {
      return store.chatSettings.wallpaper
    },

    get currentNotificationTone() {
      return store.chatSettings.notificationTone
    },
  }))

export interface UserStore extends Instance<typeof UserStoreModel> {}
export interface UserStoreSnapshotOut
  extends SnapshotOut<typeof UserStoreModel> {}
export interface UserStoreSnapshotIn
  extends SnapshotIn<typeof UserStoreModel> {}
