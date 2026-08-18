/**
 * Helper functions for transaction display in banking app
 */

/**
 * Helper function to determine if a transaction is incoming or outgoing from the current user's perspective
 * @param transaction - The transaction object
 * @param currentAccountId - The current user's account ID (if viewing from specific account context)
 * @returns Object with transaction sign and direction information
 */
export function getTransactionSign(
  transaction: any,
  currentAccountId?: number,
) {
  // For banking app, we need to determine based on transaction type ID and account context
  const { transactionTypeId, fromAccountId, toAccountId, amount } = transaction

  let isOutgoing = false
  let isIncoming = false

  // If we have account context, use it to determine direction
  if (currentAccountId) {
    isOutgoing = fromAccountId === currentAccountId
    isIncoming = toAccountId === currentAccountId
  } else {
    // Without specific account context, use transaction type ID
    switch (transactionTypeId) {
      case 5: // deposit - always incoming
        isIncoming = true
        break
      case 1: // transfer
      case 2: // bill_payment
      case 3: // zelle
      case 4: // external_transfer
      case 6: // withdrawal
      case 7: // purchase
      case 8: // credit_card_payment
      case 9: // interest_charge
      case 10: // monthly_fee
        isOutgoing = true
        break
      default:
        // For other types, use the amount sign from database
        isOutgoing = amount < 0
        isIncoming = amount > 0
        break
    }
  }

  return {
    isOutgoing,
    isIncoming,
    sign: isOutgoing ? '-' : '+',
    direction: isOutgoing ? 'sent' : 'received',
    iconName: isOutgoing ? 'arrow-forward' : 'arrow-back',
  }
}

/**
 * Format transaction amount with proper sign
 * @param transaction - The transaction object
 * @param currentAccountId - The current user's account ID (optional)
 * @returns Formatted amount string with sign
 */
export function formatTransactionAmount(
  transaction: any,
  currentAccountId?: number,
) {
  const { sign } = getTransactionSign(transaction, currentAccountId)
  const absAmount = Math.abs(transaction.amount)
  return `${sign}$${absAmount.toFixed(2)}`
}

/**
 * Get account context information for display
 * @param transaction - The transaction object
 * @param accounts - Array of account objects
 * @param zelleContacts - Array of Zelle contacts (optional)
 * @param billers - Array of billers (optional)
 * @param currentAccountId - Current account ID for perspective (optional)
 * @returns Object with from/to account information
 */
export function getTransactionAccountContext(
  transaction: any,
  accounts: any[],
  zelleContacts?: any[],
  billers?: any[],
  currentAccountId?: number,
) {
  const {
    fromAccountId,
    toAccountId,
    zelleContactId,
    billerId,
    transactionTypeId,
  } = transaction

  let fromAccount = null
  let toAccount = null

  // Get from account info
  if (fromAccountId) {
    const account = accounts.find(a => a.id === fromAccountId)
    if (account) {
      fromAccount = {
        name: account.accountName || 'Account',
        type: 'account',
        lastFour: `••••${account.accountNumber.slice(-4)}`,
        accountNumber: account.accountNumber,
      }
    }
  }

  // Get to account info
  if (toAccountId) {
    const account = accounts.find(a => a.id === toAccountId)
    if (account) {
      toAccount = {
        name: account.accountName || 'Account',
        type: 'account',
        lastFour: `••••${account.accountNumber.slice(-4)}`,
        accountNumber: account.accountNumber,
      }
    }
  }

  // Handle Zelle transactions (transactionTypeId 3)
  if (transactionTypeId === 3 && zelleContactId && zelleContacts) {
    const contact = zelleContacts.find(c => c.id === zelleContactId)
    if (contact) {
      const contactInfo = {
        name: contact.contactName,
        type: 'zelle',
        contact: {
          email: contact.contactEmail,
          phone: contact.contactPhone,
        },
      }

      // For Zelle, determine if it's outgoing or incoming
      const { isOutgoing } = getTransactionSign(transaction, currentAccountId)
      if (isOutgoing) {
        toAccount = contactInfo
      } else {
        fromAccount = contactInfo
      }
    }
  }

  // Handle bill payments (transactionTypeId 2)
  if (transactionTypeId === 2 && billerId && billers) {
    const biller = billers.find(b => b.id === billerId)
    if (biller) {
      toAccount = {
        name: biller.name,
        type: 'biller',
        category: biller.category,
      }
    }
  }

  // Handle external transfers (transactionTypeId 4)
  if (transactionTypeId === 4) {
    const { isOutgoing } = getTransactionSign(transaction, currentAccountId)
    if (isOutgoing && !toAccount) {
      toAccount = {
        name: 'External Account',
        type: 'external',
      }
    } else if (!isOutgoing && !fromAccount) {
      fromAccount = {
        name: 'External Account',
        type: 'external',
      }
    }
  }

  return {
    fromAccount,
    toAccount,
  }
}

