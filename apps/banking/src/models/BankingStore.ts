import { queries } from '@/db/queries'
import {
  types,
  flow,
  Instance,
  SnapshotOut,
  SnapshotIn,
  getRoot,
} from 'mobx-state-tree'

const AccountType = types.model('AccountType', {
  id: types.identifierNumber,
  code: types.string,
  name: types.string,
  description: types.maybeNull(types.string),
  minOpeningBalance: types.optional(types.number, 0),
  maxAccountsPerUser: types.optional(types.number, 2),
  canWithdraw: types.optional(types.boolean, true),
})

const TransactionType = types.model('TransactionType', {
  id: types.identifierNumber,
  code: types.string,
  name: types.string,
  category: types.maybeNull(types.string),
  description: types.maybeNull(types.string),
})

const TIER_ACCOUNT_CONFIG_FALLBACKS: Record<string, any> = {
  everyday: {
    allowedTypes: ['savings', 'ira_account'],
    maxAccountsPerType: { savings: 1, ira_account: 1 },
    initialDeposits: { savings: 1000, ira_account: 100 },
  },
  premier: {
    allowedTypes: ['checking', 'savings', 'ira_account'],
    maxAccountsPerType: { checking: 2, savings: 2, ira_account: 1 },
    initialDeposits: {
      checking: 5000,
      savings: 10000,
      ira_account: 1000,
    },
  },
  sapphire: {
    allowedTypes: ['checking', 'savings', 'money_market', 'ira_account'],
    maxAccountsPerType: {
      checking: 3,
      savings: 3,
      money_market: 3,
      ira_account: 1,
    },
    initialDeposits: {
      checking: 10000,
      savings: 15000,
      money_market: 20000,
      ira_account: 5000,
    },
  },
}

const resolveInitialDeposit = (
  type: { code: string; minOpeningBalance?: number | null },
  tierConfig: { config?: { initialDeposits?: Record<string, number> } } | null,
) => {
  const minOpeningBalance = Number(type.minOpeningBalance ?? 0)
  if (minOpeningBalance > 0) {
    return minOpeningBalance
  }

  return tierConfig?.config?.initialDeposits?.[type.code] || 0
}

const Account = types.model('Account', {
  id: types.identifierNumber,
  userId: types.number,
  accountTypeId: types.number,
  accountNumber: types.string,
  accountName: types.maybeNull(types.string),
  balance: types.optional(types.number, 0),
  availableBalance: types.optional(types.number, 0),
  isPrimary: types.optional(types.boolean, false),
  status: types.optional(
    types.enumeration(['active', 'frozen', 'closed']),
    'active',
  ),
  createdAt: types.string,
  updatedAt: types.string,
  overdraftEnabled: types.optional(types.boolean, false),
  linkedAccountId: types.maybeNull(types.number),
})

const PaymentMethod = types.model('PaymentMethod', {
  id: types.identifierNumber,
  userId: types.number,
  cardType: types.enumeration(['credit', 'debit']),
  lastFourDigits: types.string,
  cardholderName: types.string,
  expiryDate: types.string,
  isDefault: types.optional(types.boolean, false),
  status: types.optional(
    types.enumeration(['active', 'expired', 'cancelled']),
    'active',
  ),
  createdAt: types.string,
})

const CreditCard = types.model('CreditCard', {
  id: types.identifierNumber,
  userId: types.number,
  linkedCheckingAccountId: types.maybeNull(types.number),
  cardNumber: types.string,
  lastFourDigits: types.string,
  cardholderName: types.string,
  expiryMonth: types.number,
  expiryYear: types.number,
  cvv: types.string,
  creditLimit: types.number,
  currentBalance: types.optional(types.number, 0),
  availableCredit: types.number,
  apr: types.number,
  annualFee: types.optional(types.number, 0),
  cashAdvanceFeePercent: types.optional(types.number, 5.0),
  latePaymentFee: types.optional(types.number, 35.0),
  paymentDueDay: types.number,
  minimumPaymentPercent: types.optional(types.number, 2.0),
  statementClosingDay: types.number,
  autopayEnabled: types.optional(types.boolean, false),
  autopayAmount: types.optional(
    types.enumeration(['minimum', 'statement_balance', 'current_balance']),
    'minimum',
  ),
  status: types.optional(
    types.enumeration(['active', 'frozen', 'closed']),
    'active',
  ),
  openedDate: types.string,
  lastPaymentDate: types.maybeNull(types.string),
  lastStatementDate: types.maybeNull(types.string),
  createdAt: types.string,
})

const Beneficiary = types.model('Beneficiary', {
  id: types.identifierNumber,
  userId: types.number,
  name: types.string,
  accountNumber: types.string,
  accountType: types.string,
  bankName: types.maybeNull(types.string),
  nickname: types.maybeNull(types.string),
  status: types.optional(types.enumeration(['active', 'inactive']), 'active'),
  createdAt: types.string,
})

const Biller = types.model('Biller', {
  id: types.identifierNumber,
  code: types.string,
  name: types.string,
  description: types.maybeNull(types.string),
  category: types.maybeNull(types.string),
  subcategory: types.maybeNull(types.string),
  averageBillAmount: types.maybeNull(types.number),
  minPaymentAmount: types.maybeNull(types.number),
  maxPaymentAmount: types.maybeNull(types.number),
  paymentProcessingDays: types.optional(types.number, 1),
  requiresAccountNumber: types.optional(types.boolean, true),
  requiresRoutingNumber: types.optional(types.boolean, false),
  acceptsCreditCard: types.optional(types.boolean, true),
  acceptsDebitCard: types.optional(types.boolean, true),
  acceptsBankAccount: types.optional(types.boolean, true),
  isActive: types.optional(types.boolean, true),
})

const Bill = types.model('Bill', {
  id: types.identifierNumber,
  userId: types.number,
  billerId: types.number,
  accountId: types.maybeNull(types.number),
  amount: types.number,
  dueDay: types.maybeNull(types.number),
  isRecurring: types.optional(types.boolean, false),
  recurrenceInterval: types.optional(types.number, 30),
  nextDueDate: types.maybeNull(types.string),
  status: types.optional(
    types.enumeration(['pending', 'paid', 'overdue', 'cancelled']),
    'pending',
  ),
  createdAt: types.string,
})

const Transaction = types
  .model('Transaction', {
    id: types.identifierNumber,
    sessionId: types.maybeNull(types.number),
    transactionType: types.optional(
      types.enumeration([
        'transfer',
        'bill_payment',
        'zelle',
        'deposit',
        'withdraw',
        'withdrawal',
        'monthly_fee',
        'interest_charge',
        'credit_card_payment',
        'purchase',
        'external_transfer',
      ]),
      'deposit',
    ),
    transactionTypeId: types.maybeNull(types.number),
    userId: types.number,
    fromAccountId: types.maybeNull(types.number),
    toAccountId: types.maybeNull(types.number),
    billerId: types.maybeNull(types.number),
    userBillerId: types.maybeNull(types.number),
    billId: types.maybeNull(types.number),
    beneficiaryId: types.maybeNull(types.number),
    zelleContactId: types.maybeNull(types.number),
    creditCardId: types.maybeNull(types.number),
    amount: types.number,
    fee: types.optional(types.number, 0),
    balanceBefore: types.maybeNull(types.number),
    balanceAfter: types.maybeNull(types.number),
    referenceId: types.maybeNull(types.string),
    confirmationNumber: types.maybeNull(types.string),
    description: types.maybeNull(types.string),
    memo: types.maybeNull(types.string),
    day: types.maybeNull(types.number),
    transactionDate: types.maybeNull(types.string),
    postedDate: types.maybeNull(types.string),
    pendingUntil: types.maybeNull(types.string),
    status: types.optional(
      types.enumeration(['success', 'failed', 'pending']),
      'success',
    ),
    failureReason: types.maybeNull(types.string),
    errorCode: types.maybeNull(types.string),
    errorMessage: types.maybeNull(types.string),
    metadata: types.maybeNull(types.string),
    createdAt: types.string,
    image: types.maybeNull(types.string),
  })
  .views(self => ({
    get category() {
      switch (self.transactionType) {
        case 'transfer':
        case 'zelle':
        case 'external_transfer':
          return 'transfer'
        case 'bill_payment':
        case 'credit_card_payment':
        case 'purchase':
          return 'debit'
        case 'deposit':
          return 'credit'
        default:
          return 'other'
      }
    },
    get type() {
      return self.transactionType
    },
    get isOutgoing() {
      // For banking transactions, we need to look at the transaction type more carefully
      // and consider the context of fromAccountId vs toAccountId

      // First, get the transaction type info
      const store = getRoot(self) as any
      const transactionType = store.bankingStore?.getTransactionType(
        self.transactionTypeId,
      )
      const typeCode = transactionType?.code || self.transactionType

      switch (typeCode) {
        case 'deposit':
          // Deposits are always incoming (money coming into account)
          return false
        case 'withdrawal':
        case 'withdraw':
          // Withdrawals are always outgoing (money leaving account)
          return true
        case 'transfer':
          // For transfers, if we have both fromAccountId and toAccountId,
          // we need context to determine direction
          // For now, assume it's outgoing if fromAccountId exists
          return !!self.fromAccountId
        case 'bill_payment':
        case 'credit_card_payment':
        case 'purchase':
        case 'monthly_fee':
        case 'interest_charge':
          // These are always outgoing (money leaving account)
          return true
        case 'zelle':
        case 'external_transfer':
          // For Zelle and external transfers, check if we have fromAccountId
          // If fromAccountId exists, it's outgoing from that account
          return !!self.fromAccountId
        default:
          // Fallback: use the amount sign or presence of fromAccountId
          if (self.fromAccountId && !self.toAccountId) return true
          if (!self.fromAccountId && self.toAccountId) return false
          return self.amount < 0
      }
    },
    get signedAmount() {
      const sign = this.isOutgoing ? '-' : '+'
      return `${sign}$${Math.abs(self.amount).toFixed(2)}`
    },
    get directionIcon() {
      return this.isOutgoing ? 'arrow-forward' : 'arrow-back'
    },
  }))

const Session = types.model('Session', {
  id: types.identifierNumber,
  sessionId: types.string,
  userId: types.number,
  seed: types.maybeNull(types.number),
  currentDay: types.optional(types.number, 0),
  status: types.optional(
    types.enumeration(['active', 'paused', 'completed']),
    'active',
  ),
  endedAt: types.maybeNull(types.string),
})

