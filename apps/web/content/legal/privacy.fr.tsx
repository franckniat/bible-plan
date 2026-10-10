import { ContactLink } from "@/components/legal/contact-link"
import { Link } from "@/i18n/navigation"

export function PrivacyFr() {
  return (
    <>
      <p>
        Bible Plan est une application gratuite et open source, en cours de
        préparation, pour lire la Bible à son rythme. Avant son lancement, ce
        site présente le projet et permet de s’inscrire sur une liste d’attente.
        Cette page explique quelles données nous collectons, pourquoi et comment
        vous gardez la main dessus.
      </p>

      <h2>Données collectées</h2>
      <p>
        Lorsque vous vous inscrivez sur la liste d’attente, nous enregistrons :
      </p>
      <ul>
        <li>
          <strong>votre adresse email</strong> (obligatoire) ;
        </li>
        <li>
          <strong>votre prénom, votre pays et vos centres d’intérêt</strong>,
          seulement si vous les indiquez ;
        </li>
        <li>la langue du site et la date de votre consentement ;</li>
        <li>
          une <strong>empreinte chiffrée de votre adresse IP</strong>, qui sert
          uniquement à limiter les inscriptions abusives. L’adresse IP elle-même
          n’est jamais enregistrée.
        </li>
      </ul>

      <h2>Pourquoi nous les utilisons</h2>
      <ul>
        <li>vous prévenir par email du lancement de Bible Plan ;</li>
        <li>
          comprendre, de façon globale et anonyme, ce qui intéresse les inscrits
          et d’où ils viennent, pour décider des priorités ;
        </li>
        <li>protéger le formulaire contre le spam.</li>
      </ul>
      <p>
        Vos données ne sont{" "}
        <strong>
          ni vendues, ni louées, ni utilisées pour de la publicité
        </strong>
        .
      </p>

      <h2>Base légale</h2>
      <p>
        Votre consentement, que vous donnez en cochant la case du formulaire.
        Vous pouvez le retirer à tout moment.
      </p>

      <h2>Durée de conservation</h2>
      <p>
        Vos données sont conservées jusqu’au lancement de l’application, puis au
        plus 12 mois après celui-ci, sauf si vous créez un compte ou demandez
        leur suppression avant.
      </p>

      <h2>Qui y a accès</h2>
      <p>
        Uniquement l’équipe du projet, et les prestataires techniques
        nécessaires au fonctionnement du site :
      </p>
      <ul>
        <li>Vercel (hébergement du site) ;</li>
        <li>Neon (base de données, hébergée dans l’Union européenne) ;</li>
        <li>Resend (envoi de l’email de lancement).</li>
      </ul>
      <p>
        Certains de ces prestataires peuvent traiter des données en dehors de
        l’Union européenne ; ils s’appuient alors sur des garanties appropriées
        (clauses contractuelles types de la Commission européenne).
      </p>

      <h2>Cookies</h2>
      <p>
        Ce site n’utilise aucun cookie publicitaire ni de mesure d’audience. Un
        cookie technique (<code>NEXT_LOCALE</code>) mémorise la langue que vous
        avez choisie, et votre préférence de thème clair ou sombre est
        enregistrée dans votre navigateur.
      </p>

      <h2>Vos droits</h2>
      <p>
        Vous pouvez à tout moment demander l’accès à vos données, leur
        correction, leur suppression (et donc votre retrait de la liste
        d’attente), ou retirer votre consentement. Contactez le responsable du
        projet (<ContactLink />) en indiquant l’adresse email inscrite. Nous
        répondons sous un mois.
      </p>
      <p>
        Si vous estimez que vos droits ne sont pas respectés, vous pouvez vous
        adresser à l’autorité de protection des données de votre pays (par
        exemple la CNIL en France).
      </p>

      <h2>Mineurs</h2>
      <p>
        Si vous avez moins de 15 ans, demandez l’accord d’un parent avant de
        vous inscrire.
      </p>

      <h2>Modifications</h2>
      <p>
        Cette politique évoluera avec l’application (comptes, plans de lecture,
        journal de prière…). La date de mise à jour figure en haut de la page.
        Voir aussi les <Link href="/terms">conditions d’utilisation</Link>.
      </p>
    </>
  )
}
