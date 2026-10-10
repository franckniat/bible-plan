import { maintainerUrl } from "@/lib/site"

/** Contact point for questions and data requests: the project maintainer. */
export function ContactLink() {
  return (
    <a href={maintainerUrl} target="_blank" rel="noopener noreferrer">
      github.com/franckniat
    </a>
  )
}
