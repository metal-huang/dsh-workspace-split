/** Map a locale tag to the two dictionaries this plugin carries. */
export function languageTagToLocale(language) {
  return /^zh(?:[-_]|$)/i.test(language ?? '') ? 'zh-CN' : 'en'
}

function hostLanguageOf(hostDocument) {
  return hostDocument?.documentElement?.lang ?? ''
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
 * Follow the Host document language before the browser preference. Chinese
 * browsers keep Chinese; unsupported or absent languages fall back to English.
 * Optional arguments let the regression tests supply both sides directly.
 */
export function detectLanguage(
  hostDocument = globalThis.document,
  browserNavigator = globalThis.navigator,
) {
  return languageTagToLocale(hostLanguageOf(hostDocument) || browserLanguageOf(browserNavigator))
}
