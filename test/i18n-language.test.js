import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  detectLanguage,
  languageTagToLocale,
} from '../packages/dsh-workspace-split/src/language.js'

const browser = (language, languages) => ({ language, languages })

describe('languageTagToLocale', () => {
  it('keeps explicit Chinese tags and falls back to English otherwise', () => {
    for (const tag of ['zh', 'zh-CN', 'zh_CN', 'zh-Hans-CN']) {
      assert.equal(languageTagToLocale(tag), 'zh-CN')
    }
    for (const tag of ['en', 'en-US', 'ru-RU', 'fr-FR', '', undefined]) {
      assert.equal(languageTagToLocale(tag), 'en')
    }
  })
})

describe('detectLanguage', () => {
  it('uses the Host document language before a Russian browser', () => {
    const doc = { documentElement: { lang: 'en' } }
    assert.equal(detectLanguage(doc, browser('ru-RU')), 'en')
  })

  it('keeps Chinese when the Host is Chinese and the browser is English or Russian', () => {
    const doc = { documentElement: { lang: 'zh-CN' } }
    assert.equal(detectLanguage(doc, browser('en-US')), 'zh-CN')
    assert.equal(detectLanguage(doc, browser('ru-RU')), 'zh-CN')
  })

  it('prefers an unsupported Host language over a Chinese browser', () => {
    const doc = { documentElement: { lang: 'fr-FR' } }
    assert.equal(detectLanguage(doc, browser('zh-CN')), 'en')
  })

  it('uses the browser only when the Host has no language', () => {
    assert.equal(detectLanguage(undefined, browser('zh-CN')), 'zh-CN')
    assert.equal(detectLanguage({ documentElement: { lang: '' } }, browser('ru-RU')), 'en')
    assert.equal(detectLanguage({ documentElement: {} }, browser(undefined, ['zh-CN'])), 'zh-CN')
  })

  it('falls back to English when neither side supplies a language', () => {
    assert.equal(detectLanguage(null, null), 'en')
    assert.equal(detectLanguage({ documentElement: {} }, {}), 'en')
  })

  it('reads a changed Host language on the next lookup instead of caching it', () => {
    const doc = { documentElement: { lang: 'en' } }
    assert.equal(detectLanguage(doc, browser('en-US')), 'en')
    doc.documentElement.lang = 'zh-CN'
    assert.equal(detectLanguage(doc, browser('en-US')), 'zh-CN')
  })
})
