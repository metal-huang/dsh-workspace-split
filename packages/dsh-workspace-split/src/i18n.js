import CHINESE from './messages.js'
import EN from './locale/en.json'
import { detectLanguage } from './language.js'

export { detectLanguage, languageTagToLocale } from './language.js'

/**
 * Get translation key with interpolation.
 * @param {string} key - Translation key
 * @param {object} vars - Interpolation variables
 * @returns {string} Translated string
 */
export function t(key, vars = {}) {
  const lang = detectLanguage()
  const source = lang === 'en' ? EN : CHINESE
  let msg = source[key] || `[missing:${key}]`

  // Interpolation: {{key}} -> value. Any non-nullish value works, because some
  // placeholders carry text (a session title) and not only numbers.
  msg = String(msg).replace(/\{\{(\w+)\}\}/g, (_, k) => {
    const v = vars[k]
    return v === undefined || v === null ? '' : String(v)
  })

  return msg
}

// Export for testing and fallback usage
export { CHINESE, EN }
