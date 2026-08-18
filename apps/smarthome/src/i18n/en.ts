// Copyright (c) Meta Platforms, Inc. and affiliates.
const en = {
  common: {
    ok: 'OK',
    cancel: 'Cancel',
    back: 'Back',
    logOut: 'Log Out',
    loading: 'Loading...',
    retry: 'Retry',
    error: 'Error',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    play: 'Play',
    pause: 'Pause',
    duration: '{{minutes}}:{{seconds}}',
    noResults: 'No results found',
    emptyState: 'Nothing to see here yet',
    songs: {
      one: '{{count}} song',
      other: '{{count}} songs',
    },
    songs_zero: 'No songs',
    songs_one: '{{count}} song',
    songs_other: '{{count}} songs',
  },
  welcomeScreen: {
    title: 'Welcome to Andojo Video',
    secureText: 'Secure video Environment',
    connecting: 'Connecting to secure video services...',
    version: 'Version 1.0.0',
    copyright: '© 2025 Andojo. All rights reserved.',
    loading: 'Loading...',
  },
  auth: {
    welcomeBack: 'Welcome Back',
    signInToContinue: 'Sign in to continue',
    createAccount: 'Create an Account',
    signUpToStart: 'Sign up to get started',
    email: 'Email',
    password: 'Password',
    fullName: 'Full Name',
    forgotPassword: 'Forgot Password?',
    signIn: 'Sign In',
    signUp: 'Sign Up',
    noAccount: "Don't have an account?",
    hasAccount: 'Already have an account?',
    emailPlaceholder: 'Enter your email',
    passwordPlaceholder: 'Enter your password',
    namePlaceholder: 'Enter your full name',
    termsOfService: 'Terms of Service',
    privacyPolicy: 'Privacy Policy',
    byContinuingYouAgreeTo: 'By continuing, you agree to our',
    and: 'and',
    or: 'OR',
    signUpForFree: 'Sign up for free!',
    bySigningUpYouAgreeTo: 'By signing up, you agree to our',
    logIn: 'Log In',
    validation: {
      emailRequired: 'Email is required',
      emailInvalid: 'Invalid email format',
      passwordRequired: 'Password is required',
      passwordLength: 'Password must be at least 8 characters',
      nameRequired: 'Full name is required',
    },
  },
  errorScreen: {
    title: 'Something went wrong!',
    friendlySubtitle:
      "This is the screen that your users will see in production when an error is thrown. You'll want to customize this message (located in `app/i18n/en.ts`) and probably the layout as well (`app/screens/ErrorScreen`). If you want to remove this entirely, check `app/app.tsx` for the <ErrorBoundary> component.",
    reset: 'RESET APP',
    traceTitle: 'Error from %{name} stack',
  },
  emptyStateComponent: {
    generic: {
      heading: 'So empty... so sad',
      content:
        'No data found yet. Try clicking the button to refresh or reload the app.',
      button: "Let's try this again",
    },
  },

  errors: {
    invalidEmail: 'Invalid email address.',
    initialization: 'Failed to initialize application',
  },
  loginScreen: {
    logIn: 'Log In',
    enterDetails:
      "Enter your details below to unlock top secret info. You'll never guess what we've got waiting. Or maybe you will; it's not rocket science here.",
    emailFieldLabel: 'Email',
    passwordFieldLabel: 'Password',
    emailFieldPlaceholder: 'Enter your email address',
    passwordFieldPlaceholder: 'Super secret password here',
    tapToLogIn: 'Tap to log in!',
    hint: 'Hint: you can use any email address and your favorite password :)',
  },
  home: {
    moods: {
      perfectFor: 'Perfect for {{mood}}',
    },
    playCount: '{{count}} plays',
    trendingArtists: 'Trending Artists',
    monthlyListeners: 'monthly listeners',
    recentlyPlayed: 'Recently Played',
    popularSongs: 'Popular Songs',
    topAlbums: 'Top Albums',
    newReleases: 'New Releases',
  },
  player: {
    nowPlaying: 'Now Playing',
    playback: {
      play: 'Play',
      pause: 'Pause',
      next: 'Next Track',
      previous: 'Previous Track',
      shuffle: 'Shuffle',
      repeat: {
        none: 'No Repeat',
        all: 'Repeat All',
        one: 'Repeat One',
      },
    },
    actions: {
      addToFavorites: 'Add to Favorites',
      removeFromFavorites: 'Remove from Favorites',
      share: 'Share Song',
    },
    errors: {
      playbackFailed: 'Failed to play song',
      toggleFavoriteFailed: 'Failed to update favorites',
    },
  },
  library: {
    title: 'Your Library',
    playlists: 'Playlists',
    favorites: 'Favorites',
    recentlyPlayed: 'Recently Played',
    albums: 'Albums',
    artists: 'Artists',
    song: 'song',
    songs: 'Songs',
    createNewPlaylist: 'Create New Playlist',
    createPlaylist: 'Create Playlist',
    addToPlaylist: 'Add to Playlist',
    editPlaylist: 'Edit Playlist',
    deletePlaylist: 'Delete Playlist',
    playlistName: 'Playlist Name',
    playlistDescription: 'Playlist Description',
    emptyPlaylist: 'This playlist is empty',
    addSongs: 'Add Songs',
    confirmDelete: 'Are you sure you want to delete this playlist?',
    details: {
      addSongs: 'Add Songs',
      emptyState: 'This playlist is empty',
      emptyStateSubtext: 'Start adding some songs!',
      songCount: '{{count}} songs',
      duration: '{{minutes}}:{{seconds}}',
      remove: 'Remove from playlist',
      monthlyListeners: '{{count}} monthly listeners',
      releaseYear: 'Released in {{year}}',
      playbackSettings: {
        shuffle: 'Shuffle',
        repeat: {
          none: 'No Repeat',
          all: 'Repeat All',
          one: 'Repeat One',
        },
      },
      errors: {
        playFailed: 'Failed to play {{type}}',
        toggleRepeatFailed: 'Failed to toggle repeat mode',
        removeSongFailed: 'Failed to remove song',
      },
    },
    emptyMessages: {
      playlists: {
        title: 'No Playlists Yet',
        subtitle: 'Create your first playlist to start organizing your video',
      },
      artists: {
        title: 'No Artists Yet',
        subtitle: 'Follow some artists to see them here',
      },
      albums: {
        title: 'No Albums Yet',
        subtitle: 'Save some albums to your library',
      },
      songs: {
        title: 'No Songs Yet',
        subtitle: 'Add songs to your library',
      },
      history: {
        title: 'No History Yet',
        subtitle: 'Start playing some video to see your history',
      },
    },
  },
  search: {
    title: 'Search',
    placeholder: 'Search for songs, artists, or albums',
    noResults: 'No results found',
    topResults: 'Top Results',
    categories: {
      all: 'All',
      songs: 'Songs',
      artists: 'Artists',
      albums: 'Albums',
      playlists: 'Playlists',
    },
    recentSearches: 'Recent Searches',
    trending: 'Trending',
    clearHistory: 'Clear History',
    clear: 'Clear',
    seeAll: 'See All',
    browseAll: 'Browse All',
    details: {
      songCount: '{{count}} songs',
      monthlyListeners: '{{count}} monthly listeners',
      playAll: 'Play All',
      shuffle: 'Shuffle',
      duration: '{{minutes}}:{{seconds}}',
    },
  },
  profile: {
    stats: {
      playlists: 'Playlists',
      timeSpent: 'Time Spent',
      timeFormat: {
        hoursAndMinutes: '{{hours}} hour{{plural}} {{minutes}} mins',
        onlyMinutes: '{{minutes}} mins',
      },
    },
    sections: {
      preferences: {
        title: 'Preferences',
        language: 'Language',
      },
      support: {
        title: 'Support',
        helpAndSupport: 'Help & Support',
        about: 'About',
      },
      legal: {
        title: 'Legal',
        termsAndConditions: 'Terms & Conditions',
        privacyPolicy: 'Privacy Policy',
      },
    },
    actions: {
      logOut: 'Log out',
    },
  },
  termsAndConditions: {
    headerTitle: 'Terms & Conditions',
    lastUpdated: 'Last Updated: May 5, 2025',
    sections: {
      acceptance: {
        title: '1. Acceptance of Terms',
        text: 'By accessing and using the Andojo SmartHome streaming service, you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you may not use our service.',
      },
      serviceDescription: {
        title: '2. Service Description',
        text: 'Andojo SmartHome provides a personalized smart home service that allows users to control their home devices.',
      },
      userAccounts: {
        title: '3. User Accounts',
        text: [
          '3.1. You must create an account to use our service.',
          '3.2. You are responsible for maintaining the confidentiality of your account credentials.',
          '3.3. You agree to provide accurate and complete information when creating your account.',
        ],
      },
      subscription: {
        title: '4. Subscription and Payments',
        text: [
          '4.1. Access to premium features requires a paid subscription.',
          '4.2. Subscription fees are billed in advance on a recurring basis.',
          '4.3. You can cancel your subscription at any time.',
        ],
      },
      contentUsage: {
        title: '5. Content Usage',
        text: [
          '5.1. All content available through our service is protected by copyright.',
          '5.2. You may not download, copy, or share content except as permitted by our service.',
          '5.3. You may create and share playlists using our service.',
        ],
      },
      userConduct: {
        title: '6. User Conduct',
        text: [
          'You agree not to:',
          '- Use the service for any illegal purpose',
          '- Share your account credentials',
          '- Attempt to circumvent any technical measures',
          '- Upload any harmful content or malware',
        ],
      },
      availability: {
        title: '7. Service Availability',
        text: 'We strive to provide uninterrupted service but do not guarantee that the service will be available at all times. We reserve the right to modify or discontinue features without notice.',
      },
      termination: {
        title: '8. Termination',
        text: 'We may terminate or suspend your account for violations of these terms. You may terminate your account at any time by contacting support.',
      },
      changes: {
        title: '9. Changes to Terms',
        text: 'We may modify these terms at any time. Continued use of the service after changes constitutes acceptance of the modified terms.',
      },
      contact: {
        title: '10. Contact Us',
        text: 'If you have any questions about these Terms, please contact us at legal@andojo.com',
      },
    },
  },
  privacyPolicy: {
    headerTitle: 'Privacy Policy',
    lastUpdated: 'Last Updated: March 15, 2024',
    sections: {
      introduction: {
        title: '1. Introduction',
        text: 'This Privacy Policy explains how Andojo SmartHome ("we," "us," or "our") collects, uses, and protects your personal information when you use our smart home service.',
      },
      informationWeCollect: {
        title: '2. Information We Collect',
        text: [
          '2.1. Account Information:',
          '- Name and email address',
          '- Profile information',
          '- Payment information',
          '',
          '2.2. Usage Information:',
          '- Listening history',
          '- Playlists and favorites',
          '- Device information',
          '- Location data',
        ],
      },
      howWeUseInfo: {
        title: '3. How We Use Your Information',
        text: [
          'We use your information to:',
          '- Provide and improve our service',
          '- Personalize your smart home experience',
          '- Process payments',
          '- Send service updates and marketing communications',
          '- Analyze usage patterns',
          '- Prevent fraud and ensure security',
        ],
      },
      informationSharing: {
        title: '4. Information Sharing',
        text: [
          'We may share your information with:',
          '- Service providers and partners',
          '- Other users (if you choose to make your profile public)',
          '- Legal authorities when required by law',
        ],
      },
      dataSecurity: {
        title: '5. Data Security',
        text: 'We implement appropriate technical and organizational measures to protect your personal information. However, no method of transmission over the internet is 100% secure.',
      },
      yourRights: {
        title: '6. Your Rights',
        text: [
          'You have the right to:',
          '- Access your personal data',
          '- Correct inaccurate data',
          '- Delete your data',
          '- Object to data processing',
          '- Export your data',
        ],
      },
      cookies: {
        title: '7. Cookies and Tracking',
        text: 'We use cookies and similar technologies to enhance your experience, analyze usage, and provide personalized content. You can control cookie settings through your browser.',
      },
      children: {
        title: "8. Children's Privacy",
        text: 'Our service is not intended for children under 13. We do not knowingly collect personal information from children under 13.',
      },
      international: {
        title: '9. International Data Transfers',
        text: 'Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers.',
      },
      changes: {
        title: '10. Changes to Privacy Policy',
        text: 'We may update this Privacy Policy periodically. We will notify you of any material changes through our service or via email.',
      },
      contact: {
        title: '11. Contact Us',
        text: 'For privacy-related inquiries, please contact our Data Protection Officer at privacy@andojo.com',
      },
    },
  },
}

export default en
export type Translations = typeof en
