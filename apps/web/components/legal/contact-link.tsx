import { contactEmail, maintainerUrl } from "@/lib/site"

/** Where to send privacy requests: the contact address, or the maintainer. */
export function ContactLink() {
  if (contactEmail) {
    return <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
  }
  return (
    <a href={maintainerUrl} target="_blank" rel="noopener noreferrer">
      github.com/franckniat
    </a>
  )
}
