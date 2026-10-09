import {
  getLegalMetadata,
  LegalRoute,
  type LegalDocument,
} from "@/components/legal/legal-route"
import { PrivacyEn } from "@/content/legal/privacy.en"
import { PrivacyFr } from "@/content/legal/privacy.fr"

const privacy: LegalDocument = {
  kind: "privacy",
  updatedAt: new Date("2026-10-10T00:00:00Z"),
  content: { fr: PrivacyFr, en: PrivacyEn },
}

export function generateMetadata(props: PageProps<"/[locale]/privacy">) {
  return getLegalMetadata(privacy, props)
}

export default function PrivacyPage(props: PageProps<"/[locale]/privacy">) {
  return <LegalRoute document={privacy} {...props} />
}
