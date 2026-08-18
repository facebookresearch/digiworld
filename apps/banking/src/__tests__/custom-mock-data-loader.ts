// Copyright (c) Meta Platforms, Inc. and affiliates.
/**
 * Custom Mock Data Loader
 *
 * This module provides flexible mock data loading that can use either:
 * 1. Default mock data from src/data
 * 2. Custom mock data from __tests__/mockdata
 * 3. A combination of both
 */

import fs from 'fs'
import path from 'path'
import { createReadJSONFile } from '@andojo/shared-mock-reader'

export interface MockDataConfig {
  useCustomData?: boolean
  customDataPath?: string
  fallbackToDefault?: boolean
}

export class CustomMockDataLoader {
  private config: MockDataConfig
  private customDataPath: string
  private defaultReader: (filename: string) => any

  constructor(config: MockDataConfig = {}) {
    this.config = {
      useCustomData: false,
      fallbackToDefault: true,
      ...config,
    }

    this.customDataPath =
      config.customDataPath || path.resolve(__dirname, 'mockdata')
    // Use the existing shared mock reader for default data
    this.defaultReader = createReadJSONFile({})
  }

  /**
   * Load mock data for a specific file, with fallback to default data
   */
  async loadMockData(filename: string): Promise<any> {
    // Try custom data first if enabled
    if (this.config.useCustomData) {
      const customData = await this.loadCustomData(filename)
      if (customData !== null) {
        return customData
      }
    }

    // Fallback to default data
    if (this.config.fallbackToDefault) {
      return this.defaultReader(filename)
    }

    throw new Error(`No mock data found for ${filename}`)
  }

  /**
   * Load custom mock data from __tests__/mockdata directory
   */
  private async loadCustomData(filename: string): Promise<any | null> {
    try {
      const filePath = path.join(this.customDataPath, filename)

      if (!fs.existsSync(filePath)) {
        return null
      }

      const content = fs.readFileSync(filePath, 'utf8')
      return JSON.parse(content)
    } catch (error) {
      console.warn(`Failed to load custom mock data for ${filename}:`, error)
      return null
    }
  }

  /**
   * Load all mock data files in parallel
   */
  async loadAllMockData(): Promise<{
    usersData: any
    tierLevelsData: any
    accountTypesData: any
    accountsData: any
    creditCardsData: any
    beneficiariesData: any
    zelleContactsData: any
    billersData: any
    userBillersData: any
    billsData: any
    transactionTypesData: any
    transactionsData: any
    scheduledTransactionsData: any
    notificationsData: any
  }> {
    const [
      usersData,
      tierLevelsData,
      accountTypesData,
      accountsData,
      creditCardsData,
      beneficiariesData,
      zelleContactsData,
      billersData,
      userBillersData,
      billsData,
      transactionTypesData,
      transactionsData,
      scheduledTransactionsData,
      notificationsData,
    ] = await Promise.all([
      this.loadMockData('mock-users.json'),
      this.loadMockData('mock-account_tier_levels.json'),
      this.loadMockData('mock-account_types.json'),
      this.loadMockData('mock-accounts.json'),
      this.loadMockData('mock-credit_cards.json'),
      this.loadMockData('mock-beneficiaries.json'),
      this.loadMockData('mock-zelle_contacts.json'),
      this.loadMockData('mock-billers.json'),
      this.loadMockData('mock-user_billers.json'),
      this.loadMockData('mock-bills.json'),
      this.loadMockData('mock-transaction_types.json'),
      this.loadMockData('mock-transactions.json'),
      this.loadMockData('mock-scheduled_transactions.json'),
      this.loadMockData('mock-notifications.json'),
    ])

    return {
      usersData,
      tierLevelsData,
      accountTypesData,
      accountsData,
      creditCardsData,
      beneficiariesData,
      zelleContactsData,
      billersData,
      userBillersData,
      billsData,
      transactionTypesData,
      transactionsData,
      scheduledTransactionsData,
      notificationsData,
    }
  }

  /**
   * Check if custom mock data directory exists
   */
  hasCustomData(): boolean {
    return fs.existsSync(this.customDataPath)
  }

  /**
   * List available custom mock data files
   */
  listCustomDataFiles(): string[] {
    if (!this.hasCustomData()) {
      return []
    }

    try {
      return fs
        .readdirSync(this.customDataPath)
        .filter(file => file.endsWith('.json'))
    } catch (error) {
      console.warn('Failed to list custom data files:', error)
      return []
    }
  }
}

/**
 * Factory function to create mock data loader with common configurations
 */
export function createMockDataLoader(
  config: MockDataConfig = {},
): CustomMockDataLoader {
  return new CustomMockDataLoader(config)
}

/**
 * Pre-configured loaders for common scenarios
 */
export const MockDataLoaders = {
  /**
   * Use only default mock data from src/data
   */
  defaultOnly: () =>
    createMockDataLoader({
      useCustomData: false,
      fallbackToDefault: true,
    }),

  /**
   * Use only custom mock data from __tests__/mockdata
   */
  customOnly: (customDataPath?: string) =>
    createMockDataLoader({
      useCustomData: true,
      customDataPath,
      fallbackToDefault: false,
    }),

  /**
   * Use custom data with fallback to default
   */
  customWithFallback: (customDataPath?: string) =>
    createMockDataLoader({
      useCustomData: true,
      customDataPath,
      fallbackToDefault: true,
    }),

  /**
   * Auto-detect: use custom if available, otherwise default
   */
  autoDetect: (customDataPath?: string) => {
    const loader = createMockDataLoader({
      useCustomData: true,
      customDataPath,
      fallbackToDefault: true,
    })

    // If no custom data directory exists, use default only
    if (!loader.hasCustomData()) {
      return MockDataLoaders.defaultOnly()
    }

    return loader
  },
}
