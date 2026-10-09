import { defineRouting } from "next-intl/routing"

import { defaultLocale, locales } from "@workspace/core"

export const routing = defineRouting({ locales, defaultLocale })
