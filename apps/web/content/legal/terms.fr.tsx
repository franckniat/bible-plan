import { ContactLink } from "@/components/legal/contact-link"
import { Link } from "@/i18n/navigation"
import { sourceCodeUrl } from "@/lib/site"

export function TermsFr() {
  return (
    <>
      <p>
        Ces conditions s’appliquent au site de Bible Plan pendant la préparation
        de l’application. En l’utilisant, vous les acceptez.
      </p>

      <h2>Le service</h2>
      <p>
        Bible Plan est une application gratuite, en cours de développement, pour
        créer un plan de lecture de la Bible adapté à son rythme et recevoir des
        rappels de lecture, de prière et de méditation. Pour l’instant, ce site
        présente le projet et propose une liste d’attente.
      </p>

      <h2>Liste d’attente</h2>
      <ul>
        <li>L’inscription est gratuite et facultative.</li>
        <li>
          Inscrivez uniquement votre propre adresse email, avec des informations
          exactes.
        </li>
        <li>
          Vous pouvez demander votre retrait à tout moment (voir la{" "}
          <Link href="/privacy">politique de confidentialité</Link>).
        </li>
      </ul>

      <h2>Pas d’engagement de date</h2>
      <p>
        Nous faisons de notre mieux pour lancer Bible Plan rapidement, mais
        aucune date n’est garantie, et les fonctionnalités annoncées peuvent
        évoluer d’ici le lancement.
      </p>

      <h2>Propriété intellectuelle</h2>
      <ul>
        <li>
          Le code de Bible Plan est un logiciel libre, publié sous licence GNU
          AGPL-3.0 :{" "}
          <a href={sourceCodeUrl} target="_blank" rel="noopener noreferrer">
            code source
          </a>
          .
        </li>
        <li>
          Le nom « Bible Plan » et son logo ne sont pas couverts par cette
          licence (
          <a
            href={`${sourceCodeUrl}/blob/main/TRADEMARKS.md`}
            target="_blank"
            rel="noopener noreferrer"
          >
            politique de marque
          </a>
          ).
        </li>
        <li>
          Les textes bibliques proposés (Louis Segond 1910, King James) sont
          dans le domaine public.
        </li>
      </ul>

      <h2>Responsabilité</h2>
      <p>
        Le site est fourni « en l’état », sans garantie de disponibilité
        continue. Nous ne pourrons être tenus responsables d’une interruption ou
        d’une erreur, dans les limites prévues par la loi.
      </p>

      <h2>Modifications</h2>
      <p>
        Ces conditions seront complétées au lancement de l’application. La date
        de mise à jour figure en haut de la page.
      </p>

      <h2>Contact</h2>
      <p>
        Une question ? <ContactLink />
      </p>
    </>
  )
}
