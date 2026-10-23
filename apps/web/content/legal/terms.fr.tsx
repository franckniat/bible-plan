import { ContactLink } from "@/components/legal/contact-link"
import { Link } from "@/i18n/navigation"
import { sourceCodeUrl } from "@/lib/site"

export function TermsFr() {
  return (
    <>
      <p>
        Bible Plan est un service gratuit pour lire la Bible à son rythme. En
        l’utilisant, vous acceptez ces conditions. Elles sont écrites pour être
        lues : si quelque chose n’est pas clair, écrivez-nous (<ContactLink />
        ).
      </p>

      <h2>Le service</h2>
      <p>
        Bible Plan propose la lecture de la Bible dans plusieurs traductions,
        des plans de lecture, des rappels, un journal de prière, un minuteur de
        méditation et de prière, des statistiques personnelles et des groupes
        pour avancer ensemble. La lecture et le partage d’un verset ne
        demandent pas de compte ; le reste demande d’en créer un.
      </p>
      <p>
        Le service est gratuit et proposé tel quel, par un projet indépendant.
        Nous faisons de notre mieux pour qu’il soit disponible et fiable, mais
        nous ne pouvons pas le garantir : il peut être interrompu, modifié ou
        arrêté, et des données peuvent être perdues malgré nos précautions.
        Gardez une copie de ce qui compte pour vous.
      </p>

      <h2>Votre compte</h2>
      <ul>
        <li>
          Les informations que vous donnez doivent être exactes, et l’adresse
          email doit être la vôtre.
        </li>
        <li>
          Vous êtes responsable de l’accès à votre compte : gardez votre mot de
          passe pour vous et prévenez-nous si vous pensez qu’il a été
          découvert.
        </li>
        <li>
          Si vous avez moins de 15 ans, demandez l’accord d’un parent ou d’un
          responsable avant de créer un compte.
        </li>
        <li>
          Vous pouvez arrêter d’utiliser Bible Plan quand vous le souhaitez, et
          demander la suppression de votre compte (voir la{" "}
          <Link href="/privacy">politique de confidentialité</Link>).
        </li>
      </ul>

      <h2>Les groupes</h2>
      <p>
        Les groupes sont un espace de confiance entre leurs membres. Quand vous
        écrivez dans un groupe (commentaires, sujets de prière partagés), les
        autres membres le voient. Merci de :
      </p>
      <ul>
        <li>
          rester respectueux : pas d’insultes, de harcèlement, de moqueries sur
          la foi ou les convictions des autres ;
        </li>
        <li>
          ne pas publier d’informations privées sur une autre personne (nom
          complet, santé, situation) sans son accord : un sujet de prière
          partage une situation, pas l’identité de quelqu’un ;
        </li>
        <li>
          ne rien publier d’illégal, de haineux, de violent ou de sexuellement
          explicite, ni de publicité ou de spam.
        </li>
      </ul>
      <p>
        Les personnes qui gèrent un groupe peuvent en retirer un membre ou
        supprimer un commentaire. Nous pouvons supprimer un contenu ou
        suspendre un compte qui enfreint ces règles ou met d’autres personnes
        en danger.
      </p>

      <h2>Votre contenu</h2>
      <p>
        Ce que vous écrivez (journal de prière, notes, commentaires, noms de
        plans ou de groupes) <strong>reste à vous</strong>. Vous nous donnez
        seulement le droit de le conserver et de l’afficher aux personnes que
        vous avez choisies (vous seul, ou les membres d’un groupe), pour faire
        fonctionner le service. Nous n’en faisons rien d’autre. Vous garantissez
        que vous avez le droit de publier ce que vous publiez.
      </p>

      <h2>Usage acceptable</h2>
      <p>Il est interdit de :</p>
      <ul>
        <li>
          perturber le service, tenter d’accéder aux données d’autres personnes
          ou contourner les protections (limites, authentification) ;
        </li>
        <li>
          utiliser des moyens automatisés (robots, aspiration massive) pour
          récupérer le contenu ou créer des comptes en masse ;
        </li>
        <li>usurper l’identité de quelqu’un d’autre.</li>
      </ul>

      <h2>Rappels et notifications</h2>
      <p>
        Les rappels sont envoyés au mieux, selon les heures et les réglages que
        vous avez choisis. Ils dépendent aussi de votre appareil et de votre
        navigateur : nous ne garantissons pas qu’ils arrivent à l’heure, ni
        qu’ils arrivent. Ne comptez pas dessus pour quelque chose d’essentiel.
      </p>

      <h2>Textes bibliques</h2>
      <p>
        Les textes de la Bible appartiennent à leurs éditeurs et sont soumis à
        leurs propres licences. Certaines traductions sont dans le domaine
        public ; d’autres sont fournies par YouVersion ou par d’autres sources
        et ne peuvent être utilisées que dans le cadre du service. Ne copiez pas
        en masse ces textes hors de Bible Plan. Citer quelques versets reste
        bien sûr possible, avec la référence et la traduction.
      </p>

      <h2>Code source et marque</h2>
      <p>
        Le code de Bible Plan est open source, sous licence{" "}
        <a
          href="https://www.gnu.org/licenses/agpl-3.0.html"
          target="_blank"
          rel="noreferrer"
        >
          AGPL v3
        </a>{" "}
        : vous pouvez le lire, l’utiliser et le modifier selon cette licence, et
        il est disponible sur{" "}
        <a href={sourceCodeUrl} target="_blank" rel="noreferrer">
          GitHub
        </a>
        . Le nom « Bible Plan » et son logo ne sont pas couverts par cette
        licence : leur usage est précisé dans{" "}
        <a
          href={`${sourceCodeUrl}/blob/main/TRADEMARKS.md`}
          target="_blank"
          rel="noreferrer"
        >
          la politique de marque
        </a>
        .
      </p>

      <h2>Responsabilité</h2>
      <p>
        Bible Plan est un outil de lecture et d’accompagnement. Il ne remplace
        ni un accompagnement spirituel, ni un conseil médical, juridique ou
        psychologique. Dans la mesure permise par la loi, nous ne sommes pas
        responsables des dommages indirects liés à l’usage du service, ni de ce
        que les autres membres d’un groupe écrivent. Ces limites ne retirent
        pas les droits que la loi vous reconnaît en tant que consommateur.
      </p>

      <h2>Modifications et fin du service</h2>
      <p>
        Nous pouvons faire évoluer ces conditions et le service. La date de
        mise à jour figure en haut de la page, et un changement important vous
        sera signalé dans l’application. Continuer à utiliser Bible Plan après
        un changement vaut acceptation ; sinon, vous pouvez fermer votre
        compte. Si le service devait s’arrêter, nous vous préviendrions à
        l’avance pour que vous puissiez récupérer vos données.
      </p>

      <h2>Contact</h2>
      <p>
        Une question, un signalement, un contenu à retirer : <ContactLink />.
        Voir aussi la <Link href="/privacy">politique de confidentialité</Link>.
      </p>
    </>
  )
}
