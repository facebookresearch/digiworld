// Copyright (c) Meta Platforms, Inc. and affiliates.
import { sql } from 'drizzle-orm'
import {
  accounts,
  accountTierLevels,
  accountTypes,
  beneficiaries,
  billers,
  bills,
  creditCards,
  scheduledTransactions,
  transactions,
  transactionTypes,
  users,
  zelleContacts,
  notifications,
  systemConfig,
} from './schema'
import { db } from './index'
import { createReadJSONFile } from '@andojo/shared-mock-reader'
import usersStaticMock from '../data/mock-users.json'
import accountTierLevelsMock from '../data/mock-account_tier_levels.json'
import accountTypesMock from '../data/mock-account_types.json'
import accountsMock from '../data/mock-accounts.json'
import creditCardsMock from '../data/mock-credit_cards.json'
import beneficiariesMock from '../data/mock-beneficiaries.json'
import zelleContactsMock from '../data/mock-zelle_contacts.json'
import billersMock from '../data/mock-billers.json'
import billsMock from '../data/mock-bills.json'
import transactionTypesMock from '../data/mock-transaction_types.json'
import transactionsMock from '../data/mock-transactions.json'
import scheduledTransactionsMock from '../data/mock-scheduled_transactions.json'
import notificationsMock from '../data/mock-notifications.json'
import systemConfigMock from '../data/mock-system_config.json'

const bundledMocks = {
  'mock-users.json': usersStaticMock,
  'mock-account_tier_levels.json': accountTierLevelsMock,
  'mock-account_types.json': accountTypesMock,
  'mock-accounts.json': accountsMock,
  'mock-credit_cards.json': creditCardsMock,
  'mock-beneficiaries.json': beneficiariesMock,
  'mock-zelle_contacts.json': zelleContactsMock,
  'mock-billers.json': billersMock,
  'mock-bills.json': billsMock,
  'mock-transaction_types.json': transactionTypesMock,
  'mock-transactions.json': transactionsMock,
  'mock-scheduled_transactions.json': scheduledTransactionsMock,
  'mock-notifications.json': notificationsMock,
  'mock-system_config.json': systemConfigMock,
}

export const readJSONFile = createReadJSONFile(bundledMocks)

// async function readJSONFile(filename: string) {
//   try {
//     const baseDir = Platform.select({
//       android: `${RNFS.ExternalDirectoryPath}/mockdata`,
//       ios: `${RNFS.DocumentDirectoryPath}/mockdata`,
//       default: '',
//     })
//     const filePath = `${baseDir}/${filename}`
//     const exists = await RNFS.exists(filePath)
//     if (exists) {
//       console.log(`Reading ${filename} from storage`)
//       const content = await RNFS.readFile(filePath, 'utf8')
//       return JSON.parse(content)
//     } else {
//       console.log(`File ${filename} not found in storage, using bundled data`)
//       switch (filename) {
//         case 'users.json':
//           return usersStaticMock
//         case 'channels.json':
//           return channelsStaticMock
//         case 'videos.json':
//           return videosStaticMock
//         case 'playlists.json':
//           return playlistsStaticMock
//         case 'comments.json':
//           return commentsStaticMock
//         case 'categories_tags.json':
//           return categoriesStaticMock
//         default:
//           console.error(`Unknown mock data file: ${filename}`)
//           return null
//       }
//     }
//   } catch (err) {
//     console.error(`Failed to load ${filename}:`, err)
//     return null
//   }
// }