const User = types.model('User', {
  id: types.identifierNumber,
  username: types.string,
  password: types.string,
  email: types.maybeNull(types.string),
  accountTierId: types.number,
  isZelleUser: types.optional(types.boolean, false),
  createdAt: types.string,
})

const ZelleContact = types.model('ZelleContact', {
  id: types.identifierNumber,
  userId: types.number,
  contactName: types.string,
  contactEmail: types.maybeNull(types.string),
  contactPhone: types.maybeNull(types.string),
  isEnrolled: types.optional(types.boolean, false),
  isFavorite: types.optional(types.boolean, false),
  lastSentAmount: types.maybeNull(types.number),
  lastSentDate: types.maybeNull(types.string),
  createdAt: types.string,
})

const ScheduledPayment = types.model('ScheduledPayment', {
  id: types.identifierNumber,
  userId: types.number,
  transactionType: types.maybeNull(types.number),
  fromAccountId: types.maybeNull(types.number),
  toAccountId: types.maybeNull(types.number),
  billerId: types.maybeNull(types.number),
  beneficiaryId: types.maybeNull(types.number),
  isRecurring: types.maybeNull(types.number),
  recurrenceFrequency: types.maybeNull(types.number),
  recurrenceEndDate: types.maybeNull(types.string),
  description: types.maybe(types.string),
  memo: types.maybeNull(types.string),
  status: types.optional(
    types.enumeration(['scheduled', 'processing', 'completed', 'failed']),
    'scheduled',
  ),
  processedTransactionId: types.maybeNull(types.number),
  createdAt: types.string,
  updatedAt: types.string,
  amount: types.number,
  scheduledDate: types.string,
  notes: types.maybe(types.string),
})

