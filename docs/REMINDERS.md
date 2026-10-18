# Rappels

Un rappel invite à lire, prier ou méditer à une heure locale, dans le fuseau de la personne, certains jours de la semaine. Il arrive dans l'application (cloche et page Notifications) et, si les rappels par email sont activés, par email. Les notifications push viendront avec la PWA ([#20](https://github.com/franckniat/bible-plan/issues/20)).

## Comment ça marche

1. Un rappel (`Reminder`) garde son heure locale (`07:00`), son fuseau IANA, ses jours actifs et ses canaux. `nextRunAt` (UTC) est calculé par `nextReminderRun` (`@workspace/core`) : à 7h00 Europe/Paris, le rappel reste à 7h00 après un changement d'heure.
2. Le workflow GitHub Actions `.github/workflows/reminders.yml` appelle toutes les 5 minutes `POST /api/cron/dispatch` avec le secret `CRON_SECRET`.
3. La route prend par lots les rappels activés dont `nextRunAt` est passé, puis pour chacun :
   - **elle le réserve** en avançant `nextRunAt` au prochain créneau, seulement si personne d'autre ne l'a fait (deux exécutions qui se chevauchent ne le traitent pas deux fois) ;
   - **elle le livre** sur chaque canal : une ligne `ReminderDelivery`, unique par rappel, échéance et canal, est créée d'abord, puis la notification est écrite ou l'email envoyé. Relancer la route ne crée donc jamais une seconde notification.
4. En fin d'exécution, les notifications de plus de 90 jours sont supprimées.

## Retards

Le planificateur de GitHub est gratuit mais pas exact : une exécution peut démarrer **5 à 30 minutes en retard**, parfois davantage aux heures chargées. Ce n'est pas bloquant :

- la sélection est `nextRunAt <= maintenant`, un rappel en retard est donc quand même livré ;
- un rappel resté longtemps sans exécution (panne, workflow désactivé) est livré **une seule fois**, puis replanifié après maintenant : les créneaux manqués ne sont pas rejoués.

Pour un envoi à la minute près, il faudrait un planificateur payant ; ce n'est pas le choix du projet (100 % gratuit).

## Mise en place

| Où | Nom | Rôle |
|---|---|---|
| Application (Vercel, `apps/web/.env.local`) | `CRON_SECRET` | Secret attendu par la route. Sans lui, la route refuse tout. |
| GitHub, *Settings → Secrets and variables → Actions → Secrets* | `CRON_SECRET` | Même valeur, envoyée en `Authorization: Bearer`. |
| GitHub, *… → Variables* | `APP_URL` | URL publique de l'application, par exemple `https://bibleplan.example`. |

Générer un secret :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Tant que `APP_URL` ou `CRON_SECRET` manque côté GitHub, le workflow reste vert et ne fait rien (il l'indique dans son journal), pour ne pas échouer toutes les 5 minutes avant la mise en ligne.

Essayer à la main (en local, avec `CRON_SECRET` défini) :

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/dispatch
```

La réponse indique les rappels trouvés (`due`), réservés (`claimed`), livrés (`delivered`), en échec (`failed`) et les notifications purgées (`purged`). Le workflow peut aussi être lancé depuis l'onglet *Actions* (`workflow_dispatch`).

## Emails de rappel

Désactivés par défaut. Ils ne sont envoyés que si `EMAIL_REMINDERS_ENABLED=true`, avec une clé Resend et un domaine vérifié (voir `apps/web/.env.example`), et seulement à une adresse vérifiée. Les envois comptent dans le quota quotidien, derrière les emails d'authentification ; un envoi refusé est noté dans `ReminderDelivery.error`.

Chaque email contient un lien de désinscription et les en-têtes `List-Unsubscribe` / `List-Unsubscribe-Post` (RFC 8058) : le bouton « se désabonner » des applications de messagerie désactive ce rappel en un clic. Le lien est signé (HMAC avec `BETTER_AUTH_SECRET`, sans expiration, pour qu'on puisse se désinscrire d'un vieil email) et ne concerne que ce rappel.

> Le lien du corps de l'email agit dès l'ouverture (GET). Un outil qui visite les liens à l'avance (antivirus, aperçu) pourrait donc désactiver un rappel par erreur ; la personne le retrouve alors dans *Réglages → Rappels*.

## Inactivité de 60 jours

GitHub désactive les workflows planifiés d'un dépôt public après **60 jours sans activité** : les rappels s'arrêteraient sans bruit. Le workflow `.github/workflows/inactivity-alert.yml` s'exécute chaque jour et ouvre une issue dès que le dernier commit a 45 jours, tant qu'il reste le temps d'agir. Pour l'éviter, pousser un commit sur la branche principale ; si les workflows ont déjà été désactivés, les réactiver depuis l'onglet *Actions*.
