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
    title: 'Welcome to Andojo Bank',
    secureText: 'Secure banking Environment',
    connecting: 'Connecting to secure banking services...',
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
    lastUpdated: 'Last Updated: November 1, 2025',
    sections: {
      acceptance: {
        title: '1. Acceptance of Terms',
        text: 'By accessing and using the Andojo Auction platform and services, you agree to these Terms & Conditions. If you do not accept these terms, do not use the services.',
      },
      serviceDescription: {
        title: '2. Service Description',
        text: 'Andojo Auction provides an online auction marketplace platform where users can list items for sale, bid on items, and purchase items through auctions. The platform facilitates transactions between buyers and sellers.',
      },
      userAccounts: {
        title: '3. User Accounts and Security',
        text: [
          '3.1. You must provide accurate information when creating an account and keep it current.',
          '3.2. You are responsible for maintaining the confidentiality of your account credentials.',
          '3.3. Notify us immediately if you suspect unauthorized access to your account.',
          '3.4. You must be at least 18 years old to use this service.',
        ],
      },
      subscription: {
        title: '4. Bidding and Auctions',
        text: [
          '4.1. All bids are binding and cannot be retracted once placed.',
          '4.2. You are responsible for ensuring you have sufficient funds or payment methods before bidding.',
          '4.3. Winning bids result in a binding purchase agreement.',
          '4.4. Auction end times are final and binding.',
        ],
      },
      contentUsage: {
        title: '5. Item Listings and Content',
        text: [
          '5.1. You are responsible for the accuracy of item descriptions and images.',
          '5.2. You may not list prohibited items including illegal goods, counterfeit items, or items that infringe on intellectual property rights.',
          '5.3. We reserve the right to remove listings that violate our policies.',
        ],
      },
      userConduct: {
        title: '6. User Conduct',
        text: [
          'You agree not to:',
          '- Use the service for illegal activities',
          '- Place false or fraudulent bids',
          '- Manipulate auction outcomes',
          "- Use another person's account without authorization",
          "- Interfere with other users' ability to bid or list items",
        ],
      },
      availability: {
        title: '7. Service Availability',
        text: 'We strive to maintain service availability but do not guarantee uninterrupted access. We are not liable for service interruptions or technical issues.',
      },
      termination: {
        title: '8. Termination',
        text: 'We may suspend or terminate access to the service for violations of these terms or for security reasons. You may close your account following the procedures in the app.',
      },
      changes: {
        title: '9. Changes to Terms',
        text: 'We may modify these Terms with notice. Continued use after notice constitutes acceptance of the updated Terms.',
      },
      contact: {
        title: '10. Contact Us',
        text: 'If you have questions about these Terms, contact legal@andojoauction.com',
      },
    },
  },
  privacyPolicy: {
    headerTitle: 'Privacy Policy',
    lastUpdated: 'Last Updated: November 1, 2025',
    sections: {
      introduction: {
        title: '1. Introduction',
        text: 'This Privacy Policy explains how Andojo Auction ("we," "us," or "our") collects, uses, and protects your personal information when you use our auction marketplace platform and mobile application.',
      },
      informationWeCollect: {
        title: '2. Information We Collect',
        text: [
          '2.1. Account and Identity Information:',
          '- Full name, username, and contact information (email, phone)',
          '- Profile information and preferences',
          '- Payment method information (stored securely)',
          '',
          '2.2. Auction and Transaction Information:',
          '- Bidding history and auction participation',
          '- Item listings and descriptions',
          '- Transaction history and purchase records',
          '- Payment and shipping information',
          '',
          '2.3. Device and Usage Information:',
          '- Device identifiers, IP address, and app usage logs',
          '- Browsing and search history within the platform',
          '- Location data where permitted (for shipping purposes)',
        ],
      },
      howWeUseInfo: {
        title: '3. How We Use Your Information',
        text: [
          'We use your information to:',
          '- Provide and operate the auction platform and services',
          '- Process bids, transactions, and payments',
          '- Facilitate communication between buyers and sellers',
          '- Verify identity and prevent fraud',
          '- Send notifications about auctions, bids, and transactions',
          '- Improve our services and user experience',
          '- Comply with legal and regulatory obligations',
        ],
      },
      informationSharing: {
        title: '4. Information Sharing',
        text: [
          'We may share your information with:',
          '- Other users (limited information for transaction purposes)',
          '- Payment processors and shipping providers',
          '- Service providers who assist in platform operations',
          '- Regulatory and law enforcement authorities as required by law',
          '- In connection with a business transfer or merger',
        ],
      },
      dataSecurity: {
        title: '5. Data Security',
        text: 'We implement industry-standard measures to protect your personal information. However, no system is completely secure; promptly report suspected breaches to us.',
      },
      yourRights: {
        title: '6. Your Rights',
        text: [
          'You have the right to:',
          '- Access and correct your personal data',
          '- Request deletion where permitted by law',
          '- Object to certain processing',
          '- Export your data',
          '- Lodge a complaint with your data protection authority',
        ],
      },
      cookies: {
        title: '7. Cookies and Tracking',
        text: 'We use cookies and similar technologies for security, analytics, and to improve your experience. You can manage cookie preferences through your device settings.',
      },
      children: {
        title: "8. Children's Privacy",
        text: 'Our services are not intended for children under 18. We do not knowingly collect personal information from children under 18.',
      },
      international: {
        title: '9. International Data Transfers',
        text: 'Your information may be processed in jurisdictions outside your country. We take steps to ensure appropriate safeguards for such transfers.',
      },
      changes: {
        title: '10. Changes to Privacy Policy',
        text: 'We may update this Privacy Policy. We will notify you of material changes as required by law.',
      },
      contact: {
        title: '11. Contact Us',
        text: 'For privacy inquiries, contact privacy@andojoauction.com',
      },
    },
  },
  creditCardTerms: {
    headerTitle: 'Credit Card Terms',
    lastUpdated: 'Last Updated: {{date}}',
    acceptTerms: 'I agree to the Terms and Conditions',
    applyNow: 'Apply Now',
    applying: 'Applying...',
    cancel: 'Cancel',
    pleaseAcceptTerms: 'Please accept the terms and conditions to continue',
    applicationSuccess: 'Credit card application submitted successfully!',
    applicationError: 'Failed to apply for credit card',
    loginRequired: 'Please log in to apply for a credit card',
    sections: {
      introduction: {
        title: '1. INTRODUCTION',
        text: 'These Terms and Conditions ("Terms") govern your use of the Andojo Credit Card ("Card") issued by Andojo Bank. By applying for and using this Card, you agree to be bound by these Terms.',
      },
      creditLimit: {
        title: '2. CREDIT LIMIT',
        text: [
          '• Your initial credit limit will be determined based on your creditworthiness',
          '• We may increase or decrease your credit limit at our discretion',
          '• You may not exceed your credit limit without our prior approval',
          '• Over-limit fees may apply if you exceed your credit limit',
        ],
      },
      interestRatesAndFees: {
        title: '3. INTEREST RATES AND FEES',
        text: [
          '• Annual Percentage Rate (APR): 18.99% (variable)',
          '• Annual Fee: $0 for the first year, $95 thereafter',
          '• Late Payment Fee: Up to $40',
          '• Over-Limit Fee: Up to $35',
          '• Cash Advance Fee: 5% of the advance amount (minimum $10)',
          '• Foreign Transaction Fee: 3% of the transaction amount',
        ],
      },
      paymentTerms: {
        title: '4. PAYMENT TERMS',
        text: [
          '• Minimum payment is due by the payment due date each month',
          '• Minimum payment is 2% of your outstanding balance or $25, whichever is greater',
          '• Payments received after 5:00 PM ET are credited the next business day',
          '• Late payments may result in penalty APR of up to 29.99%',
        ],
      },
      billingAndStatements: {
        title: '5. BILLING AND STATEMENTS',
        text: [
          '• Monthly statements will be provided electronically or by mail',
          '• You must notify us of any billing errors within 60 days',
          '• Interest charges begin accruing immediately on cash advances',
          '• Grace period of 25 days applies to purchases (if you pay in full)',
        ],
      },
      cardUsage: {
        title: '6. CARD USAGE',
        text: [
          '• Card remains our property and must be returned upon request',
          '• You are responsible for all authorized transactions',
          '• Report lost or stolen cards immediately',
          '• Card may be used worldwide where accepted',
        ],
      },
      rewardsProgram: {
        title: '7. REWARDS PROGRAM',
        text: [
          '• Earn 1% cash back on all purchases',
          '• Earn 2% cash back on gas and grocery purchases',
          '• Rewards are credited to your account monthly',
          '• Rewards have no expiration date',
        ],
      },
      securityAndFraud: {
        title: '8. SECURITY AND FRAUD PROTECTION',
        text: [
          '• Zero liability for unauthorized transactions when reported promptly',
          '• 24/7 fraud monitoring and alerts',
          '• Chip and PIN technology for enhanced security',
          '• Mobile app notifications for all transactions',
        ],
      },
      creditReporting: {
        title: '9. CREDIT REPORTING',
        text: [
          '• We may report your account information to credit bureaus',
          '• Payment history affects your credit score',
          '• Account closure may be reported to credit bureaus',
        ],
      },
      changesToTerms: {
        title: '10. CHANGES TO TERMS',
        text: [
          '• We may modify these terms with 45 days advance notice',
          '• Continued use of the card constitutes acceptance of changes',
          '• You may close your account if you disagree with changes',
        ],
      },
      accountClosure: {
        title: '11. ACCOUNT CLOSURE',
        text: [
          '• You may close your account at any time',
          '• We may close your account for any reason with notice',
          '• Outstanding balances remain due after account closure',
          '• Automatic payments may continue until balance is paid',
        ],
      },
      disputeResolution: {
        title: '12. DISPUTE RESOLUTION',
        text: [
          '• Disputes will be resolved through binding arbitration',
          '• Class action lawsuits are waived',
          '• Small claims court disputes are permitted',
        ],
      },
      contactInformation: {
        title: '13. CONTACT INFORMATION',
        text: [
          '• Customer Service: 1-800-ANDOJO-1',
          '• Online: www.andojobank.com',
          '• Mobile App: Available on iOS and Android',
          '• Email: support@andojobank.com',
        ],
      },
      legalCompliance: {
        title: '14. LEGAL COMPLIANCE',
        text: [
          '• Subject to federal and state banking regulations',
          '• Equal Credit Opportunity Act compliance',
          '• Truth in Lending Act compliance',
          '• Fair Credit Reporting Act compliance',
        ],
      },
      agreement: {
        text: 'By checking the box below and clicking "Apply Now", you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.',
      },
    },
  },
  creditCardDiscovery: {
    steps: {
      reviewingProfile: 'Reviewing your profile...',
      checkingCreditScore: 'Checking credit score...',
      waitingApproval: 'Waiting for instant approval...',
    },
    success: {
      congratulations: 'Congratulations!',
      approved: 'Your credit card has been approved successfully!',
      benefits:
        'Enjoy the benefits of your new Andojo Credit Card with 1% cash back on all purchases and 2% on gas and groceries.',
      readyToUse: 'Ready to Use',
    },
    card: {
      creditCard: 'CREDIT CARD',
      cardName: 'Andojo Credit Card',
      limit: '$5,000 Limit',
      apr: '18.99% APR',
    },
  },
  creditCardSelection: {
    title: 'Choose Your Card',
    cardsUsed: '{{used}} of {{max}} cards used',
    limitReached: 'Card Limit Reached',
    limitReachedMessage:
      'You have reached the maximum number of credit cards ({{max}}) for your account tier.',
    upgradeMessage: 'Upgrade your account tier to apply for more credit cards.',
    noCardsAvailable: 'No Cards Available',
    noCardsMessage:
      'You have already applied for all available credit cards for your account tier.',
    proceedWithCard: 'Proceed with this Card',
    creditLimit: 'Credit Limit',
    apr: 'APR',
    annualFee: 'Annual Fee',
    free: 'Free',
    rewards: 'Rewards',
    keyBenefits: 'Key Benefits',
  },
}

export default en
export type Translations = typeof en
