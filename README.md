# Bible Plan

[![CI](https://github.com/franckniat/bible-plan/actions/workflows/ci.yml/badge.svg)](https://github.com/franckniat/bible-plan/actions/workflows/ci.yml)
[![Licence : AGPL v3](https://img.shields.io/badge/licence-AGPL--3.0-blue.svg)](LICENSE)

> Créez un plan de lecture biblique qui s'adapte à **votre** rythme, et ne l'oubliez plus.

Bible Plan aide chacun à lire la Bible avec régularité :

- **Plans de lecture sur mesure** : par date de fin (« toute la Bible en 1 an »), par temps disponible (« 15 min par jour »), à partir de modèles (chronologique, M'Cheyne, NT en 90 jours…) ou en choisissant librement ses livres. On choisit ses jours de lecture, et l'app répartit la charge de façon équilibrée.
- **Gestion du retard** : répartir le retard sur les jours restants, décaler la date de fin ou rattraper librement, au choix et pour chaque plan.
- **Rappels** dans l'application et par notification push (téléphone et ordinateur), à l'heure et dans le fuseau horaire de chacun. Les rappels par email sont prêts et pourront être activés plus tard.
- **Prière et méditation** : journal de prière (sujets, prières exaucées), minuteur de méditation, notes liées au passage lu, rappels dédiés.
- **Séries et statistiques** de régularité.
- **Groupes** (église, cellule, famille) : plan commun, progression des membres, sujets de prière partagés, commentaires sur la lecture du jour.
- **Lecteur intégré**, y compris hors ligne : Louis Segond 1910 (FR) et King James (EN), deux versions du domaine public.

L'application est **100 % gratuite** et repose uniquement sur des offres gratuites. Elle vit de dons via Mobile Money (Orange Money, MTN MoMo). Une application mobile (Expo) est prévue : voir [apps/mobile/PLAN-MOBILE.md](apps/mobile/PLAN-MOBILE.md).

## Feuille de route

Les étapes sont suivies dans les [issues](https://github.com/franckniat/bible-plan/issues) et les [milestones](https://github.com/franckniat/bible-plan/milestones). La vue d'ensemble se trouve dans [docs/ROADMAP.md](docs/ROADMAP.md).

## Stack

| Domaine | Technologie |
|---|---|
| Monorepo | Turborepo + pnpm |
| Web | Next.js 16 (App Router), React 19, Tailwind CSS 4, shadcn/ui (Base UI) |
| Base de données | PostgreSQL (Neon) + Prisma ORM |
| Authentification | better-auth (email/mot de passe, magic link, Google) |
| i18n | next-intl (FR / EN) |
| Rappels | cron GitHub Actions, notifications in-app, Web Push |
| Emails | Resend (authentification ; rappels par email prêts, désactivés) |
| Texte biblique | Textes du domaine public (eBible.org), embarqués |
| Analytics et erreurs | PostHog (UE) |
| Hébergement | Vercel |

## Structure

```
apps/
  web/            application Next.js
  mobile/         plan de l'application mobile (à venir)
packages/
  ui/             composants partagés (shadcn)
  core/           logique métier partagée web/mobile (plans, séries, rappels)
  db/             schéma et client Prisma
  auth/           configuration better-auth
  bible-data/     textes bibliques du domaine public (LSG 1910, KJV)
  notifications/  emails, push, envoi des rappels
  i18n/           traductions FR / EN
  eslint-config/  configuration ESLint
  typescript-config/
```

Certains packages sont créés au fil des milestones.

## Démarrer

Prérequis : Node.js ≥ 20.9 et pnpm.

```bash
pnpm install
pnpm dev
```

Pour ajouter un composant shadcn (il sera placé dans `packages/ui/src/components`) :

```bash
pnpm dlx shadcn@latest add card -c apps/web
```

Puis l'importer :

```tsx
import { Card } from "@workspace/ui/components/card"
```

## Contribuer

Les contributions sont les bienvenues : lisez [CONTRIBUTING.md](CONTRIBUTING.md). Les commits doivent être signés (`git commit -s`, [DCO](https://developercertificate.org/)). Pour une faille de sécurité, voir [SECURITY.md](SECURITY.md).

## Licence et marque

- Code : **[GNU AGPL-3.0-or-later](LICENSE)**. Si vous hébergez une version modifiée, vous devez publier son code source pour vos utilisateurs.
- Le nom « Bible Plan » et le logo ne sont **pas** couverts par la licence : voir [TRADEMARKS.md](TRADEMARKS.md).
- Les textes bibliques restent la propriété de leurs éditeurs : voir [NOTICE](NOTICE).

Copyright © 2026 franckniat et les contributeurs de Bible Plan.
