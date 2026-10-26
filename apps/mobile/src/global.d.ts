import type { Locale } from "@workspace/core"
import type { Messages } from "@workspace/i18n"

declare module "use-intl" {
  interface AppConfig {
    Locale: Locale
    Messages: Messages
  }
}
