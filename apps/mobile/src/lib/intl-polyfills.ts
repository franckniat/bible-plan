// Hermes, the app's JavaScript engine, has no Intl.PluralRules (nor
// Intl.Locale, which it needs): without them every text with a plural ("#
// jours") fails. These polyfills add them only where they are missing, with
// the app's two languages. Imported first, by the root layout.
import "@formatjs/intl-getcanonicallocales/polyfill.js"
import "@formatjs/intl-locale/polyfill.js"
import "@formatjs/intl-pluralrules/polyfill.js"
import "@formatjs/intl-pluralrules/locale-data/en.js"
import "@formatjs/intl-pluralrules/locale-data/fr.js"
