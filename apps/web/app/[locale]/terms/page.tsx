import {
  getLegalMetadata,
  LegalRoute,
  type LegalDocument,
} from "@/components/legal/legal-route"
import { TermsEn } from "@/content/legal/terms.en"
import { TermsFr } from "@/content/legal/terms.fr"

const terms: LegalDocument = {
  kind: "terms",
  updatedAt: new Date("2026-10-10T00:00:00Z"),
  content: { fr: TermsFr, en: TermsEn },
}

export function generateMetadata(props: PageProps<"/[locale]/terms">) {
  return getLegalMetadata(terms, props)
}

export default function TermsPage(props: PageProps<"/[locale]/terms">) {
  return <LegalRoute document={terms} {...props} />
}
