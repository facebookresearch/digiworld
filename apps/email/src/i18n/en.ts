// Copyright (c) Meta Platforms, Inc. and affiliates.
const en = {
  common: {
    ok: 'OK!',
    cancel: 'Cancel',
    back: 'Back',
    search: 'Search',
    empty: 'No items found',
    alert: 'Change Language',
    confirm: 'Confirm',
  },
  welcomeScreen: {
    title: 'Welcome to Andojo Mail',
    secureText: 'Secure Email Environment',
    connecting: 'Connecting to secure email services...',
    version: 'Version 2.0.1',
    copyright: '© 2024 Andojo Mail',
  },
  emptyState: {
    noEmails: 'No emails found',
    emptyInbox: 'Your inbox is empty',
    emptySent: 'No sent emails',
    emptyDraft: 'No drafts',
    emptyTrash: 'Trash is empty',
    emptyArchived: 'No archived emails',
  },
  emailScreen: {
    search: 'Search emails...',
    folders: {
      inbox: 'Inbox',
      sent: 'Sent',
      draft: 'Drafts',
      trash: 'Trash',
    },
    compose: 'Compose',
    menu: 'Menu',
  },
  composeScreen: {
    attachments: {
      title: 'Attachments',
      add: 'Add Attachment',
      remove: 'Remove',
    },
  },
  contactsScreen: {
    search: 'Search contacts...',
    favorites: 'Favorites',
    contacts: 'Contacts',
    empty: 'No contacts found',
    allContacts: 'All Contacts',
    searchResult: 'Search Results',
  },
  inboxScreen: {
    search: 'Search emails...',
    preview: 'Message preview',
    unread: 'Unread',
  },

  authScreen: {
    login: {
      title: 'Welcome Back',
      subtitle: 'Sign in to your email account',
      emailPlaceholder: 'Email address',
      enterEmail: 'Please enter email',
      enterPswd: 'Please enter password',
      validEmail: 'Please enter a valid email address',
      emailPasswordValidationMsg: 'Please enter both email and password',
      passwordPlaceholder: 'Password',
      signInButton: 'Sign In',
      loggingIn: 'Logging in...',
      forgotPassword: 'Forgot Password?',
      createAccount: 'Create one',
      createAccountPrompt: "Don't have an account?",
    },
    editProfile: {
      validationMsg: 'First Name, Last Name, and Email are required.',
      validEmail: 'Please enter a valid email address',
      validPhpne: 'Please enter 10 digits phone number',
      error: 'Error',
    },
  },
  errorScreen: {
    title: 'Something went wrong!',
    friendlySubtitle: 'Please try again later or contact support.',
    reset: 'RESET APP',
  },
  emptyStateComponent: {
    generic: {
      heading: 'No Emails Yet',
      content: 'Your inbox is empty. New messages will appear here.',
      button: 'Refresh',
    },
  },
  profileScreen: {
    editProfile: 'Edit Profile',
    editProfileSubtitle: 'Name, avatar & personal info',
    theme: 'Theme',
    language: 'Language',
    emailSettings: 'Email Settings',
    security: 'Security & Privacy',
    notifications: 'Notifications',
    currentTheme: 'Current: {{theme}}',
    currentLanguage: 'Current: {{language}}',
    twoFactorStatus: '2FA: {{status}}',
    notificationStatus: 'Status: {{status}}',
    languageChangeMessage:
      'To apply the language change, please restart the app. Continue?',
  },
}

export default en

export type Translations = typeof en
