# Déploiement

`apps/web` se déploie sur Vercel (offre Hobby), avec une base Neon de production en Europe (Francfort).

## Vercel

- **Root Directory** : `apps/web` (avec l'option « Include source files outside of the Root Directory » activée : le dépôt est un monorepo Turborepo).
- Framework : Next.js. Commande de build par défaut (`pnpm build`).
- **Web Analytics** : à activer dans l'onglet Analytics du projet ; le composant est déjà dans le code. Il ne pose aucun cookie.

## Base de données (Neon)

Deux URL, toutes deux en Europe :

- `DATABASE_URL` : connexion **poolée** (hôte avec `-pooler`), utilisée par l'application.
- `DIRECT_URL` : connexion **directe** (même hôte sans `-pooler`), utilisée par les migrations.

### Migrations

À chaque déploiement de **production**, `apps/web/scripts/migrate-production.mjs` lance `prisma migrate deploy` avant la construction du site. Si une migration échoue, le déploiement s'arrête : un schéma qui ne correspond pas au code n'est jamais mis en ligne. Les déploiements de prévisualisation et les builds locaux ne touchent pas à la base.

Sans `DIRECT_URL`, l'étape est ignorée avec un avertissement dans le journal de build : ajoutez la variable pour que les migrations soient appliquées toutes seules.

Pour appliquer les migrations à la main : `pnpm db:deploy` (avec `packages/db/.env` ou les variables dans l'environnement). Si une migration a déjà été appliquée à la base par un autre moyen, marquez-la comme appliquée plutôt que de la rejouer : `pnpm --filter @workspace/db exec prisma migrate resolve --applied <nom>`.

## Variables d'environnement

| Variable | Rôle | Obligatoire |
|---|---|---|
| `DATABASE_URL` | Base Neon, URL poolée | oui |
| `DIRECT_URL` | Base Neon, URL directe (migrations) | oui, pour les migrations |
| `BETTER_AUTH_SECRET` | Secret des sessions | oui |
| `BETTER_AUTH_URL` | Adresse publique du site | oui |
| `NEXT_PUBLIC_SITE_URL` | Adresse publique, pour les liens canoniques, le sitemap et les images de partage (à défaut, le domaine de production Vercel, puis `BETTER_AUTH_URL`) | recommandé |
| `IP_HASH_SECRET` | Secret pour hacher les adresses IP (anti-spam) | oui |
| `RESEND_API_KEY`, `EMAIL_FROM` | E-mails d'authentification (`EMAIL_FROM` : un domaine vérifié dans Resend) | oui pour les e-mails |
| `EMAIL_REMINDERS_ENABLED` | `true` pour envoyer aussi les rappels par e-mail (désactivé par défaut) | non |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Connexion avec Google | non |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Notifications push | non |
| `CRON_SECRET` | Secret du point d'entrée des rappels, appelé par GitHub Actions | pour les rappels |
| `YOUVERSION_API_KEY` | Texte de BSB, WEB et Ostervald (et des versions sous licence acceptée) | non |

Les valeurs se saisissent dans Vercel sans guillemets. Une variable ajoutée après un déploiement n'est vue que par le suivant.

## Après un déploiement

- La landing et les pages `/privacy` et `/terms` répondent en FR et en EN ; `pnpm --filter web check-links <adresse>` vérifie qu'aucun lien n'est mort.
- Une inscription crée bien une ligne dans la base de production (voir [WAITLIST.md](WAITLIST.md)).
- `/robots.txt` et `/sitemap.xml` répondent.