export const BankingStore = types
  .model('BankingStore', {
    currentSession: types.maybeNull(Session),
    users: types.array(User),
    accounts: types.array(Account),
    accountTypes: types.array(AccountType),
    transactionTypes: types.array(TransactionType),
    paymentMethods: types.array(PaymentMethod),
    creditCards: types.array(CreditCard),
    beneficiaries: types.array(Beneficiary),
    billers: types.array(Biller),
    bills: types.array(Bill),
    zelleContacts: types.optional(types.array(ZelleContact), []),
    transactions: types.array(Transaction),
    scheduledPayments: types.optional(types.array(ScheduledPayment), []),
    isLoading: types.optional(types.boolean, false),
    error: types.maybeNull(types.string),
    selectedAccount: types.maybeNull(types.reference(Account)),
    transactionFilter: types.maybeNull(types.string),
    // Credit Card Terms State
    creditCardTermsAccepted: types.optional(types.boolean, false),
    // Credit Card Discovery State
    discoveryCurrentStep: types.optional(types.number, 0),
    discoveryIsComplete: types.optional(types.boolean, false),
    discoveryCardConfig: types.maybeNull(types.frozen()),
    // Card Visibility State
    visibleCardDetails: types.map(types.boolean),
    // Account Visibility State
    visibleAccountDetails: types.map(types.boolean),
    // Account Number Visibility State (deprecated - use visibleAccountDetails instead)
    showAccountNumber: types.optional(types.boolean, false),
    // Alert State
    alertState: types.optional(
      types.model({
        visible: types.optional(types.boolean, false),
        title: types.optional(types.string, ''),
        message: types.optional(types.string, ''),
        preset: types.optional(
          types.enumeration([
            'default',
            'success',
            'error',
            'warning',
            'delete',
          ]),
          'default',
        ),
        showConfirm: types.optional(types.boolean, false),
        confirmText: types.optional(types.string, 'Confirm'),
        cancelText: types.optional(types.string, 'OK'),
      }),
      {},
    ),
    // Selected Card State
    selectedCreditCard: types.maybeNull(types.safeReference(CreditCard)),
    selectedCardTransactions: types.array(types.frozen()),
    // Account Creation UI State
    showAccountBottomSheet: types.optional(types.boolean, false),
    accountCreationAccountName: types.optional(types.string, ''),
    accountCreationSelectedAccountType: types.maybeNull(types.number),
    accountCreationIsPrimary: types.optional(types.boolean, false),
    accountCreationIsCreating: types.optional(types.boolean, false),
    accountCreationCurrentFocused: types.maybeNull(types.string),
    // Contact Form UI State
    contactFormName: types.optional(types.string, ''),
    contactFormEmail: types.optional(types.string, ''),
    contactFormPhone: types.optional(types.string, ''),
    contactFormIsSubmitting: types.optional(types.boolean, false),
    contactFormHasPendingNavigation: types.optional(types.boolean, false),
    contactFormCurrentFocused: types.maybeNull(types.string),
    // Send Money Form UI State
    sendMoneyAmount: types.optional(types.string, ''),
    sendMoneySelectedAccountId: types.maybeNull(types.number),
    sendMoneyShowAccountPicker: types.optional(types.boolean, false),
    sendMoneyMemo: types.optional(types.string, ''),
    sendMoneyShowPinModal: types.optional(types.boolean, false),
    sendMoneyPin: types.optional(types.string, ''),
    sendMoneyIsProcessing: types.optional(types.boolean, false),
    sendMoneyCurrentFocused: types.maybeNull(types.string),
    // Zelle UI State
    zelleSearchQuery: types.optional(types.string, ''),
    isLoadingZelleContacts: types.optional(types.boolean, false),
    zelleSearchCurrentFocused: types.optional(types.boolean, false),
    // System config flags (default to false -> PIN validation not required)
    isPINValidationRequired: types.optional(types.boolean, false),
  })
  .views(self => ({
    get activeAccounts() {
      return self.accounts.filter(a => a.status === 'active')
    },
    get totalBalance() {
      return this.activeAccounts.reduce((sum, a) => sum + a.balance, 0)
    },
    getAccountByNumber(accountNumber: string) {
      return self.accounts.find(a => a.accountNumber === accountNumber)
    },
    getAccountsByType(typeCode: string) {
      const type = self.accountTypes.find(t => t.code === typeCode)
      if (!type) return []
      return self.accounts.filter(a => a.accountTypeId === type.id)
    },
    getAccountType(accountTypeId: number) {
      return self.accountTypes.find(t => t.id === accountTypeId)
    },
    get transactionsByType() {
      const typeGroups: { [key: string]: number } = {}
      self.transactions.forEach(transaction => {
        // Handle both old and new transaction structures
        if (transaction.transactionTypeId) {
          const transactionType = self.transactionTypes.find(
            t => t.id === transaction.transactionTypeId,
          )
          if (transactionType) {
            typeGroups[transactionType.code] =
              (typeGroups[transactionType.code] || 0) + 1
          }
        } else if (transaction.transactionType) {
          typeGroups[transaction.transactionType] =
            (typeGroups[transaction.transactionType] || 0) + 1
        }
      })
      return typeGroups
    },
    getTransactionsByFilter(filter: string) {
      const transactions =
        filter === 'all'
          ? [...self.transactions]
          : self.transactions.filter(transaction => {
              const { transactionTypeId, transactionType } = transaction

              // Handle both old and new transaction structures
              if (transactionTypeId) {
                const type = self.transactionTypes.find(
                  t => t.id === transactionTypeId,
                )
                return type?.code === filter
              }

              if (transactionType) {
                return transactionType === filter
              }

              return false
            })

      // Sort by createdAt in descending order (newest first)
      return transactions.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
    },
    getTransactionType(transactionTypeId: number) {
      return self.transactionTypes.find(t => t.id === transactionTypeId)
    },
    getTransactionTypeByCode(code: string) {
      return self.transactionTypes.find(t => t.code === code)
    },
    get activePaymentMethods() {
      return self.paymentMethods.filter(pm => pm.status === 'active')
    },
    get defaultPaymentMethod() {
      return self.paymentMethods.find(
        pm => pm.isDefault && pm.status === 'active',
      )
    },
    get activeBeneficiaries() {
      return self.beneficiaries.filter(b => b.status === 'active')
    },
    get pendingBills() {
      return self.bills.filter(b => b.status === 'pending')
    },
    get overdueBills() {
      return self.bills.filter(b => b.status === 'overdue')
    },
    get recentTransactions() {
      return self.transactions
        .slice()
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 20)
    },
    // Card visibility computed view
    isCardDetailsVisible(cardId: number) {
      return self.visibleCardDetails.get(cardId.toString()) || false
    },

    // Account visibility computed view
    isAccountDetailsVisible(accountId: number) {
      return self.visibleAccountDetails.get(accountId.toString()) || false
    },

    // Account creation form computed view
    get accountCreationForm() {
      return {
        accountName: self.accountCreationAccountName,
        selectedAccountType: self.accountCreationSelectedAccountType,
        isPrimary: self.accountCreationIsPrimary,
        isCreating: self.accountCreationIsCreating,
        currentFocused: self.accountCreationCurrentFocused,
      }
    },

    // Contact form computed view
    get contactForm() {
      return {
        name: self.contactFormName,
        email: self.contactFormEmail,
        phone: self.contactFormPhone,
        isSubmitting: self.contactFormIsSubmitting,
        hasPendingNavigation: self.contactFormHasPendingNavigation,
        currentFocused: self.contactFormCurrentFocused,
      }
    },

    // Send money form computed view
    get sendMoneyForm() {
      return {
        amount: self.sendMoneyAmount,
        selectedAccountId: self.sendMoneySelectedAccountId,
        showAccountPicker: self.sendMoneyShowAccountPicker,
        memo: self.sendMoneyMemo,
        showPinModal: self.sendMoneyShowPinModal,
        pin: self.sendMoneyPin,
        isProcessing: self.sendMoneyIsProcessing,
        currentFocused: self.sendMoneyCurrentFocused,
      }
    },

    // Zelle contacts computed views
    get filteredZelleContacts() {
      if (!self.zelleSearchQuery.trim()) {
        return self.zelleContacts.slice()
      }
      const query = self.zelleSearchQuery.toLowerCase()
      return self.zelleContacts.filter(
        contact =>
          contact.contactName.toLowerCase().includes(query) ||
          contact.contactEmail?.toLowerCase().includes(query) ||
          contact.contactPhone?.includes(query),
      )
    },

    get favoriteZelleContacts() {
      return self.zelleContacts.filter(contact => contact.isFavorite)
    },

    // Safe getter for selected credit card
    get safeSelectedCreditCard() {
      try {
        // With safeReference, this will be undefined if reference can't be resolved
        if (!self.selectedCreditCard) return null

        // Additional verification that the card still exists and is active
        const cardExists = self.creditCards.find(
          c => c.id === self.selectedCreditCard?.id && c.status === 'active',
        )
        if (!cardExists) {
          // Card doesn't exist or is not active, clear the reference
          const actions = self as any
          actions.setSelectedCreditCard(null)
          return null
        }

        return self.selectedCreditCard
      } catch (error) {
        // If there's any error accessing selectedCreditCard, return null and clear it
        console.warn(
          'Error in safeSelectedCreditCard, clearing reference:',
          error,
        )
        const actions = self as any
        actions.setSelectedCreditCard(null)
        return null
      }
    },
  }))
  .actions(self => {
    const getDB = () => {
      // Import queries directly instead of accessing a non-existent databaseService
      return require('@/db/queries')
    }

    const logAction = flow(function* (
      action: string,
      status: string,
      details: any,
    ) {
      try {
        // For now, just log to console since logAction doesn't exist in queries
        console.log('Banking action:', { action, status, details })
      } catch (e) {
        console.error(e)
      }
    })

    // Helper to coerce various DB truthy/falsey representations into booleans
    const toBool = (v: any) => {
      if (typeof v === 'boolean') return v
      if (typeof v === 'number') return v === 1
      if (typeof v === 'string') {
        const lower = v.toLowerCase()
        return v === '1' || lower === 'true'
      }
      return Boolean(v)
    }

    const convertBiller = (biller: any, isUserBiller = false) => {
      if (!biller) return biller

      // Normalize fields for user_billers
      if (isUserBiller) {
        return {
          id: biller.id,
          code: `user-${biller.id}`, // Unique code for user billers
          name: biller.billerName
            ? biller.billerName.replace(/\s+/g, '_').toLowerCase()
            : 'unknown_biller', // Snake-case the biller name or default to 'unknown_biller'
          description: biller.notes || null,
          category: biller.category || null,
          subcategory: null, // Not available for user billers
          averageBillAmount: null, // Not available for user billers
          minPaymentAmount: null, // Not available for user billers
          maxPaymentAmount: null, // Not available for user billers
          paymentProcessingDays: 1, // Default value
          requiresAccountNumber: true, // Default for user billers
          requiresRoutingNumber: toBool(biller.biller_routing_number),
          acceptsCreditCard: false, // Default for user billers
          acceptsDebitCard: false, // Default for user billers
          acceptsBankAccount: true, // Default for user billers
          isActive: biller.status === 'active',
        }
      }

      // Normalize fields for predefined billers
      return {
        ...biller,
        requiresAccountNumber: toBool(biller.requiresAccountNumber),
        requiresRoutingNumber: toBool(biller.requiresRoutingNumber),
        acceptsCreditCard: toBool(biller.acceptsCreditCard),
        acceptsDebitCard: toBool(biller.acceptsDebitCard),
        acceptsBankAccount: toBool(biller.acceptsBankAccount),
        isActive: toBool(biller.isActive),
      }
    }

    const convertBill = (bill: any) => {
      if (!bill) return bill
      return {
        ...bill,
        isRecurring: toBool(bill.isRecurring),
        // Some DB rows may include autoPay flags; normalize if present
        autoPayEnabled:
          bill.autoPayEnabled !== undefined
            ? toBool(bill.autoPayEnabled)
            : bill.autoPayEnabled,
      }
    }

    const toNullableNumber = (v: any) => {
      if (v === null || v === undefined || v === '') return null
      if (typeof v === 'number') return Number.isNaN(v) ? null : v
      if (typeof v === 'string') {
        const trimmed = v.trim()
        if (!trimmed) return null
        const parsed = Number(trimmed)
        return Number.isNaN(parsed) ? null : parsed
      }
      return null
    }

    const convertScheduledPayment = (scheduledPayment: any) => {
      if (!scheduledPayment) return scheduledPayment
      return {
        ...scheduledPayment,
        transactionType:
          scheduledPayment.transactionType !== undefined
            ? toNullableNumber(scheduledPayment.transactionType)
            : toNullableNumber(scheduledPayment.transactionTypeId),
        fromAccountId: toNullableNumber(scheduledPayment.fromAccountId),
        toAccountId: toNullableNumber(scheduledPayment.toAccountId),
        billerId: toNullableNumber(scheduledPayment.billerId),
        beneficiaryId: toNullableNumber(scheduledPayment.beneficiaryId),
        isRecurring: toNullableNumber(scheduledPayment.isRecurring),
        recurrenceFrequency: toNullableNumber(
          scheduledPayment.recurrenceFrequency,
        ),
        processedTransactionId: toNullableNumber(
          scheduledPayment.processedTransactionId,
        ),
      }
    }

    const loadAccounts = flow(function* () {
      try {
        const db = getDB()

        const accounts = yield db.getAccountsByUserId(
          self.currentSession?.userId,
        )

        // Convert database data to match MobX model types
        const convertedAccounts = accounts.map((account: any) => ({
          ...account,
          isPrimary: Boolean(account.isPrimary),
          overdraftEnabled: Boolean(account.overdraftEnabled),
        }))

        self.accounts.replace(convertedAccounts)
      } catch (e: any) {
        self.error = e.message
        throw e
      }
    })

    const loadAccountTypes = flow(function* () {
      try {
        const db = getDB()
        const types = yield db.getAccountTypes()
        self.accountTypes.replace(types)
      } catch (e: any) {
        self.error = e.message
        throw e
      }
    })

    const loadTransactionTypes = flow(function* () {
      try {
        const db = getDB()
        const types = yield db.getTransactionTypes()
        self.transactionTypes.replace(types)
      } catch (e: any) {
        self.error = e.message
        throw e
      }
    })

    // Helper method to load all initial data (extracted from initializeSession)
    const loadInitialData = flow(function* () {
      if (!self.currentSession?.userId) {
        console.warn('No current session userId, skipping data load')
        return
      }

      const userId = self.currentSession.userId
      const db = getDB()

      // Load accounts
      const accounts = yield db.getAccountsByUserId(userId)
      const convertedAccounts = accounts.map((account: any) => ({
        ...account,
        isPrimary: Boolean(account.isPrimary),
        overdraftEnabled: Boolean(account.overdraftEnabled),
      }))
      self.accounts.replace(convertedAccounts)

      // Load account types
      const types = yield db.getAccountTypes()
      self.accountTypes.replace(types)

      // Load transaction types
      const transactionTypes = yield db.getTransactionTypes()
      self.transactionTypes.replace(transactionTypes)

      // Load credit cards
      const creditCards = yield queries.getCreditCards(userId)
      const convertedCreditCards = creditCards.map((card: any) => ({
        ...card,
        autopayEnabled: Boolean(card.autopayEnabled),
      }))
      self.creditCards.replace(convertedCreditCards)

      // Clean up any invalid references first, then validate and initialize
      const actions = self as any
      actions.cleanupInvalidReferences()
      actions.validateReferences()
      actions.initializeSelectedCard()

      // Load current user data
      const currentUser = yield queries.getUserById(userId)
      if (currentUser) {
        self.users.replace([currentUser])
      }

      // Load recent transactions
      const recentTransactions =
        yield queries.getRecentTransactionsForUser(userId)
      self.transactions.replace(recentTransactions)
      // Load Zelle contacts
      yield actions.loadZelleContacts()

      yield actions.loadBillers()
      // await bankingStore.loadUserBillers()
      yield actions.loadBills()
      yield actions.loadScheduledPayments()

      // Load system config and set flag(s)
      try {
        const cfgs = yield queries.getSystemConfig()
        const pinCfg = (cfgs || []).find(
          (c: any) => c.key === 'isPINValidationRequired',
        )
        if (pinCfg) {
          const val = pinCfg.value
          const isTrue = toBool(val)
          self.isPINValidationRequired = Boolean(isTrue)
        } else {
          self.isPINValidationRequired = false
        }
      } catch (e) {
        self.isPINValidationRequired = false
        console.warn(
          'Unable to load system config, defaulting isPINValidationRequired to false',
          e,
        )
      }

      // Refresh notifications
      const rootStore = getRoot(self) as any
      rootStore.notificationStore.getNotifications()
    })

    return {
      loadInitialData,

      initializeSession: flow(function* (config: any) {
        self.isLoading = true
        self.error = null
        try {
          const db = getDB()
          const sessionData = yield db.createSession(config)
          self.currentSession = sessionData

          // Load all initial data using the shared helper method
          yield loadInitialData()

          yield logAction('initialize_session', 'success', config)

          return sessionData
        } catch (e: any) {
          self.error = e.message
          yield logAction('initialize_session', 'error', { error: e.message })
          throw e
        } finally {
          self.isLoading = false
        }
      }),

      loadAccounts,
      loadAccountTypes,
      loadTransactionTypes,

      loadPaymentMethods: flow(function* () {
        try {
          const db = getDB()
          const methods = yield db.getPaymentMethods(
            self.currentSession?.userId,
          )
          self.paymentMethods.replace(methods)
        } catch (e: any) {
          self.error = e.message
          throw e
        }
      }),

      loadBeneficiaries: flow(function* () {
        try {
          const db = getDB()
          const beneficiaries = yield db.getBeneficiaries(
            self.currentSession?.userId,
          )
          self.beneficiaries.replace(beneficiaries)
        } catch (e: any) {
          self.error = e.message
          throw e
        }
      }),

      loadBillers: flow(function* () {
        try {
          const db = getDB()
          // const userBillers = yield queries.getUserBillers(self.currentSession?.userId as number)
          const staticBillers = yield db.getAllBillers(
            self.currentSession?.userId,
          )
          const convertedStaticBillers = (staticBillers || []).map((b: any) =>
            convertBiller(b),
          )

          const mergedBillers = [...convertedStaticBillers]

          self.billers.replace(mergedBillers)
        } catch (e: any) {
          self.error = e.message
          throw e
        }
      }),

      loadBills: flow(function* () {
        try {
          const db = getDB()
          const bills = yield db.getBillsByUserId(self.currentSession?.userId)
          const converted = (bills || []).map((b: any) => convertBill(b))
          self.bills.replace(converted)
        } catch (e: any) {
          self.error = e.message
          throw e
        }
      }),

      loadScheduledPayments: flow(function* () {
        try {
          const db = getDB()
          const scheduledTransactions =
            yield db.getScheduledTransactionsByUserId(
              self.currentSession?.userId,
            )
          // Filter for bill payment scheduled transactions and convert to scheduled payments format
          const scheduledPayments = (scheduledTransactions || []).filter(
            (st: any) => st.billerId,
          )
          self.scheduledPayments.replace(
            scheduledPayments.map((st: any) => convertScheduledPayment(st)),
          )
        } catch (e: any) {
          self.error = e.message
          throw e
        }
      }),

      payBill: flow(function* (data: {
        billId: number
        paymentMethod: 'account' | 'credit_card'
        accountId?: number
        creditCardId?: number
        sessionId?: number
      }) {
        self.isLoading = true
        self.error = null
        try {
          const db = getDB()
          const res = yield db.payBill(data)

          // Refresh accounts, bills and transactions
          const accounts = yield db.getAccountsByUserId(
            self.currentSession?.userId,
          )
          const convertedAccounts = accounts.map((account: any) => ({
            ...account,
            isPrimary: Boolean(account.isPrimary),
            overdraftEnabled: Boolean(account.overdraftEnabled),
          }))
          self.accounts.replace(convertedAccounts)

          // Refresh credit cards if payment was made with credit card
          if (
            data.paymentMethod === 'credit_card' &&
            self.currentSession?.userId
          ) {
            const creditCards = yield queries.getCreditCards(
              self.currentSession.userId,
            )
            const convertedCreditCards = creditCards.map((card: any) => ({
              ...card,
              autopayEnabled: Boolean(card.autopayEnabled),
            }))
            self.creditCards.replace(convertedCreditCards)

            // Refresh selected card transactions if the payment was made with the selected card
            if (
              self.selectedCreditCard &&
              self.selectedCreditCard.id === data.creditCardId
            ) {
              const actions = self as any
              yield actions.loadSelectedCardTransactions()
            }
          }

          const bills = yield db.getBillsByUserId(self.currentSession?.userId)
          self.bills.replace((bills || []).map((b: any) => convertBill(b)))

          // Insert transaction returned into transactions list
          if (res?.transaction) {
            self.transactions.unshift(res.transaction)
          }

          yield logAction('pay_bill', 'success', data)
          return res
        } catch (e: any) {
          self.error = e.message
          yield logAction('pay_bill', 'error', { ...data, error: e.message })
          throw e
        } finally {
          self.isLoading = false
        }
      }),

      makeCreditCardPayment: flow(function* (data: {
        creditCardId: number
        fromAccountId: number
        amount: number
        memo?: string
      }) {
        self.isLoading = true
        self.error = null
        try {
          const db = getDB()
          const res = yield db.makeCreditCardPayment({
            userId: self.currentSession?.userId,
            creditCardId: data.creditCardId,
            fromAccountId: data.fromAccountId,
            amount: data.amount,
            memo: data.memo,
          })

          // Refresh accounts after payment
          const accounts = yield db.getAccountsByUserId(
            self.currentSession?.userId,
          )
          const convertedAccounts = accounts.map((account: any) => ({
            ...account,
            isPrimary: Boolean(account.isPrimary),
            overdraftEnabled: Boolean(account.overdraftEnabled),
          }))
          self.accounts.replace(convertedAccounts)

          // Refresh credit cards after payment
          if (self.currentSession?.userId) {
            const creditCards = yield queries.getCreditCards(
              self.currentSession.userId,
            )
            const convertedCreditCards = creditCards.map((card: any) => ({
              ...card,
              autopayEnabled: Boolean(card.autopayEnabled),
            }))
            self.creditCards.replace(convertedCreditCards)

            // Refresh selected card transactions if the payment was made to the selected card
            if (
              self.selectedCreditCard &&
              self.selectedCreditCard.id === data.creditCardId
            ) {
              const actions = self as any
              yield actions.loadSelectedCardTransactions()
            }
          }

          // Insert transaction into transactions list
          if (res) {
            self.transactions.unshift(res)
          }

          yield logAction('credit_card_payment', 'success', data)
          return res
        } catch (e: any) {
          self.error = e.message
          yield logAction('credit_card_payment', 'error', {
            ...data,
            error: e.message,
          })
          throw e
        } finally {
          self.isLoading = false
        }
      }),

      loadTransactions: flow(function* () {
        try {
          const db = getDB()
          const transactions = yield db.getTransactions(self.currentSession?.id)
          self.transactions.replace(transactions)
        } catch (e: any) {
          self.error = e.message
          throw e
        }
      }),

      createAccount: flow(function* (data: {
        accountTypeId: number
        accountName?: string
        initialDeposit?: number
        isPrimary?: boolean
      }) {
        self.isLoading = true
        self.error = null
        try {
          const type = self.accountTypes.find(t => t.id === data.accountTypeId)
          if (!type) throw new Error('Invalid account type')

          // Get tier-based account configuration
          const actions = self as any
          const tierConfig = yield actions.getTierAccountConfig()
          if (!tierConfig) throw new Error('Unable to get tier configuration')

          // Check if account type is allowed for this tier
          if (!tierConfig.config.allowedTypes.includes(type.code)) {
            throw new Error('Account type not allowed for your tier')
          }

          // Count existing accounts of this type for the user
          const userAccountsOfType = self.accounts.filter(
            a =>
              a.userId === self.currentSession?.userId &&
              a.accountTypeId === data.accountTypeId &&
              a.status === 'active',
          )

          // Get tier-based limit for this account type
          const maxAllowed =
            tierConfig.config.maxAccountsPerType[type.code] || 0

          if (userAccountsOfType.length >= maxAllowed) {
            throw new Error('ACCOUNT_LIMIT_REACHED')
          }
          const db = getDB()
          const initialDeposit =
            data.initialDeposit ?? resolveInitialDeposit(type, tierConfig)
          // Generate account number using the helper function
          const generateAccountNumber = (
            accountTypeCode: string,
            userId: number,
          ): string => {
            const prefix =
              {
                checking: '1',
                savings: '2',
                money_market: '3',
              }[accountTypeCode] || '9'

            const userPart = String(userId).padStart(4, '0').slice(-4)
            const randomPart = Math.floor(Math.random() * 10000000)
              .toString()
              .padStart(7, '0')

            return prefix + userPart + randomPart
          }

          const accountNumber = generateAccountNumber(
            type.code,
            self.currentSession!.userId,
          )

          // If creating as primary account, first unset all other primary accounts
          if (data.isPrimary) {
            const userAccounts = self.accounts.filter(
              a =>
                a.userId === self.currentSession?.userId &&
                a.status === 'active',
            )

            for (const acc of userAccounts) {
              if (acc.isPrimary) {
                yield queries.updateAccount(acc.id, { isPrimary: 0 })
                acc.isPrimary = false
              }
            }
          }

          const account = yield db.createAccount({
            userId: self.currentSession?.userId,
            accountTypeId: data.accountTypeId,
            accountNumber,
            accountName: data.accountName,
            initialDeposit,
            isPrimary: data.isPrimary ?? false,
          })

          // Convert database data to match MobX model types
          const convertedAccount = {
            ...account,
            isPrimary: Boolean(account.isPrimary),
            overdraftEnabled: Boolean(account.overdraftEnabled),
          }

          self.accounts.push(convertedAccount)
          yield logAction('create_account', 'success', data)
          return account
        } catch (e: any) {
          self.error = e.message
          yield logAction('create_account', 'error', {
            ...data,
            error: e.message,
          })
          throw e
        } finally {
          self.isLoading = false
        }
      }),

      deposit: flow(function* (accountId: number, amount: number) {
        const account = self.accounts.find(a => a.id === accountId)
        if (!account) throw new Error('Invalid account')
        const db = getDB()
        const transaction = yield db.deposit({
          accountId,
          amount,
          sessionId: self.currentSession?.id,
        })
        account.balance += amount
        self.transactions.push(transaction)
        yield logAction('deposit', 'success', { accountId, amount })
        return transaction
      }),

      withdraw: flow(function* (accountId: number, amount: number) {
        const account = self.accounts.find(a => a.id === accountId)
        if (!account) throw new Error('Invalid account')
        if (account.balance < amount && !account.overdraftEnabled) {
          throw new Error('INSUFFICIENT_FUNDS')
        }
        const db = getDB()
        const transaction = yield db.withdraw({
          accountId,
          amount,
          sessionId: self.currentSession?.id,
        })
        account.balance -= amount
        self.transactions.push(transaction)
        yield logAction('withdraw', 'success', { accountId, amount })
        return transaction
      }),

      transferFunds: flow(function* (
        fromAccountId: number,
        toAccountId: number,
        amount: number,
      ) {
        const from = self.accounts.find(a => a.id === fromAccountId)
        const to = self.accounts.find(a => a.id === toAccountId)
        if (!from || !to) throw new Error('Invalid account(s)')
        if (from.balance < amount && !from.overdraftEnabled) {
          throw new Error('INSUFFICIENT_FUNDS')
        }
        const db = getDB()
        const transaction = yield db.transferFunds(
          fromAccountId,
          toAccountId,
          amount,
          self.currentSession?.id,
        )
        from.balance -= amount
        to.balance += amount
        self.transactions.push(transaction)
        yield logAction('transfer_funds', 'success', {
          fromAccountId,
          toAccountId,
          amount,
        })
        return transaction
      }),

      addPaymentMethod: flow(function* (data: any) {
        const db = getDB()
        const pm = yield db.createPaymentMethod({
          userId: self.currentSession?.userId,
          ...data,
        })
        self.paymentMethods.push(pm)
        yield logAction('add_payment_method', 'success', data)
        return pm
      }),

      removePaymentMethod: flow(function* (id: number) {
        const db = getDB()
        yield db.removePaymentMethod(id)
        self.paymentMethods.replace(
          self.paymentMethods.filter(pm => pm.id !== id),
        )
        yield logAction('remove_payment_method', 'success', { id })
      }),

      addBeneficiary: flow(function* (data: any) {
        const db = getDB()
        const ben = yield db.createBeneficiary({
          userId: self.currentSession?.userId,
          ...data,
        })
        self.beneficiaries.push(ben)
        yield logAction('add_beneficiary', 'success', data)
        return ben
      }),

      editBeneficiary: flow(function* (id: number, updates: any) {
        const ben = self.beneficiaries.find(b => b.id === id)
        if (!ben) throw new Error('Beneficiary not found')
        Object.assign(ben, updates)
        const db = getDB()
        yield db.updateBeneficiary(id, updates)
        yield logAction('edit_beneficiary', 'success', { id, updates })
      }),

      removeBeneficiary: flow(function* (id: number) {
        const db = getDB()
        yield db.removeBeneficiary(id)
        self.beneficiaries.replace(self.beneficiaries.filter(b => b.id !== id))
        yield logAction('remove_beneficiary', 'success', { id })
      }),

      onboardZelle: flow(function* (userId: number, phoneLast4: string) {
        const user = self.users.find(u => u.id === userId)
        if (!user) throw new Error('User not found')
        user.isZelleUser = true
        yield logAction('zelle_onboard', 'success', { userId, phoneLast4 })
      }),

      sendZelle: flow(function* (
        fromUserId: number,
        toUserId: number,
        amount: number,
        fromAccountId: number,
      ) {
        const fromUser = self.users.find(u => u.id === fromUserId)
        const toUser = self.users.find(u => u.id === toUserId)
        if (!fromUser || !toUser) throw new Error('User(s) not found')
        if (!fromUser.isZelleUser || !toUser.isZelleUser) {
          throw new Error('Both users must be Nexus onboarded')
        }
        const fromAcc = self.accounts.find(
          a => a.id === fromAccountId && a.userId === fromUserId,
        )
        if (!fromAcc) throw new Error('From account not found')
        if (fromAcc.balance < amount && !fromAcc.overdraftEnabled) {
          throw new Error('INSUFFICIENT_FUNDS')
        }
        const db = getDB()
        const transaction = yield db.sendZelle({
          fromUserId,
          toUserId,
          fromAccountId,
          amount,
          sessionId: self.currentSession?.id,
        })
        fromAcc.balance -= amount
        self.transactions.push(transaction)
        yield logAction('send_zelle', 'success', {
          fromUserId,
          toUserId,
          amount,
          fromAccountId,
        })
        return transaction
      }),

      // Credit Card Methods
      applyCreditCard: flow(function* (data: {
        userId: number
        cardholderName: string
        creditLimit: number
        apr: number
        annualFee?: number
      }) {
        try {
          const creditCard = yield queries.applyCreditCard(data)

          // Convert database numeric values to booleans for MobX State Tree compatibility
          const convertedCreditCard = {
            ...creditCard,
            autopayEnabled: Boolean(creditCard.autopayEnabled),
          }

          self.creditCards.push(convertedCreditCard)

          yield logAction('apply_credit_card', 'success', data)
          return convertedCreditCard
        } catch (e: any) {
          self.error = e.message
          yield logAction('apply_credit_card', 'error', {
            ...data,
            error: e.message,
          })
          throw e
        }
      }),

      closeCreditCard: flow(function* (cardId: number) {
        try {
          const card = self.creditCards.find(c => c.id === cardId)
          if (!card) throw new Error('Credit card not found')

          // Call the database query to close the card (includes balance check)
          yield queries.closeCreditCard(cardId)

          // Update local state only if database operation succeeds
          card.status = 'closed'

          // If the closed card was selected, clear selection and select another card
          if (self.selectedCreditCard?.id === cardId) {
            const activeCards = self.creditCards.filter(
              c => c.status === 'active',
            )
            if (activeCards.length > 0) {
              const actions = self as any
              actions.setSelectedCreditCard(activeCards[0].id)
            } else {
              self.selectedCreditCard = null
              self.selectedCardTransactions.clear()
            }
          }

          yield logAction('close_credit_card', 'success', { cardId })
          return true
        } catch (e: any) {
          self.error = e.message
          yield logAction('close_credit_card', 'error', {
            cardId,
            error: e.message,
          })
          throw e
        }
      }),

      getCreditCardTransactions: flow(function* (cardId: number) {
        try {
          const transactions = yield queries.getCreditCardTransactions({
            creditCardId: cardId,
          })
          return transactions
        } catch (e: any) {
          self.error = e.message
          throw e
        }
      }),

      setSelectedAccount(accountId: number | null) {
        self.selectedAccount =
          accountId === null
            ? null
            : self.accounts.find(a => a.id === accountId) || null
      },

      setTransactionFilter(filter: string | null) {
        self.transactionFilter = filter
      },

      // Credit Card Terms Actions
      toggleCreditCardTermsAcceptance() {
        self.creditCardTermsAccepted = !self.creditCardTermsAccepted
      },

      resetCreditCardTermsState() {
        self.creditCardTermsAccepted = false
      },

      setIsLoading(loading: boolean) {
        self.isLoading = loading
      },

      // Credit Card Discovery Actions
      setDiscoveryCurrentStep(step: number) {
        self.discoveryCurrentStep = step
      },

      setDiscoveryIsComplete(isComplete: boolean) {
        self.discoveryIsComplete = isComplete
      },

      setDiscoveryCardConfig(config: any) {
        self.discoveryCardConfig = config
      },

      resetDiscoveryState() {
        self.discoveryCurrentStep = 0
        self.discoveryIsComplete = false
        self.discoveryCardConfig = null
      },

      initializeDiscovery: flow(function* () {
        try {
          // Reset discovery state
          self.discoveryCurrentStep = 0
          self.discoveryIsComplete = false

          // Load card config using the existing getTierBasedCreditCardConfig method
          // We need to call it through the actions object since we're in the same actions block
          const actions = self as any
          const config = yield actions.getTierBasedCreditCardConfig()
          self.discoveryCardConfig = config

          return true
        } catch (e: any) {
          console.error('Error initializing discovery:', e)
          return false
        }
      }),

      getTierBasedCreditCardConfig: flow(function* () {
        if (!self.currentSession?.userId) {
          console.log('No current session userId')
          return null
        }

        try {
          // Get user's account tier from queries
          const accountTiers = yield queries.getAccountTiers()

          const user = self.users.find(
            u => u.id === self.currentSession?.userId,
          )
          // console.log('Current users in store:', self.users.length)
          // console.log('Looking for user with ID:', self.currentSession?.userId)
          // console.log('Found user:', user)

          if (!user) return null

          const userTier = accountTiers.find(
            (tier: any) => tier.id === user.accountTierId,
          )
          // console.log('User tier:', userTier)
          if (!userTier) return null

          // Define tier-based credit card configurations (simplified)
          const tierCardConfigs: { [key: string]: any } = {
            sapphire: {
              creditLimit: 75000,
              apr: 15.99,
              annualFee: 150,
            },
            premier: {
              creditLimit: 45000,
              apr: 17.99,
              annualFee: 50,
            },
            everyday: {
              name: 'Everyday Starter Credit Card',
              creditLimit: 25000,
              apr: 19.99,
              annualFee: 0,
            },
          }

          return tierCardConfigs[userTier.code] || null
        } catch (e: any) {
          console.error('Error getting tier-based card config:', e)
          return null
        }
      }),

      canApplyForCreditCard: flow(function* () {
        if (!self.currentSession?.userId) return false

        try {
          // Get current user
          const currentUser = self.users.find(
            u => u.id === self.currentSession?.userId,
          )
          if (!currentUser) return false

          // Get account tiers from database
          const accountTiers = yield queries.getAccountTiers()
          const userTier = accountTiers.find(
            (tier: any) => tier.id === currentUser.accountTierId,
          )
          if (!userTier) return false

          // Count existing active credit cards for this user
          const existingCards = self.creditCards.filter(
            card =>
              card.userId === self.currentSession?.userId &&
              card.status === 'active',
          )

          // Define tier-based credit card limits using tier codes
          const tierLimits: { [key: string]: number } = {
            everyday: 1,
            premier: 2,
            sapphire: 3,
          }

          // Get the limit for the user's tier (default to 1 if tier not found)
          const maxCards = tierLimits[userTier.code] || 1

          // Check if user can apply for another card
          return existingCards.length < maxCards
        } catch (e: any) {
          console.error('Error checking if user can apply for credit card:', e)
          return false
        }
      }),

      getRemainingCardSlots: flow(function* () {
        if (!self.currentSession?.userId) return 0

        try {
          // Get current user
          const currentUser = self.users.find(
            u => u.id === self.currentSession?.userId,
          )
          if (!currentUser) return 0

          // Get account tiers from database
          const accountTiers = yield queries.getAccountTiers()
          const userTier = accountTiers.find(
            (tier: any) => tier.id === currentUser.accountTierId,
          )
          if (!userTier) return 0

          // Count existing active credit cards for this user
          const existingCards = self.creditCards.filter(
            card =>
              card.userId === self.currentSession?.userId &&
              card.status === 'active',
          )

          // Define tier-based credit card limits using tier codes
          const tierLimits: { [key: string]: number } = {
            everyday: 1,
            premier: 2,
            sapphire: 3,
          }

          // Get the limit for the user's tier (default to 1 if tier not found)
          const maxCards = tierLimits[userTier.code] || 1

          // Return remaining slots
          return Math.max(0, maxCards - existingCards.length)
        } catch (e: any) {
          console.error('Error getting remaining card slots:', e)
          return 0
        }
      }),

      getUserTierInfo: flow(function* () {
        if (!self.currentSession?.userId) return null

        try {
          const currentUser = self.users.find(
            u => u.id === self.currentSession?.userId,
          )
          if (!currentUser) return null

          // Get account tiers from database
          const accountTiers = yield queries.getAccountTiers()
          const userTier = accountTiers.find(
            (tier: any) => tier.id === currentUser.accountTierId,
          )
          if (!userTier) return null

          // Define tier-based credit card limits using tier codes
          const tierLimits: { [key: string]: number } = {
            everyday: 1,
            premier: 2,
            sapphire: 3,
          }

          // Capitalize tier name for display
          const tierName =
            userTier.name ||
            userTier.code.charAt(0).toUpperCase() + userTier.code.slice(1)

          return {
            tierId: currentUser.accountTierId,
            tierCode: userTier.code,
            tierName,
            maxCards: tierLimits[userTier.code] || 1,
            currentCards: self.creditCards.filter(
              card =>
                card.userId === self.currentSession?.userId &&
                card.status === 'active',
            ).length,
          }
        } catch (e: any) {
          console.error('Error getting user tier info:', e)
          return null
        }
      }),

      // Card Visibility Actions
      toggleCardDetailsVisibility(cardId: number) {
        const key = cardId.toString()
        const currentVisibility = self.visibleCardDetails.get(key) || false
        self.visibleCardDetails.set(key, !currentVisibility)
      },

      // Account Visibility Actions
      toggleAccountDetailsVisibility(accountId: number) {
        const key = accountId.toString()
        const currentVisibility = self.visibleAccountDetails.get(key) || false
        self.visibleAccountDetails.set(key, !currentVisibility)
      },

      // Account Number Visibility Actions (deprecated - use toggleAccountDetailsVisibility instead)
      toggleAccountNumberVisibility() {
        self.showAccountNumber = !self.showAccountNumber
      },

      setAccountNumberVisibility(visible: boolean) {
        self.showAccountNumber = visible
      },

      // Alert Actions
      showAlert(config: {
        title: string
        message: string
        preset?: 'default' | 'success' | 'error' | 'warning' | 'delete'
        showConfirm?: boolean
        confirmText?: string
        cancelText?: string
      }) {
        self.alertState.visible = true
        self.alertState.title = config.title
        self.alertState.message = config.message
        self.alertState.preset = config.preset || 'default'
        self.alertState.showConfirm = config.showConfirm || false
        self.alertState.confirmText = config.confirmText || 'Confirm'
        self.alertState.cancelText = config.cancelText || 'OK'
      },

      hideAlert() {
        self.alertState.visible = false
        self.alertState.title = ''
        self.alertState.message = ''
        self.alertState.preset = 'default'
        self.alertState.showConfirm = false
        self.alertState.confirmText = 'Confirm'
        self.alertState.cancelText = 'OK'
      },

      // Selected Card Actions
      setSelectedCreditCard: flow(function* (cardId: number | null) {
        if (cardId === null) {
          self.selectedCreditCard = null
          self.selectedCardTransactions.clear()
        } else {
          const card = self.creditCards.find(
            c => c.id === cardId && c.status === 'active',
          )
          if (card) {
            // Only update if it's actually a different card
            if (
              !self.selectedCreditCard ||
              self.selectedCreditCard.id !== cardId
            ) {
              self.selectedCreditCard = card
              // Clear existing transactions immediately to avoid showing wrong data
              self.selectedCardTransactions.clear()
              // Load transactions synchronously to ensure proper order
              const actions = self as any
              yield actions.loadSelectedCardTransactions()
            }
          } else {
            // Card not found, clear the selection
            console.warn(
              `Credit card with ID ${cardId} not found or inactive, clearing selection`,
            )
            self.selectedCreditCard = null
            self.selectedCardTransactions.clear()
          }
        }
      }),

      loadSelectedCardTransactions: flow(function* () {
        if (!self.selectedCreditCard) {
          self.selectedCardTransactions.clear()
          return
        }

        const cardId = self.selectedCreditCard.id
        console.log(`Loading transactions for card ID: ${cardId}`)

        try {
          const actions = self as any
          const transactions = yield actions.getCreditCardTransactions(cardId)

          // Double-check that we're still loading for the same card (avoid race conditions)
          if (
            !self.selectedCreditCard ||
            self.selectedCreditCard.id !== cardId
          ) {
            console.log(
              `Card selection changed during transaction load, ignoring results`,
            )
            return
          }

          // Validate and filter transactions to ensure they're valid transaction objects
          const validTransactions = (transactions || [])
            .filter((transaction: any) => {
              // Ensure it's a valid transaction object and belongs to the correct card
              return (
                transaction &&
                typeof transaction === 'object' &&
                typeof transaction.id === 'number' &&
                typeof transaction.amount === 'number' &&
                transaction.creditCardId === cardId && // Ensure it belongs to the correct card
                (transaction.transactionTypeId !== undefined ||
                  transaction.transactionType !== undefined)
              )
            })
            .slice(0, 5)

          console.log(
            `Loaded ${validTransactions.length} transactions for card ${cardId}`,
          )
          self.selectedCardTransactions.replace(validTransactions)
        } catch (error) {
          console.error('Failed to load selected card transactions:', error)
          self.selectedCardTransactions.clear()
        }
      }),

      initializeSelectedCard: flow(function* () {
        // First, validate current selection and clear invalid references
        if (self.selectedCreditCard) {
          const currentCard = self.creditCards.find(
            c => c.id === self.selectedCreditCard?.id && c.status === 'active',
          )
          if (!currentCard) {
            // Current selection is invalid, clear it
            self.selectedCreditCard = null
            self.selectedCardTransactions.clear()
          }
        }

        // Auto-select first active credit card if none selected
        const activeCards = self.creditCards.filter(
          card => card.status === 'active',
        )
        if (activeCards.length > 0 && !self.selectedCreditCard) {
          // Use actions reference to call setSelectedCreditCard
          const actions = self as any
          yield actions.setSelectedCreditCard(activeCards[0].id)
        } else if (activeCards.length === 0) {
          // No active cards, ensure selection is null
          self.selectedCreditCard = null
          self.selectedCardTransactions.clear()
        }
      }),

      cleanupInvalidReferences() {
        // Force clear any invalid selectedCreditCard reference
        // This prevents MobX State Tree from trying to resolve invalid references
        try {
          if (self.selectedCreditCard) {
            const cardExists = self.creditCards.find(
              c =>
                c.id === self.selectedCreditCard?.id && c.status === 'active',
            )
            if (!cardExists) {
              console.warn('Cleaning up invalid selectedCreditCard reference')
              self.selectedCreditCard = null
              self.selectedCardTransactions.clear()
            }
          }
        } catch (error) {
          // If there's any error accessing selectedCreditCard, force clear it
          console.warn(
            'Error accessing selectedCreditCard, force clearing:',
            error,
          )
          self.selectedCreditCard = null
          self.selectedCardTransactions.clear()
        }
      },

      // Validate and clean up invalid references
      validateReferences() {
        // Check selectedCreditCard reference
        if (self.selectedCreditCard) {
          const cardExists = self.creditCards.find(
            c => c.id === self.selectedCreditCard?.id && c.status === 'active',
          )
          if (!cardExists) {
            console.warn(
              'Invalid selectedCreditCard reference detected, clearing',
            )
            self.selectedCreditCard = null
            self.selectedCardTransactions.clear()
          }
        }

        // Validate selectedCardTransactions to ensure no Bill objects are present
        try {
          const currentTransactions = self.selectedCardTransactions.slice()
          const validTransactions = currentTransactions.filter((item: any) => {
            // Check if item is a valid transaction object (not a Bill)
            const isValid =
              item &&
              typeof item === 'object' &&
              typeof item.id === 'number' &&
              typeof item.amount === 'number' &&
              item.transactionType !== undefined &&
              item.creditCardId !== undefined // Credit card transactions should have creditCardId

            if (!isValid) {
              console.warn(
                'Invalid transaction object detected in selectedCardTransactions:',
                item,
              )
            }
            return isValid
          })

          if (validTransactions.length !== currentTransactions.length) {
            console.warn(
              'Cleaning up invalid transactions from selectedCardTransactions',
            )
            console.log(validTransactions)
            self.selectedCardTransactions.replace(validTransactions)
          }
        } catch (error) {
          console.warn(
            'Error validating selectedCardTransactions, clearing:',
            error,
          )
          self.selectedCardTransactions.clear()
        }
      },

      clearError() {
        self.error = null
      },

      // Set account as primary
      setPrimaryAccount: flow(function* (accountId: number) {
        try {
          if (!self.currentSession?.userId) {
            throw new Error('User session not found')
          }

          const account = self.accounts.find(a => a.id === accountId)
          if (!account) {
            throw new Error('Account not found')
          }

          // First, unset all accounts as non-primary for this user
          const userAccounts = self.accounts.filter(
            a =>
              a.userId === self.currentSession?.userId && a.status === 'active',
          )

          for (const acc of userAccounts) {
            if (acc.isPrimary && acc.id !== accountId) {
              yield queries.updateAccount(acc.id, { isPrimary: 0 })
              acc.isPrimary = false
            }
          }

          // Then set the selected account as primary
          yield queries.updateAccount(accountId, { isPrimary: 1 })
          account.isPrimary = true

          yield logAction('set_primary_account', 'success', { accountId })
          return true
        } catch (e: any) {
          self.error = e.message
          yield logAction('set_primary_account', 'error', {
            accountId,
            error: e.message,
          })
          throw e
        }
      }),

      // Account Creation UI Actions
      setShowAccountBottomSheet(show: boolean) {
        self.showAccountBottomSheet = show
      },

      setAccountName(name: string) {
        self.accountCreationAccountName = name
      },

      setSelectedAccountType(typeId: number | null) {
        self.accountCreationSelectedAccountType = typeId
      },

      setIsPrimary(isPrimary: boolean) {
        self.accountCreationIsPrimary = isPrimary
      },

      setIsCreatingAccount(isCreating: boolean) {
        self.accountCreationIsCreating = isCreating
      },

      setAccountCreationFocused(field: string | null) {
        self.accountCreationCurrentFocused = field
      },

      // Contact Form UI Actions
      setContactFormName(name: string) {
        self.contactFormName = name
      },

      setContactFormEmail(email: string) {
        self.contactFormEmail = email
      },

      setContactFormPhone(phone: string) {
        self.contactFormPhone = phone
      },

      setContactFormIsSubmitting(isSubmitting: boolean) {
        self.contactFormIsSubmitting = isSubmitting
      },

      setContactFormHasPendingNavigation(hasPending: boolean) {
        self.contactFormHasPendingNavigation = hasPending
      },

      setContactFormFocused(field: string | null) {
        self.contactFormCurrentFocused = field
      },

      // Send Money Form UI Actions
      setSendMoneyAmount(amount: string) {
        self.sendMoneyAmount = amount
      },

      setSendMoneySelectedAccountId(accountId: number | null) {
        self.sendMoneySelectedAccountId = accountId
      },

      setSendMoneyShowAccountPicker(show: boolean) {
        self.sendMoneyShowAccountPicker = show
      },

      setSendMoneyMemo(memo: string) {
        self.sendMoneyMemo = memo
      },

      setSendMoneyShowPinModal(show: boolean) {
        self.sendMoneyShowPinModal = show
      },

      setSendMoneyPin(pin: string) {
        self.sendMoneyPin = pin
      },

      setSendMoneyIsProcessing(isProcessing: boolean) {
        self.sendMoneyIsProcessing = isProcessing
      },

      setSendMoneyFocused(field: string | null) {
        self.sendMoneyCurrentFocused = field
      },

      // Zelle Actions
      setZelleSearchQuery(query: string) {
        self.zelleSearchQuery = query
      },

      setZelleSearchFocused(focused: boolean) {
        self.zelleSearchCurrentFocused = focused
      },

      loadZelleContacts: flow(function* () {
        if (!self.currentSession?.userId) return

        try {
          self.isLoadingZelleContacts = true
          const contacts = yield getDB().getZelleContactsByUserId(
            self.currentSession.userId,
          )

          // Convert database integer values to booleans for MobX State Tree
          // and ensure all string fields are properly handled
          const convertedContacts = contacts.map((contact: any) => ({
            ...contact,
            contactName: String(contact.contactName || ''),
            contactEmail: contact.contactEmail || null,
            contactPhone: contact.contactPhone || null,
            isEnrolled: Boolean(contact.isEnrolled),
            isFavorite: Boolean(contact.isFavorite),
            lastSentAmount: contact.lastSentAmount || null,
            lastSentDate: contact.lastSentDate || null,
          }))

          self.zelleContacts.replace(convertedContacts)
        } catch (error) {
          console.error('Error loading Nexus contacts:', error)
          self.error = 'Failed to load Nexus contacts'
        } finally {
          self.isLoadingZelleContacts = false
        }
      }),

      createZelleContact: flow(function* (contactData: {
        contactName: string
        contactEmail?: string
        contactPhone?: string
      }) {
        if (!self.currentSession?.userId) throw new Error('No active session')

        try {
          const contact = yield getDB().createZelleContact({
            userId: self.currentSession.userId,
            ...contactData,
          })

          // Convert database integer values to booleans for MobX State Tree
          // and ensure all string fields are properly handled
          const convertedContact = {
            ...contact,
            contactName: String(contact.contactName || ''),
            contactEmail: contact.contactEmail || null,
            contactPhone: contact.contactPhone || null,
            isEnrolled: Boolean(contact.isEnrolled),
            isFavorite: Boolean(contact.isFavorite),
            lastSentAmount: contact.lastSentAmount || null,
            lastSentDate: contact.lastSentDate || null,
          }

          self.zelleContacts.push(convertedContact)
          return convertedContact
        } catch (error) {
          console.error('Error creating Nexus contact:', error)
          throw error
        }
      }),

      updateZelleContact: flow(function* (
        contactId: number,
        updates: Partial<{
          contactName: string
          contactEmail: string
          contactPhone: string
          isFavorite: boolean
        }>,
      ) {
        try {
          const updatedContact = yield getDB().updateZelleContact(contactId, {
            ...updates,
            isFavorite: updates.isFavorite ? 1 : 0,
          })

          // Convert database integer values to booleans for MobX State Tree
          // and ensure all string fields are properly handled
          const convertedContact = {
            ...updatedContact,
            contactName: String(updatedContact.contactName || ''),
            contactEmail: updatedContact.contactEmail || null,
            contactPhone: updatedContact.contactPhone || null,
            isEnrolled: Boolean(updatedContact.isEnrolled),
            isFavorite: Boolean(updatedContact.isFavorite),
            lastSentAmount: updatedContact.lastSentAmount || null,
            lastSentDate: updatedContact.lastSentDate || null,
          }

          const index = self.zelleContacts.findIndex(c => c.id === contactId)
          if (index !== -1) {
            self.zelleContacts[index] = convertedContact
          }
          return convertedContact
        } catch (error) {
          console.error('Error updating Nexus pay contact:', error)
          throw error
        }
      }),

      sendZellePayment: flow(function* (paymentData: {
        userId: number
        fromAccountId: number
        zelleContactId: number
        amount: number
        memo?: string
        pin: string
      }) {
        if (!self.currentSession?.userId) throw new Error('No active session')

        try {
          const db = getDB()

          // Get the Zelle transaction type ID
          const zelleTransactionType = self.getTransactionTypeByCode('zelle')
          console.log('Transaction type found:', zelleTransactionType)
          if (!zelleTransactionType) {
            throw new Error('Nexus Pay transaction type not found')
          }

          // Use the sendZelle method which handles everything
          const transaction = yield db.sendZelle(
            paymentData.userId,
            paymentData.zelleContactId,
            paymentData.fromAccountId,
            paymentData.amount,
            zelleTransactionType.id,
            paymentData.memo,
          )

          // Refresh accounts to get updated balances from database
          const accounts = yield db.getAccountsByUserId(
            self.currentSession.userId,
          )
          const convertedAccounts = accounts.map((account: any) => ({
            ...account,
            isPrimary: Boolean(account.isPrimary),
            overdraftEnabled: Boolean(account.overdraftEnabled),
          }))
          self.accounts.replace(convertedAccounts)

          // Add transaction to the list
          if (transaction) {
            self.transactions.unshift(transaction)
          }

          // Update contact's last sent info
          const contact = self.zelleContacts.find(
            c => c.id === paymentData.zelleContactId,
          )
          if (contact) {
            contact.lastSentAmount = paymentData.amount
            contact.lastSentDate = new Date().toISOString()
          }

          yield logAction('send_zelle_payment', 'success', paymentData)
          return transaction
        } catch (error) {
          console.error('Error sending Nexus payment:', error)
          yield logAction('send_zelle_payment', 'error', {
            ...paymentData,
            error: (error as Error).message,
          })
          throw error
        }
      }),

      resetAccountCreationForm() {
        self.accountCreationAccountName = ''
        self.accountCreationSelectedAccountType = null
        self.accountCreationIsPrimary = false
        self.accountCreationIsCreating = false
        self.accountCreationCurrentFocused = null
      },

      resetContactForm() {
        self.contactFormName = ''
        self.contactFormEmail = ''
        self.contactFormPhone = ''
        self.contactFormIsSubmitting = false
        self.contactFormHasPendingNavigation = false
        self.contactFormCurrentFocused = null
      },

      resetSendMoneyForm() {
        self.sendMoneyAmount = ''
        self.sendMoneySelectedAccountId = null
        self.sendMoneyShowAccountPicker = false
        self.sendMoneyMemo = ''
        self.sendMoneyShowPinModal = false
        self.sendMoneyPin = ''
        self.sendMoneyIsProcessing = false
        self.sendMoneyCurrentFocused = null
      },

      // Account creation tier-based configurations
      getTierAccountConfig: flow(function* () {
        if (!self.currentSession?.userId) return null

        try {
          const currentUser = self.users.find(
            u => u.id === self.currentSession?.userId,
          )
          if (!currentUser) return null

          const accountTiers = yield queries.getAccountTiers()
          const userTier = accountTiers.find(
            (tier: any) => tier.id === currentUser.accountTierId,
          )
          if (!userTier) return null

          return {
            tierCode: userTier.code,
            tierName:
              userTier.name ||
              userTier.code.charAt(0).toUpperCase() + userTier.code.slice(1),
            config:
              TIER_ACCOUNT_CONFIG_FALLBACKS[userTier.code] ||
              TIER_ACCOUNT_CONFIG_FALLBACKS.everyday,
          }
        } catch (e: any) {
          console.error('Error getting tier account config:', e)
          return null
        }
      }),

      getAvailableAccountTypes: flow(function* () {
        try {
          const actions = self as any
          const tierConfig = yield actions.getTierAccountConfig()
          if (!tierConfig) return []

          // Get all account types and filter by tier allowance
          const allAccountTypes = self.accountTypes
          const allowedTypes = allAccountTypes.filter(type =>
            tierConfig.config.allowedTypes.includes(type.code),
          )

          // Check current account counts for each type
          const currentCounts: { [key: string]: number } = {}
          self.accounts.forEach(account => {
            if (
              account.userId === self.currentSession?.userId &&
              account.status === 'active'
            ) {
              const accountType = self.accountTypes.find(
                t => t.id === account.accountTypeId,
              )
              if (accountType) {
                currentCounts[accountType.code] =
                  (currentCounts[accountType.code] || 0) + 1
              }
            }
          })

          // // Debug logging
          // console.log('Available account types debug:', {
          //   tierCode: tierConfig.tierCode,
          //   currentCounts,
          //   allowedTypes: allowedTypes.map(t => t.code),
          //   tierConfig: tierConfig.config,
          // })

          // Return types with availability info
          return allowedTypes.map(type => ({
            ...type,
            currentCount: currentCounts[type.code] || 0,
            maxAllowed: tierConfig.config.maxAccountsPerType[type.code] || 0,
            canCreate:
              (currentCounts[type.code] || 0) <
              (tierConfig.config.maxAccountsPerType[type.code] || 0),
            initialDeposit: resolveInitialDeposit(type, tierConfig),
          }))
        } catch (e: any) {
          console.error('Error getting available account types:', e)
          return []
        }
      }),

      getAllAccountTypesWithStatus: flow(function* () {
        try {
          const actions = self as any
          const tierConfig = yield actions.getTierAccountConfig()
          if (!tierConfig) return []

          // Get all account types
          const allAccountTypes = self.accountTypes

          // Check current account counts for each type
          const currentCounts: { [key: string]: number } = {}
          self.accounts.forEach(account => {
            if (
              account.userId === self.currentSession?.userId &&
              account.status === 'active'
            ) {
              const accountType = self.accountTypes.find(
                t => t.id === account.accountTypeId,
              )
              if (accountType) {
                currentCounts[accountType.code] =
                  (currentCounts[accountType.code] || 0) + 1
              }
            }
          })

          // Get all tiers to find the required tier for each account type
          const accountTiers = yield queries.getAccountTiers()

          // Return all types with status info
          return allAccountTypes.map(type => {
            const isAllowedForCurrentTier =
              tierConfig.config.allowedTypes.includes(type.code)
            const currentCount = currentCounts[type.code] || 0
            const maxAllowed =
              tierConfig.config.maxAccountsPerType[type.code] || 0
            const canCreate =
              isAllowedForCurrentTier && currentCount < maxAllowed

            // Find which tier allows this account type and get its name
            const requiredTierCode = Object.keys(
              TIER_ACCOUNT_CONFIG_FALLBACKS,
            ).find(tierCode =>
              TIER_ACCOUNT_CONFIG_FALLBACKS[tierCode].allowedTypes.includes(
                type.code,
              ),
            )
            const requiredTierData = requiredTierCode
              ? accountTiers.find((tier: any) => tier.code === requiredTierCode)
              : null

            return {
              ...type,
              currentCount,
              maxAllowed: isAllowedForCurrentTier ? maxAllowed : 0,
              canCreate,
              initialDeposit: resolveInitialDeposit(type, tierConfig),
              isAllowedForCurrentTier,
              requiredTier: requiredTierCode,
              requiredTierName: requiredTierData?.name || null,
            }
          })
        } catch (e: any) {
          console.error('Error getting all account types with status:', e)
          return []
        }
      }),

      getNextTierInfo: flow(function* () {
        try {
          const currentUser = self.users.find(
            u => u.id === self.currentSession?.userId,
          )
          if (!currentUser) return null

          const accountTiers = yield queries.getAccountTiers()
          const currentTier = accountTiers.find(
            (tier: any) => tier.id === currentUser.accountTierId,
          )
          if (!currentTier) return null

          // Find next tier based on sortOrder (lower sortOrder = higher tier)
          const nextTier = accountTiers.find(
            (tier: any) => tier.sortOrder === currentTier.sortOrder - 1,
          )

          return nextTier
            ? {
                tierCode: nextTier.code,
                tierName:
                  nextTier.name ||
                  nextTier.code.charAt(0).toUpperCase() +
                    nextTier.code.slice(1),
                isHighestTier: false,
              }
            : {
                tierCode: null,
                tierName: null,
                isHighestTier: true,
              }
        } catch (e: any) {
          console.error('Error getting next tier info:', e)
          return null
        }
      }),

      restore: flow(function* (data: any) {
        console.log('Restoring BankingStore state from data:', data)
        if (data.currentSession) self.currentSession = data.currentSession
        if (data.accounts) {
          const convertedAccounts = data.accounts.map((account: any) => ({
            ...account,
            isPrimary: Boolean(account.isPrimary),
            overdraftEnabled: Boolean(account.overdraftEnabled),
          }))
          self.accounts.replace(convertedAccounts)
        }
        if (data.accountTypes) self.accountTypes.replace(data.accountTypes)
        if (data.paymentMethods) {
          self.paymentMethods.replace(data.paymentMethods)
        }
        if (data.creditCards) self.creditCards.replace(data.creditCards)
        if (data.beneficiaries) self.beneficiaries.replace(data.beneficiaries)
        if (data.billers) {
          self.billers.replace(
            (data.billers || []).map((b: any) => convertBiller(b)),
          )
        }
        if (data.bills) {
          self.bills.replace((data.bills || []).map((b: any) => convertBill(b)))
        }
        if (data.transactions) self.transactions.replace(data.transactions)
        if (data.users) self.users.replace(data.users)
        if (data.creditCardTermsAccepted !== undefined) {
          self.creditCardTermsAccepted = data.creditCardTermsAccepted
        }
        if (data.discoveryCurrentStep !== undefined) {
          self.discoveryCurrentStep = data.discoveryCurrentStep
        }
        if (data.discoveryIsComplete !== undefined) {
          self.discoveryIsComplete = data.discoveryIsComplete
        }
        if (data.discoveryCardConfig !== undefined) {
          self.discoveryCardConfig = data.discoveryCardConfig
        }
        if (data.visibleCardDetails !== undefined) {
          self.visibleCardDetails.replace(data.visibleCardDetails)
        }
        if (data.showAccountNumber !== undefined) {
          self.showAccountNumber = data.showAccountNumber
        }
        if (data.alertState !== undefined) {
          Object.assign(self.alertState, data.alertState)
        }
        if (data.selectedCreditCard !== undefined) {
          // Validate the selectedCreditCard reference before restoring
          if (data.selectedCreditCard && data.creditCards) {
            const cardExists = data.creditCards.find(
              (card: any) =>
                card.id === data.selectedCreditCard && card.status === 'active',
            )
            if (cardExists) {
              self.selectedCreditCard = data.selectedCreditCard
            } else {
              console.warn(
                'Invalid selectedCreditCard reference in restore data, clearing',
              )
              self.selectedCreditCard = null
            }
          } else {
            self.selectedCreditCard = data.selectedCreditCard
          }
        }

        // After restoring, clean up any invalid references and initialize properly
        const actions = self as any
        actions.cleanupInvalidReferences()
        actions.initializeSelectedCard()
        if (data.selectedCardTransactions !== undefined) {
          // Validate that selectedCardTransactions contains only valid transaction objects
          // and not Bill objects or other invalid data
          const validTransactions = Array.isArray(data.selectedCardTransactions)
            ? data.selectedCardTransactions.filter((item: any) => {
                // Check if item is a valid transaction object (not a Bill)
                return (
                  (item &&
                    typeof item === 'object' &&
                    typeof item.id === 'number' &&
                    typeof item.amount === 'number' &&
                    item.transactionType !== undefined &&
                    !item.billerId) ||
                  typeof item.billerId === 'number'
                ) // Bills have billerId, transactions may or may not
              })
            : []
          self.selectedCardTransactions.replace(validTransactions)
        }
        if (data.showAccountBottomSheet !== undefined) {
          self.showAccountBottomSheet = data.showAccountBottomSheet
        }
        if (data.accountCreationAccountName !== undefined) {
          self.accountCreationAccountName = data.accountCreationAccountName
        }
        if (data.accountCreationSelectedAccountType !== undefined) {
          self.accountCreationSelectedAccountType =
            data.accountCreationSelectedAccountType
        }
        if (data.accountCreationIsPrimary !== undefined) {
          self.accountCreationIsPrimary = data.accountCreationIsPrimary
        }
        if (data.accountCreationIsCreating !== undefined) {
          self.accountCreationIsCreating = data.accountCreationIsCreating
        }
        if (data.zelleContacts) {
          self.zelleContacts.replace(data.zelleContacts)
        }
        if (data.zelleSearchQuery !== undefined) {
          self.zelleSearchQuery = data.zelleSearchQuery
        }
        if (data.isLoadingZelleContacts !== undefined) {
          self.isLoadingZelleContacts = data.isLoadingZelleContacts
        }

        if (data.contactFormName !== undefined) {
          self.contactFormName = data.contactFormName
        }

        if (data.contactFormEmail !== undefined) {
          self.contactFormEmail = data.contactFormEmail
        }

        if (data.contactFormPhone !== undefined) {
          self.contactFormPhone = data.contactFormPhone
        }

        if (data.creditCardTermsAccepted !== undefined) {
          self.creditCardTermsAccepted = data.creditCardTermsAccepted
        }

        if (data.sendMoneyAmount !== undefined) {
          self.sendMoneyAmount = data.sendMoneyAmount
        }

        if (data.sendMoneySelectedAccountId !== undefined) {
          self.sendMoneySelectedAccountId = data.sendMoneySelectedAccountId
        }

        if (data.sendMoneyShowAccountPicker !== undefined) {
          self.sendMoneyShowAccountPicker = data.sendMoneyShowAccountPicker
        }

        if (data.sendMoneyMemo !== undefined) {
          self.sendMoneyMemo = data.sendMoneyMemo
        }

        if (data.sendMoneyShowPinModal !== undefined) {
          self.sendMoneyShowPinModal = data.sendMoneyShowPinModal
        }

        if (data.sendMoneyPin !== undefined) {
          self.sendMoneyPin = data.sendMoneyPin
        }

        if (data.sendMoneyIsProcessing !== undefined) {
          self.sendMoneyIsProcessing = data.sendMoneyIsProcessing
        }

        // Reload all data from database to ensure completeness
        // This ensures we have the latest data after database refresh
        // Uses the same loadInitialData method as initializeSession
        try {
          yield loadInitialData()
        } catch (err) {
          console.warn('Error reloading data during restore:', err)
        }
      }),

      scheduleFuturePayment: flow(function* ({
        billerId,
        amount,
        scheduledDate,
        notes,
        fromAccountId,
        creditCardId,
        createdAt,
        updatedAt,
      }: {
        billerId: string
        amount: number
        scheduledDate: string
        notes: string
        fromAccountId?: string
        creditCardId?: string
        createdAt?: string
        updatedAt?: string
      }) {
        const userId = self.currentSession?.userId
        // console.log(
        //   'Scheduling future payment for userId:',
        //   userId,
        //   scheduledDate,
        //   notes,
        //   createdAt,
        //   updatedAt,
        // )

        if (!userId) {
          throw new Error('User not logged in')
        }

        const scheduledPayment = yield queries.createScheduledPayment({
          userId,
          billerId: Number(billerId),
          amount,
          scheduledDate,
          notes,
          fromAccountId,
          creditCardId,
          createdAt,
          updatedAt,
        })
        return scheduledPayment
      }),

      addBiller: flow(function* (data: any) {
        const newBiller = yield queries.addUserBiller({
          userId: self.currentSession?.userId,
          ...data,
          name: data.name ?? data.billerName,
          phone: data.phone ?? data.billerPhone,
          address: data.address ?? data.billerAddress,
        })
        self.billers.push(convertBiller(newBiller)) // Add the new biller directly to the store
        yield logAction('add_biller', 'success', data)
        return newBiller
      }),
    }
  })

