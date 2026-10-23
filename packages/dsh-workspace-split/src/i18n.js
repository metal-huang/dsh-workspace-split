import CHINESE from './messages.js'
import EN from './locale/en.json'

/**
 * Language detection priority:
 * 1. Host-provided language (future extension)
 * 2. navigator.language / navigator.languages[0]
 * 3. Default: zh-CN
 */
export function detectLanguage() {
  if (typeof navigator !== 'undefined') {
    const lang = navigator.language || navigator.userLanguage
    // DSH default is Chinese, but we support English as override
    return lang.startsWith('en') ? 'en' : 'zh-CN'
  }
  return 'zh-CN'
}

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

  // Simple interpolation: {{key}} -> value
  msg = String(msg).replace(/\{\{(\w+)\}\}/g, (_, k) => {
    const v = vars[k]
    return typeof v === 'number' ? v.toString() : ''
  })

  return msg
}

// Export for testing and fallback usage
export { CHINESE, EN }
