import { I18n } from 'i18n-js'
import type { TOptions } from 'i18next'

import en from './en'
import es from './es'
import hi from './hi'

export type { Translations } from './en'

/**
 * Builds up valid keypaths for translations.
 */
export type TxKeyPath = RecursiveKeyOf<typeof en>

// via: https://stackoverflow.com/a/65333050
type RecursiveKeyOf<TObj extends object> = {
  [TKey in keyof TObj & (string | number)]: TObj[TKey] extends object
    ? `${TKey}` | `${TKey}.${RecursiveKeyOf<TObj[TKey]>}`
    : `${TKey}`
}[keyof TObj & (string | number)]

export const i18n = new I18n({
  'en-US': en,
  'es-ES': es,
  'hi-IN': hi,
})

// Set the default locale
i18n.defaultLocale = 'en-US'
i18n.locale = 'en-US'

// Enable fallback to default locale
i18n.enableFallback = true

export function translate(key: TxKeyPath, options?: TOptions): string {
  return i18n.t(key, options)
}
