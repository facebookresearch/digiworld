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
    title: 'Welcome to AndojoFly',
    secureText: 'Your Travel Companion',
    connecting: 'Connecting to flight services...',
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
  profile: {
    stats: {
      trips: 'Trips Booked',
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
        text: 'By accessing and using the AndojoFly flight booking service, you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you may not use our service.',
      },
      serviceDescription: {
        title: '2. Service Description',
        text: 'AndojoFly provides a flight booking service that allows users to search, compare, and book flights.',
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
        title: '5. Booking and Cancellation',
        text: [
          '5.1. All bookings are subject to availability and confirmation.',
          '5.2. Cancellation policies vary by airline and fare type.',
          '5.3. You are responsible for ensuring travel document validity.',
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
        text: 'This Privacy Policy explains how AndojoFly ("we," "us," or "our") collects, uses, and protects your personal information when you use our flight booking service.',
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
          '- Booking history',
          '- Search preferences',
          '- Device information',
          '- Location data',
        ],
      },
      howWeUseInfo: {
        title: '3. How We Use Your Information',
        text: [
          'We use your information to:',
          '- Provide and improve our service',
          '- Personalize your flight search experience',
          '- Process payments and bookings',
          '- Send booking confirmations and travel updates',
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
