import { ContactLink } from "@/components/legal/contact-link"
import { Link } from "@/i18n/navigation"

export function PrivacyEn() {
  return (
    <>
      <p>
        Bible Plan is a free and open source app, still in preparation, to read
        the Bible at your own pace. Until it launches, this site presents the
        project and lets you join a waitlist. This page explains which data we
        collect, why, and how you stay in control of it.
      </p>

      <h2>Data we collect</h2>
      <p>When you join the waitlist, we record:</p>
      <ul>
        <li>
          <strong>your email address</strong> (required);
        </li>
        <li>
          <strong>your first name, country and interests</strong>, only if you
          provide them;
        </li>
        <li>the language of the site and the date of your consent;</li>
        <li>
          an <strong>encrypted fingerprint of your IP address</strong>, used
          only to limit abusive signups. The IP address itself is never stored.
        </li>
      </ul>

      <h2>Why we use it</h2>
      <ul>
        <li>to let you know by email when Bible Plan launches;</li>
        <li>
          to understand, in an aggregated and anonymous way, what people on the
          waitlist are interested in and where they come from, to set
          priorities;
        </li>
        <li>to protect the form against spam.</li>
      </ul>
      <p>
        Your data is <strong>never sold, rented or used for advertising</strong>
        .
      </p>

      <h2>Legal basis</h2>
      <p>
        Your consent, which you give by ticking the box in the form. You can
        withdraw it at any time.
      </p>

      <h2>Retention</h2>
      <p>
        Your data is kept until the app launches, then for at most 12 months
        after that, unless you create an account or ask us to delete it earlier.
      </p>

      <h2>Who can access it</h2>
      <p>
        Only the project team, and the technical providers the site needs to
        work:
      </p>
      <ul>
        <li>Vercel (website hosting);</li>
        <li>Neon (database, hosted in the European Union);</li>
        <li>Resend (sending the launch email).</li>
      </ul>
      <p>
        Some of these providers may process data outside the European Union;
        they then rely on appropriate safeguards (the European Commission’s
        standard contractual clauses).
      </p>

      <h2>Cookies</h2>
      <p>
        This site uses no advertising or audience measurement cookies. A
        technical cookie (<code>NEXT_LOCALE</code>) remembers the language you
        chose, and your light or dark theme preference is stored in your
        browser.
      </p>

      <h2>Your rights</h2>
      <p>
        At any time, you can ask to access, correct or delete your data (and so
        be removed from the waitlist), or withdraw your consent. Write to us
        from the email address you signed up with: <ContactLink />. We reply
        within one month.
      </p>
      <p>
        If you believe your rights are not respected, you can contact the data
        protection authority of your country.
      </p>

      <h2>Children</h2>
      <p>If you are under 15, ask a parent for permission before signing up.</p>

      <h2>Changes</h2>
      <p>
        This policy will evolve with the app (accounts, reading plans, prayer
        journal…). The date of the last update is shown at the top of this page.
        See also the <Link href="/terms">terms of use</Link>.
      </p>
    </>
  )
}
