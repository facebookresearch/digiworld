// Copyright (c) Meta Platforms, Inc. and affiliates.
export default {
  welcomeScreen: {
    title: 'Welcome to Andojo Pay',
    secureText: 'Secure Email Environment',
    connecting: 'Connecting to secure payment services...',
    version: 'Version 2.0.1',
    copyright: '© 2024 Andojo Pay',
  },
  common: {
    back: 'Back',
    continue: 'Continue',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    logout: 'Sign Out',
    creating: 'Creating...',
    createAccount: 'Create Account',
  },
  auth: {
    login: {
      title: 'Welcome Back',
      subtitle: 'Sign in to continue',
      description: 'Experience secure and seamless payments with Andojo Pay',
      phoneLabel: 'Phone number',
      terms:
        'By continuing, you agree to our Terms of Service and Privacy Policy',
    },
    otp: {
      title: 'Verification',
      subtitle: 'Enter the 4-digit code sent to\n{{phoneNumber}}',
      description:
        'This code helps us verify your identity and keep your account secure',
      noCode: "Didn't receive the code?",
      resendButton: 'Resend Code',
      resendTimer: 'Resend in {{seconds}}s',
      verify: 'Verify',
      verifying: 'Verifying...',
      errors: {
        accountInactive: 'Please contact support to activate your account.',
        accountLocked:
          'Your account is temporarily locked. Please try again after {{time}}',
        invalidCode: 'Invalid verification code',
      },
    },
    createProfile: {
      title: 'Create Profile',
      firstName: 'First Name',
      lastName: 'Last Name',
      email: 'Email',
      password: 'Password',
      pin: 'PIN',
      dateOfBirth: 'Date of Birth',
      createButton: 'Create Account',
      creatingButton: 'Creating...',
    },
    errors: {
      createFailed: 'Failed to create profile. Please try again.',
      invalidUserId: 'Invalid user ID received',
      accountInactive: 'Please contact support to activate your account.',
      accountLocked:
        'Your account is temporarily locked. Please try again after {{time}}',
      allFieldsRequired: 'Please fill in all fields',
    },
  },
  splash: {
    connecting: 'Connecting...',
    copyright: '© 2024 Andojo Pay. All rights reserved.',
    version: 'Version 1.0.0',
  },
  errors: {
    invalidPhone: 'Please enter a valid phone number',
    invalidEmail: 'Please enter a valid email',
    invalidPin: 'PIN must be 6 digits',
    required: 'This field is required',
  },
  homeScreen: {
    welcome: {
      greeting: 'Welcome back,',
      userName: 'John Doe',
      andojoPay: 'Andojo Pay',
    },
    wallet: {
      balance: 'Wallet Balance',
      deposit: 'Deposit',
      withdraw: 'Withdraw',
    },
    transactions: {
      title: 'Transaction Summary',
      periods: {
        today: 'Today',
        lastMonth: 'Last Month',
        threeMonths: 'Last 3 Months',
        sixMonths: 'Last 6 Months',
      },
      stats: {
        deposits: 'Deposits',
        withdrawals: 'Withdrawals',
        received: 'Received',
        sent: 'Sent',
      },
    },
    featured: {
      title: 'Featured',
      viewAll: 'View All',
      savings: {
        title: 'High Yield Savings',
        description: 'Earn up to 4.5% APY on your savings',
      },
      invest: {
        title: 'Start Investing',
        description: 'Invest with as little as $1',
      },
      credit: {
        title: 'Build Credit',
        description: 'Get 2% cashback on all purchases',
      },
    },
    loans: {
      homeLoan: {
        title: 'Home Loan',
        description: 'Get up to $500K at 4.5% APR',
      },
      businessLoan: {
        title: 'Business Loan',
        description: 'Grow your business with up to $100K',
      },
      autoLoan: {
        title: 'Auto Loan',
        description: 'Drive your dream car at 3.99% APR',
      },
      educationLoan: {
        title: 'Education Loan',
        description: 'Fund your future with flexible terms',
      },
    },
  },
} as const

export type Translations = typeof en
