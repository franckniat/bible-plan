# Liste d'attente

Avant le lancement, la page d'accueil du site est une liste d'attente (`apps/web/app/[locale]/page.tsx`), accompagnée des pages de confidentialité et de conditions d'utilisation. Elle sera remplacée par l'application au lancement.

## Variables d'environnement (`apps/web`)

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Connexion poolée à la base Neon (voir [packages/db/README.md](../packages/db/README.md)). |
| `IP_HASH_SECRET` | Secret servant à hacher les adresses IP pour limiter les inscriptions abusives (5 par heure et par IP). **Obligatoire en production.** |

Générer un secret :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Données enregistrées

Table `WaitlistEntry` : email (normalisé, unique), prénom, pays (code ISO), centres d'intérêt, langue, date du consentement et HMAC de l'IP. L'adresse IP elle-même n'est jamais stockée. Le détail public figure sur la page `/fr/privacy`.

Une inscription n'est possible qu'avec la case de consentement cochée : le schéma `waitlistSignupSchema` (`@workspace/core`) l'exige. Une nouvelle inscription avec le même email met à jour la fiche existante sans révéler qu'elle existait.

## Consulter les inscrits

```bash
pnpm db:studio
```

Prisma Studio ouvre la table `WaitlistEntry` dans le navigateur (lecture, correction, export).

## Retirer quelqu'un de la liste

Une personne peut demander sa suppression à tout moment (droit à l'effacement), via le contact indiqué sur la page de confidentialité. Vérifiez que la demande vient bien de l'adresse inscrite, puis :

```bash
pnpm db:waitlist:remove someone@example.com
```

La commande utilise la base de `packages/db/.env`. Pour la production, lancez-la avec l'URL de la base de production :

```bash
DATABASE_URL="<url poolée de production>" pnpm db:waitlist:remove someone@example.com
```

Répondez à la personne pour confirmer la suppression, au plus tard un mois après sa demande.

## Vérifier les liens

Avec le site lancé (`pnpm dev` ou `next start`) :

```bash
pnpm --filter web check-links http://localhost:3000
```

Le script parcourt toutes les pages accessibles depuis `/fr` et `/en`, vérifie les liens internes, les ancres et les liens externes, et échoue au moindre lien mort.
