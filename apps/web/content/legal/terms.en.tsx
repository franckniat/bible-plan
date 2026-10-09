import { ContactLink } from "@/components/legal/contact-link"
import { Link } from "@/i18n/navigation"
import { sourceCodeUrl } from "@/lib/site"

export function TermsEn() {
  return (
    <>
      <p>
        These terms apply to the Bible Plan website while the app is being
        prepared. By using it, you accept them.
      </p>

      <h2>The service</h2>
      <p>
        Bible Plan is a free app, under development, to build a Bible reading
        plan that fits your pace and receive reading, prayer and meditation
        reminders. For now, this site presents the project and offers a
        waitlist.
      </p>

      <h2>Waitlist</h2>
      <ul>
        <li>Signing up is free and optional.</li>
        <li>Only sign up with your own email address and accurate details.</li>
        <li>
          You can ask to be removed at any time (see the{" "}
          <Link href="/privacy">privacy policy</Link>).
        </li>
      </ul>

      <h2>No launch date commitment</h2>
      <p>
        We do our best to launch Bible Plan soon, but no date is guaranteed, and
        the announced features may change before launch.
      </p>

      <h2>Intellectual property</h2>
      <ul>
        <li>
          Bible Plan’s code is free software, released under the GNU AGPL-3.0
          license:{" "}
          <a href={sourceCodeUrl} target="_blank" rel="noopener noreferrer">
            source code
          </a>
          .
        </li>
        <li>
          The “Bible Plan” name and logo are not covered by this license (
          <a
            href={`${sourceCodeUrl}/blob/main/TRADEMARKS.md`}
            target="_blank"
            rel="noopener noreferrer"
          >
            trademark policy
          </a>
          ).
        </li>
        <li>
          The Bible texts offered (Louis Segond 1910, King James) are in the
          public domain.
        </li>
      </ul>

      <h2>Liability</h2>
      <p>
        The site is provided “as is”, with no guarantee of continuous
        availability. We cannot be held liable for an interruption or an error,
        within the limits set by law.
      </p>

      <h2>Changes</h2>
      <p>
        These terms will be completed when the app launches. The date of the
        last update is shown at the top of this page.
      </p>

      <h2>Contact</h2>
      <p>
        A question? <ContactLink />
      </p>
    </>
  )
}
