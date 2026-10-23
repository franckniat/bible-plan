import { ContactLink } from "@/components/legal/contact-link"
import { Link } from "@/i18n/navigation"
import { sourceCodeUrl } from "@/lib/site"

export function TermsEn() {
  return (
    <>
      <p>
        Bible Plan is a free service to read the Bible at your own pace. By
        using it, you accept these terms. They are written to be read: if
        something is unclear, write to us (<ContactLink />
        ).
      </p>

      <h2>The service</h2>
      <p>
        Bible Plan offers Bible reading in several translations, reading plans,
        reminders, a prayer journal, a meditation and prayer timer, personal
        statistics and groups to move forward together. Reading and sharing a
        verse do not need an account; the rest does.
      </p>
      <p>
        The service is free and provided as is, by an independent project. We do
        our best to keep it available and reliable, but we cannot guarantee it:
        it may be interrupted, changed or stopped, and data can be lost despite
        our precautions. Keep a copy of what matters to you.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>
          The information you give must be accurate, and the email address must
          be yours.
        </li>
        <li>
          You are responsible for access to your account: keep your password to
          yourself and tell us if you think it has been discovered.
        </li>
        <li>
          If you are under 15, ask a parent or guardian for permission before
          creating an account.
        </li>
        <li>
          You can stop using Bible Plan whenever you wish, and ask for your
          account to be deleted (see the{" "}
          <Link href="/privacy">privacy policy</Link>).
        </li>
      </ul>

      <h2>Groups</h2>
      <p>
        Groups are a space of trust between their members. When you write in a
        group (comments, shared prayer requests), the other members see it.
        Please:
      </p>
      <ul>
        <li>
          stay respectful: no insults, harassment, or mocking of other people’s
          faith or convictions;
        </li>
        <li>
          do not publish private information about another person (full name,
          health, situation) without their consent: a prayer request shares a
          situation, not someone’s identity;
        </li>
        <li>
          do not post anything illegal, hateful, violent or sexually explicit,
          nor advertising or spam.
        </li>
      </ul>
      <p>
        People who manage a group can remove a member or delete a comment. We
        may remove content or suspend an account that breaks these rules or puts
        other people at risk.
      </p>

      <h2>Your content</h2>
      <p>
        What you write (prayer journal, notes, comments, names of plans or
        groups) <strong>stays yours</strong>. You only give us the right to
        store it and to show it to the people you chose (only you, or the
        members of a group), to run the service. We do nothing else with it. You
        guarantee that you have the right to publish what you publish.
      </p>

      <h2>Acceptable use</h2>
      <p>It is forbidden to:</p>
      <ul>
        <li>
          disrupt the service, try to access other people’s data or get around
          the protections (limits, authentication);
        </li>
        <li>
          use automated means (bots, mass scraping) to collect content or
          create accounts in bulk;
        </li>
        <li>impersonate someone else.</li>
      </ul>

      <h2>Reminders and notifications</h2>
      <p>
        Reminders are sent on a best-effort basis, at the times and with the
        settings you chose. They also depend on your device and browser: we do
        not guarantee that they arrive on time, or at all. Do not rely on them
        for anything essential.
      </p>

      <h2>Bible texts</h2>
      <p>
        Bible texts belong to their publishers and are subject to their own
        licences. Some translations are in the public domain; others are
        provided by YouVersion or other sources and may only be used within the
        service. Do not copy these texts in bulk outside Bible Plan. Quoting a
        few verses remains possible, of course, with the reference and the
        translation.
      </p>

      <h2>Source code and trademark</h2>
      <p>
        Bible Plan’s code is open source, under the{" "}
        <a
          href="https://www.gnu.org/licenses/agpl-3.0.html"
          target="_blank"
          rel="noreferrer"
        >
          AGPL v3
        </a>{" "}
        licence: you can read, use and modify it under that licence, and it is
        available on{" "}
        <a href={sourceCodeUrl} target="_blank" rel="noreferrer">
          GitHub
        </a>
        . The name “Bible Plan” and its logo are not covered by that licence:
        their use is set out in{" "}
        <a
          href={`${sourceCodeUrl}/blob/main/TRADEMARKS.md`}
          target="_blank"
          rel="noreferrer"
        >
          the trademark policy
        </a>
        .
      </p>

      <h2>Liability</h2>
      <p>
        Bible Plan is a reading and support tool. It does not replace spiritual
        guidance, nor medical, legal or psychological advice. To the extent
        permitted by law, we are not liable for indirect damage linked to using
        the service, nor for what other members of a group write. These limits
        do not remove the rights the law gives you as a consumer.
      </p>

      <h2>Changes and end of the service</h2>
      <p>
        We may change these terms and the service. The date of the last update
        is shown at the top of this page, and an important change will be flagged
        in the app. Continuing to use Bible Plan after a change means you accept
        it; otherwise, you can close your account. If the service were to stop,
        we would tell you in advance so you could retrieve your data.
      </p>

      <h2>Contact</h2>
      <p>
        A question, a report, content to remove: <ContactLink />. See also the{" "}
        <Link href="/privacy">privacy policy</Link>.
      </p>
    </>
  )
}
