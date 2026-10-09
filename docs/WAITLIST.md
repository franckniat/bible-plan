# Liste d'attente

Avant le lancement, le site public se limite à une landing d'attente (`WAITLIST_MODE=true`, voir le [README](../README.md#mode-liste-dattente)). Ce document explique comment gérer les inscrits.

## Variables d'environnement (`apps/web`)

| Variable | Rôle |
|---|---|
| `WAITLIST_MODE` | `true` en production avant le lancement : seules la landing, la confidentialité et les conditions sont publiques. |
| `IP_HASH_SECRET` | Secret servant à hacher les adresses IP pour limiter les inscriptions abusives (5 par heure et par IP). **Obligatoire en production.** |
| `WAITLIST_EXPORT_TOKEN` | Jeton qui protège l'export CSV. Sans jeton, l'export est désactivé (404). |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Adresse affichée sur la page de confidentialité pour les demandes liées aux données. Sans elle, les pages renvoient vers le profil GitHub du mainteneur. |

Générer un secret ou un jeton :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Données enregistrées

Table `WaitlistEntry` : email (normalisé, unique), prénom, pays (code ISO), centres d'intérêt, langue, date du consentement et HMAC de l'IP. L'adresse IP elle-même n'est jamais stockée. Le détail public figure sur la page `/fr/privacy`.

Une inscription n'est possible qu'avec la case de consentement cochée : le schéma `waitlistSignupSchema` (`@workspace/core`) l'exige. Une nouvelle inscription avec le même email met à jour la fiche existante sans révéler qu'elle existait.

## Exporter la liste (CSV)

```bash
curl -H "Authorization: Bearer $WAITLIST_EXPORT_TOKEN" \
  https://<domaine>/api/waitlist/export -o waitlist.csv
```

Le fichier est en UTF-8 (avec BOM, pour Excel), une ligne par inscrit : `email, first_name, country, interests, locale, consented_at, created_at`. Les valeurs qui ressemblent à des formules de tableur sont neutralisées.

## Retirer quelqu'un de la liste

Une personne peut demander sa suppression à tout moment (droit à l'effacement), à l'adresse de contact indiquée sur la page de confidentialité. Vérifiez que la demande vient bien de l'adresse inscrite, puis :

```bash
pnpm db:waitlist:remove someone@example.com
```

La commande utilise la base de `packages/db/.env`. Pour la production, lancez-la avec l'URL de la base de production :

```bash
DATABASE_URL="<url poolée de production>" pnpm db:waitlist:remove someone@example.com
```

Répondez à la personne pour confirmer la suppression, au plus tard un mois après sa demande.

On peut aussi consulter ou corriger les fiches avec `pnpm db:studio`.

## Vérifier les liens

Avec le site lancé (`pnpm dev` ou `next start`) :

```bash
pnpm --filter web check-links http://localhost:3000
```

Le script parcourt toutes les pages accessibles depuis `/fr` et `/en`, vérifie les liens internes, les ancres et les liens externes, et échoue au moindre lien mort.