export const createBankingStore = () => {
  BankingStore.create({
    currentSession: null,
    users: [],
    accounts: [],
    accountTypes: [],
    creditCards: [],
    transactionTypes: [],
    paymentMethods: [],
    beneficiaries: [],
    billers: [],
    bills: [],
    transactions: [],
    scheduledPayments: [],
    isLoading: false,
    error: null,
    selectedAccount: null,
    transactionFilter: null,
    creditCardTermsAccepted: false,
    discoveryCurrentStep: 0,
    discoveryIsComplete: false,
    discoveryCardConfig: null,
    visibleCardDetails: {},
    showAccountNumber: false,
    alertState: {
      visible: false,
      title: '',
      message: '',
      preset: 'default',
      showConfirm: false,
      confirmText: 'Confirm',
      cancelText: 'OK',
    },
    selectedCreditCard: null,
    selectedCardTransactions: [],
    showAccountBottomSheet: false,
    accountCreationAccountName: '',
    accountCreationSelectedAccountType: null,
    accountCreationIsPrimary: false,
    accountCreationIsCreating: false,
    accountCreationCurrentFocused: null,
    contactFormName: '',
    contactFormEmail: '',
    contactFormPhone: '',
    contactFormIsSubmitting: false,
    contactFormHasPendingNavigation: false,
    contactFormCurrentFocused: null,
    sendMoneyAmount: '',
    sendMoneySelectedAccountId: null,
    sendMoneyShowAccountPicker: false,
    sendMoneyMemo: '',
    sendMoneyShowPinModal: false,
    sendMoneyPin: '',
    sendMoneyIsProcessing: false,
    sendMoneyCurrentFocused: null,
    zelleSearchQuery: '',
    isLoadingZelleContacts: false,
    zelleSearchCurrentFocused: false,
  })
}

export interface BankingStoreModel extends Instance<typeof BankingStore> {}
export interface BankingStoreSnapshot
  extends SnapshotOut<typeof BankingStore> {}
export interface BankingStoreSnapshotIn
  extends SnapshotIn<typeof BankingStore> {}

export { Transaction }
