import { render } from "@react-email/components"
import type { ReactElement } from "react"

export type RenderedEmail = { subject: string; html: string; text: string }

/** Renders a React Email template to HTML and to its plain-text version. */
export async function renderEmail(
  subject: string,
  element: ReactElement
): Promise<RenderedEmail> {
  const [html, text] = await Promise.all([
    render(element),
    render(element, { plainText: true }),
  ])
  return { subject, html, text }
}
