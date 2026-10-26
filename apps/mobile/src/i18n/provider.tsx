import type { Locale } from "@workspace/core"
import type { Messages } from "@workspace/i18n"
import en from "@workspace/i18n/messages/en"
import fr from "@workspace/i18n/messages/fr"
import type { ReactNode } from "react"
import { IntlProvider } from "use-intl"

import { phoneLocale } from "./locale"

// Both languages are bundled: they are small and the app works offline.
const messages: Record<Locale, Messages> = { fr, en }

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = phoneLocale()
  return (
    <IntlProvider
      locale={locale}
      messages={messages[locale]}
      timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone}
    >
      {children}
    </IntlProvider>
  )
}