export const mutations = {
  async initializeDatabase(): Promise<{
    success: boolean
    skipped?: boolean
    error?: any
  }> {
    try {
      const [
        userCountResult,
        tierLevelCountResult,
        accountTypeCountResult,
        accountCountResult,
        creditCardCountResult,
        beneficiaryCountResult,
        zelleContactCountResult,
        billerCountResult,
        billCountResult,
        transactionTypeCountResult,
      ] = await Promise.all([
        db.select().from(users).limit(1).execute(),
        db.select().from(accountTierLevels).limit(1).execute(),
        db.select().from(accountTypes).limit(1).execute(),
        db.select().from(accounts).limit(1).execute(),
        db.select().from(creditCards).limit(1).execute(),
        db.select().from(beneficiaries).limit(1).execute(),
        db.select().from(zelleContacts).limit(1).execute(),
        db.select().from(billers).limit(1).execute(),
        db.select().from(bills).limit(1).execute(),
        db.select().from(transactionTypes).limit(1).execute(),
      ])

      const isAlreadySeeded =
        userCountResult.length > 0 ||
        tierLevelCountResult.length > 0 ||
        accountTypeCountResult.length > 0 ||
        accountCountResult.length > 0 ||
        creditCardCountResult.length > 0 ||
        beneficiaryCountResult.length > 0 ||
        zelleContactCountResult.length > 0 ||
        billerCountResult.length > 0 ||
        billCountResult.length > 0 ||
        transactionTypeCountResult.length > 0

      if (isAlreadySeeded) {
        console.log('Database already initialized, skipping seeding.')
        return { success: true, skipped: true }
      }

      console.log('Seeding database with mock data...')
      // Read all mock data in parallel, including notifications
      const [
        usersData,
        tierLevelsData,
        accountTypesData,
        accountsData,
        creditCardsData,
        beneficiariesData,
        zelleContactsData,
        billersData,
        billsData,
        transactionTypesData,
        transactionsData,
        scheduledTransactionsData,
        notificationsData,
        systemConfigData,
      ] = await Promise.all([
        readJSONFile('mock-users.json'),
        readJSONFile('mock-account_tier_levels.json'),
        readJSONFile('mock-account_types.json'),
        readJSONFile('mock-accounts.json'),
        readJSONFile('mock-credit_cards.json'),
        readJSONFile('mock-beneficiaries.json'),
        readJSONFile('mock-zelle_contacts.json'),
        readJSONFile('mock-billers.json'),
        readJSONFile('mock-bills.json'),
        readJSONFile('mock-transaction_types.json'),
        readJSONFile('mock-transactions.json'),
        readJSONFile('mock-scheduled_transactions.json'),
        readJSONFile('mock-notifications.json'),
        readJSONFile('mock-system_config.json'),
      ])

      console.log('Clearing tables...')
      const clearTables = [
        'notifications',
        'system_config',
        'scheduled_transactions',
        'transactions',
        'bills',
        'billers',
        'zelle_contacts',
        'beneficiaries',
        'credit_cards',
        'accounts',
        'account_types',
        'account_tier_levels',
        'users',
      ]
      for (const table of clearTables) {
        await db.run(sql.raw(`DELETE FROM ${table}`))
      }

      console.log('Seeding account tier levels...')
      if (tierLevelsData.length > 0) {
        await db
          .insert(accountTierLevels)
          .values(
            tierLevelsData.map((tier: any) => ({
              id: tier.id,
              code: tier.code,
              name: tier.name,
              description: tier.description,
              minCombinedBalance: tier.minCombinedBalance,
              maxAccountsPerType: tier.maxAccountsPerType,
              monthlyFee: tier.monthlyFee,
              feeWaiverBalance: tier.feeWaiverBalance,
              hasOverdraftProtection: tier.hasOverdraftProtection,
              hasInterestChecking: tier.hasInterestChecking,
              interestRateBonus: tier.interestRateBonus,
              freeWireTransfers: tier.freeWireTransfers,
              freeCashiersChecks: tier.freeCashiersChecks,
              prioritySupport: tier.prioritySupport,
              dedicatedBanker: tier.dedicatedBanker,
              sortOrder: tier.sortOrder,
              createdAt: tier.createdAt,
            })),
          )
          .run()
        console.log(`Loaded ${tierLevelsData.length} account tier levels`)
      }

      console.log('Seeding account types...')
      if (accountTypesData.length > 0) {
        await db
          .insert(accountTypes)
          .values(
            accountTypesData.map((acctType: any) => ({
              id: acctType.id,
              tierLevelId: acctType.tierLevelId,
              code: acctType.code,
              name: acctType.name,
              category: acctType.category,
              description: acctType.description,
              minOpeningBalance: acctType.minOpeningBalance,
              maxBalance: acctType.maxBalance,
              monthlyFee: acctType.monthlyFee,
              feeWaiverMinBalance: acctType.feeWaiverMinBalance,
              feeWaiverMinDirectDeposit: acctType.feeWaiverMinDirectDeposit,
              hasInterest: acctType.hasInterest,
              baseInterestRate: acctType.baseInterestRate,
              hasDebitCard: acctType.hasDebitCard,
              hasChecks: acctType.hasChecks,
              allowsOverdraft: acctType.allowsOverdraft,
              overdraftFee: acctType.overdraftFee,
              overdraftProtectionTransferFee:
                acctType.overdraftProtectionTransferFee,
              minBalanceToAvoidFee: acctType.minBalanceToAvoidFee,
              monthlyTransactionLimit: acctType.monthlyTransactionLimit,
              withdrawalPenaltyDays: acctType.withdrawalPenaltyDays,
              earlyWithdrawalPenaltyRate: acctType.earlyWithdrawalPenaltyRate,
              isActive: acctType.isActive,
              sortOrder: acctType.sortOrder,
              createdAt: acctType.createdAt,
            })),
          )
          .run()
        console.log(`Loaded ${accountTypesData.length} account types`)
      }

      console.log('Seeding users...')
      if (usersData.length > 0) {
        await db
          .insert(users)
          .values(
            usersData.map((user: any) => ({
              id: user.id,
              username: user.username,
              password: user.password,
              fullName: user.fullName,
              phoneNumber: user.phoneNumber,
              email: user.email,
              accountTierId: user.accountTierId,
              pin: user.pin,
              securityQuestion: user.securityQuestion,
              securityAnswer: user.securityAnswer,
              createdAt: user.createdAt,
              updatedAt: user.updatedAt,
              deletedAt: user.deletedAt,
            })),
          )
          .run()
        console.log(`Loaded ${usersData.length} users`)
      }

      console.log('Seeding accounts...')
      if (accountsData.length > 0) {
        await db
          .insert(accounts)
          .values(
            accountsData.map((acct: any) => ({
              id: acct.id,
              userId: acct.userId,
              accountTypeId: acct.accountTypeId,
              accountNumber: acct.accountNumber,
              accountName: acct.accountName,
              balance: acct.balance,
              availableBalance: acct.availableBalance,
              isPrimary: acct.isPrimary,
              status: acct.status,
              openedDate: acct.openedDate,
              closedDate: acct.closedDate,
              lastStatementDate: acct.lastStatementDate,
              nextStatementDate: acct.nextStatementDate,
              overdraftProtectionEnabled: acct.overdraftProtectionEnabled,
              overdraftProtectionSourceAccountId:
                acct.overdraftProtectionSourceAccountId,
              linkedSavingsAccountId: acct.linkedSavingsAccountId,
              createdAt: acct.createdAt,
              updatedAt: acct.updatedAt,
              deletedAt: acct.deletedAt,
            })),
          )
          .run()
        console.log(`Loaded ${accountsData.length} accounts`)
      }

      console.log('Seeding credit cards...')
      if (creditCardsData.length > 0) {
        await db
          .insert(creditCards)
          .values(
            creditCardsData.map((card: any) => ({
              id: card.id,
              userId: card.userId,
              linkedCheckingAccountId: card.linkedCheckingAccountId,
              cardNumber: card.cardNumber,
              lastFourDigits: card.lastFourDigits,
              cardholderName: card.cardholderName,
              expiryMonth: card.expiryMonth,
              expiryYear: card.expiryYear,
              cvv: card.cvv,
              creditLimit: card.creditLimit,
              currentBalance: card.currentBalance,
              availableCredit: card.availableCredit,
              apr: card.apr,
              annualFee: card.annualFee,
              cashAdvanceFeePercent: card.cashAdvanceFeePercent,
              latePaymentFee: card.latePaymentFee,
              paymentDueDay: card.paymentDueDay,
              minimumPaymentPercent: card.minimumPaymentPercent,
              statementClosingDay: card.statementClosingDay,
              autopayEnabled: card.autopayEnabled,
              autopayAmount: card.autopayAmount,
              status: card.status,
              openedDate: card.openedDate,
              lastPaymentDate: card.lastPaymentDate,
              lastStatementDate: card.lastStatementDate,
              createdAt: card.createdAt,
            })),
          )
          .run()
        console.log(`Loaded ${creditCardsData.length} credit cards`)
      }

      console.log('Seeding beneficiaries...')
      if (beneficiariesData.length > 0) {
        await db
          .insert(beneficiaries)
          .values(
            beneficiariesData.map((ben: any) => ({
              id: ben.id,
              userId: ben.userId,
              name: ben.name,
              accountNumber: ben.accountNumber,
              accountType: ben.accountType,
              bankName: ben.bankName,
              bankAddress: ben.bankAddress,
              nickname: ben.nickname,
              email: ben.email,
              phone: ben.phone,
              verificationStatus: ben.verificationStatus,
              verificationMethod: ben.verificationMethod,
              isFavorite: ben.isFavorite,
              status: ben.status,
              createdAt: ben.createdAt,
              updatedAt: ben.updatedAt,
              deletedAt: ben.deletedAt,
            })),
          )
          .run()
        console.log(`Loaded ${beneficiariesData.length} beneficiaries`)
      }

      console.log('Seeding Nexus contacts...')
      if (zelleContactsData.length > 0) {
        await db
          .insert(zelleContacts)
          .values(
            zelleContactsData.map((contact: any) => ({
              id: contact.id,
              userId: contact.userId,
              contactName: contact.contactName,
              contactEmail: contact.contactEmail,
              contactPhone: contact.contactPhone,
              isEnrolled: contact.isEnrolled,
              isFavorite: contact.isFavorite,
              lastSentAmount: contact.lastSentAmount,
              lastSentDate: contact.lastSentDate,
              createdAt: contact.createdAt,
            })),
          )
          .run()
        console.log(`Loaded ${zelleContactsData.length} Nexus contacts`)
      }

      console.log('Seeding billers...')
      if (billersData.length > 0) {
        await db
          .insert(billers)
          .values(
            billersData.map((biller: any) => ({
              id: biller.id,
              code: biller.code,
              name: biller.name,
              category: biller.category,
              subcategory: biller.subcategory,
              description: biller.description,
              logoUrl: biller.logoUrl,
              website: biller.website,
              phone: biller.phone,
              address: biller.address,
              isSearchable: biller.isSearchable,
              searchSuccessRate: biller.searchSuccessRate,
              requiresAccountNumber: biller.requiresAccountNumber,
              acceptsCreditCard: biller.acceptsCreditCard,
              acceptsBankAccount: biller.acceptsBankAccount,
              minPaymentAmount: biller.minPaymentAmount,
              averageBillAmount: biller.averageBillAmount,
              paymentProcessingDays: biller.paymentProcessingDays,
              isActive: biller.isActive,
              createdAt: biller.createdAt,
            })),
          )
          .run()
        console.log(`Loaded ${billersData.length} billers`)
      }

      console.log('Seeding bills...')
      if (billsData.length > 0) {
        await db
          .insert(bills)
          .values(
            billsData.map((bill: any) => ({
              id: bill.id,
              userId: bill.userId,
              billerId: bill.billerId,
              accountId: bill.accountId,
              billNumber: bill.billNumber,
              amount: bill.amount,
              dueDate: bill.dueDate,
              dueDay: bill.dueDay,
              isRecurring: bill.isRecurring,
              recurrenceInterval: bill.recurrenceInterval,
              nextDueDate: bill.nextDueDate,
              autoPayEnabled: bill.autoPayEnabled,
              autoPayAccountId: bill.autoPayAccountId,
              minimumPaymentAmount: bill.minimumPaymentAmount,
              status: bill.status,
              paidDate: bill.paidDate,
              paidAmount: bill.paidAmount,
              lateFee: bill.lateFee,
              createdAt: bill.createdAt,
              updatedAt: bill.updatedAt,
            })),
          )
          .run()
        console.log(`Loaded ${billsData.length} bills`)
      }

      console.log('Seeding transaction types...')
      if (transactionTypesData.length > 0) {
        await db
          .insert(transactionTypes)
          .values(
            transactionTypesData.map((tType: any) => ({
              id: tType.id,
              code: tType.code,
              name: tType.name,
              category: tType.category,
              description: tType.description,
            })),
          )
          .run()
        console.log(`Loaded ${transactionTypesData.length} transaction types`)
      }

      console.log('Seeding transactions...')
      if (transactionsData.length > 0) {
        await db
          .insert(transactions)
          .values(
            transactionsData.map((tx: any) => ({
              id: tx.id,
              sessionId: tx.sessionId,
              transactionTypeId: tx.transactionTypeId,
              userId: tx.userId,
              fromAccountId: tx.fromAccountId,
              toAccountId: tx.toAccountId,
              billerId: tx.billerId,
              billId: tx.billId,
              beneficiaryId: tx.beneficiaryId,
              zelleContactId: tx.zelleContactId,
              creditCardId: tx.creditCardId,
              amount: tx.amount,
              fee: tx.fee,
              balanceBefore: tx.balanceBefore,
              balanceAfter: tx.balanceAfter,
              referenceId: tx.referenceId,
              confirmationNumber: tx.confirmationNumber,
              description: tx.description,
              memo: tx.memo,
              day: tx.day,
              transactionDate: tx.transactionDate,
              postedDate: tx.postedDate,
              pendingUntil: tx.pendingUntil,
              status: tx.status,
              failureReason: tx.failureReason,
              errorCode: tx.errorCode,
              errorMessage: tx.errorMessage,
              metadata: tx.metadata,
              createdAt: tx.createdAt,
            })),
          )
          .run()
        console.log(`Loaded ${transactionsData.length} transactions`)
      }

      console.log('Seeding scheduled transactions...')
      if (scheduledTransactionsData.length > 0) {
        await db
          .insert(scheduledTransactions)
          .values(
            scheduledTransactionsData.map((stx: any) => ({
              id: stx.id,
              userId: stx.userId,
              transactionTypeId: stx.transactionTypeId,
              fromAccountId: stx.fromAccountId,
              toAccountId: stx.toAccountId,
              billerId: stx.billerId,
              beneficiaryId: stx.beneficiaryId,
              amount: stx.amount,
              scheduledDate: stx.scheduledDate,
              isRecurring: stx.isRecurring,
              recurrenceFrequency: stx.recurrenceFrequency,
              recurrenceEndDate: stx.recurrenceEndDate,
              description: stx.description,
              memo: stx.memo,
              status: stx.status,
              processedTransactionId: stx.processedTransactionId,
              createdAt: stx.createdAt,
              updatedAt: stx.updatedAt,
            })),
          )
          .run()
        console.log(
          `Loaded ${scheduledTransactionsData.length} scheduled transactions`,
        )
      }

      console.log('Seeding notifications...')
      if (notificationsData.length > 0) {
        await db
          .insert(notifications)
          .values(
            notificationsData.map((notif: any) => ({
              id: notif.id,
              userId: notif.userId,
              sessionId: notif.sessionId,
              notificationType: notif.notificationType,
              title: notif.title,
              message: notif.message,
              relatedTransactionId: notif.relatedTransactionId,
              relatedBillId: notif.relatedBillId,
              relatedAccountId: notif.relatedAccountId,
              priority: notif.priority,
              isRead: notif.isRead,
              readAt: notif.readAt,
              createdAt: notif.createdAt,
              expiresAt: notif.expiresAt,
            })),
          )
          .run()
        console.log(`Loaded ${notificationsData.length} notifications`)
      }

      console.log('Seeding system config...')
      // Ensure the isPINValidationRequired flag exists (default false if missing)
      if (!Array.isArray(systemConfigData)) {
        console.warn(
          'system config data missing or invalid, inserting default flag',
        )
        const defaultCfg = {
          id: 1,
          key: 'isPINValidationRequired',
          value: 'false',
          dataType: 'boolean',
          category: 'features',
          description: 'Require PIN validation for sensitive actions',
          isConfigurable: 1,
          updatedAt: new Date().toISOString(),
        }
        await db.insert(systemConfig).values(defaultCfg).run()
      } else {
        const hasPinFlag = systemConfigData.some(
          (c: any) => c && c.key === 'isPINValidationRequired',
        )
        if (!hasPinFlag) {
          const maxId = systemConfigData.reduce(
            (m: number, c: any) => Math.max(m, c?.id || 0),
            0,
          )
          systemConfigData.push({
            id: maxId + 1,
            key: 'isPINValidationRequired',
            value: 'false',
            dataType: 'boolean',
            category: 'features',
            description: 'Require PIN validation for sensitive actions',
            isConfigurable: 1,
            updatedAt: new Date().toISOString(),
          })
        }

        if (systemConfigData.length > 0) {
          await db
            .insert(systemConfig)
            .values(
              systemConfigData.map((cfg: any) => ({
                id: cfg.id,
                key: cfg.key,
                value: cfg.value,
                dataType: cfg.dataType,
                category: cfg.category,
                description: cfg.description,
                isConfigurable: cfg.isConfigurable,
                updatedAt: cfg.updatedAt,
              })),
            )
            .run()
          console.log(`Loaded ${systemConfigData.length} system config entries`)
        }
      }

      console.log('Database initialized successfully')
      return { success: true }
    } catch (error) {
      console.error('Error initializing database:', error)
      return { success: false, error }
    }
  },
}