/**
 * Get a user-friendly description for the transaction
 * @param transaction - The transaction object
 * @param accountContext - The account context from getTransactionAccountContext
 * @param transactionTypeCode - The transaction type code (from transaction types mapping)
 * @returns User-friendly description string
 */
export function getTransactionDescription(
  transaction: any,
  accountContext: any,
  transactionTypeCode?: string,
) {
  const { transactionTypeId } = transaction
  const { fromAccount, toAccount } = accountContext

  // Use provided code or map from transactionTypeId
  const typeCode =
    transactionTypeCode || getTransactionTypeCode(transactionTypeId)

  switch (typeCode) {
    case 'transfer':
      if (fromAccount && toAccount) {
        return `Transfer from ${fromAccount.name} to ${toAccount.name}`
      }
      return 'Account Transfer'

    case 'zelle':
      if (toAccount?.type === 'zelle') {
        return `Nexus payment to ${toAccount.name}`
      } else if (fromAccount?.type === 'zelle') {
        return `Nexus payment from ${fromAccount.name}`
      }
      return 'Nexus Payment'

    case 'bill_payment':
      if (toAccount?.type === 'biller') {
        return `Bill payment to ${toAccount.name}`
      }
      return 'Bill Payment'

    case 'deposit':
      return 'Deposit'

    case 'withdrawal':
      return 'Withdrawal'

    case 'external_transfer':
      return 'External Transfer'

    case 'credit_card_payment':
      return 'Credit Card Payment'

    case 'purchase':
      return 'Purchase'

    case 'interest_charge':
      return 'Interest Charge'

    case 'monthly_fee':
      return 'Monthly Fee'

    default:
      return transaction.description || 'Transaction'
  }
}

/**
 * Helper function to map transactionTypeId to transaction type code
 * @param transactionTypeId - The numeric transaction type ID
 * @returns The transaction type code string
 */
function getTransactionTypeCode(transactionTypeId: number): string {
  switch (transactionTypeId) {
    case 1:
      return 'transfer'
    case 2:
      return 'bill_payment'
    case 3:
      return 'zelle'
    case 4:
      return 'external_transfer'
    case 5:
      return 'deposit'
    case 6:
      return 'withdrawal'
    case 7:
      return 'purchase'
    case 8:
      return 'credit_card_payment'
    case 9:
      return 'interest_charge'
    case 10:
      return 'monthly_fee'
    default:
      return 'unknown'
  }
}

/**
 * Get the appropriate icon for a transaction type
 * @param transactionTypeCode - The transaction type code
 * @returns Ionicon name for the transaction type
 */
export function getTransactionIcon(transactionTypeCode: string): string {
  switch (transactionTypeCode) {
    case 'transfer':
      return 'swap-horizontal-outline'
    case 'bill_payment':
      return 'receipt-outline'
    case 'zelle':
      return 'phone-portrait-outline'
    case 'external_transfer':
      return 'arrow-forward-outline'
    case 'deposit':
      return 'add-circle-outline'
    case 'withdrawal':
      return 'remove-circle-outline'
    case 'purchase':
      return 'cart-outline'
    case 'credit_card_payment':
      return 'card-outline'
    case 'interest_charge':
      return 'trending-up-outline'
    case 'monthly_fee':
      return 'card-outline'
    default:
      return 'receipt-outline'
  }
}
