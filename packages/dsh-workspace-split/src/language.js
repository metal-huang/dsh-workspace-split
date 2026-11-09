/** Map a locale tag to the two dictionaries this plugin carries. */
export function languageTagToLocale(language) {
  return /^zh(?:[-_]|$)/i.test(language ?? '') ? 'zh-CN' : 'en'
}

function hostLanguageOf(hostDocument) {
  return hostDocument?.documentElement?.lang ?? ''
}

/** Whether this tag selects a dictionary we actually ship, not just English. */
export function isSupportedLanguage(language) {
  return /^(?:zh|en)(?:[-_]|$)/i.test(language ?? '')
}

function browserLanguageOf(browserNavigator) {
  if (!browserNavigator) return ''
  return (
    browserNavigator.language ||
    browserNavigator.languages?.[0] ||
    browserNavigator.userLanguage ||
    ''
  )
}

/**
 * Prefer a supported Host language, then a supported browser language, then
 * English. An unsupported Host must not hide a usable browser translation.
 * Optional arguments let the regression tests supply both sides directly.
 */
export function detectLanguage(
  hostDocument = globalThis.document,
  browserNavigator = globalThis.navigator,
) {
  const hostLanguage = hostLanguageOf(hostDocument)
  if (isSupportedLanguage(hostLanguage)) return languageTagToLocale(hostLanguage)
  return languageTagToLocale(browserLanguageOf(browserNavigator))
}
