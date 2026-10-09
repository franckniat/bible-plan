# Plan — Application mobile Bible Plan (Expo)

> Statut : **planifié, non démarré**. Ce document cadre la future application mobile pour que les choix faits côté web ne la bloquent pas. Le développement commencera après le lancement de la v1 web (milestone M7). Suivi : issue épique « Application mobile Expo » (label `area:mobile`).

## 1. Objectif et périmètre

L'app mobile couvre les **usages quotidiens**. L'administration avancée reste sur le web.

| Fonction | Mobile v1 | Remarque |
|---|---|---|
| Page « Aujourd'hui » (lectures du jour, série) | ✅ | écran d'accueil |
| Cocher une lecture | ✅ | fonctionne hors ligne |
| Lecteur biblique (LSG 1910, KJV) | ✅ | textes embarqués, 100 % hors ligne |
| Journal de prière, « J'ai prié » | ✅ | |
| Minuteur de méditation et notes | ✅ | minuteur maintenu écran verrouillé |
| Rappels (lecture, prière, méditation) | ✅ | notifications natives |
| Groupes : consultation, progression, commentaires, prières | ✅ | |
| Création de plan | ⚠️ simplifiée | modèles + assistant court ; l'assistant complet reste sur le web |
| Gestion avancée des groupes (rôles, régénérer le code) | ❌ | web |
| Statistiques détaillées | ⚠️ | résumé seulement |

## 2. Stack

- **Expo** (dernier SDK stable au démarrage) + **Expo Router** (routing par fichiers, deep links).
- **NativeWind** pour garder les conventions Tailwind du web.
- **TanStack Query** pour le cache serveur, les mutations optimistes et la reprise hors ligne.
- **expo-secure-store** pour les jetons et cookies de session.
- **expo-notifications** pour le push distant (Expo Push Service) et les notifications locales.
- **expo-keep-awake** et **expo-av / expo-audio** pour le minuteur (son de fin).
- **MMKV** ou **expo-sqlite** pour le stockage local (lectures du jour, file de mutations).
- **EAS Build / Submit / Update** pour les builds, la publication sur les stores et les mises à jour OTA.

L'app vivra dans `apps/mobile` comme un workspace pnpm du monorepo (`turbo dev --filter mobile`).

## 3. Code partagé avec le web

| Package | Contenu réutilisé |
|---|---|
| `@workspace/core` | canon biblique, générateur de plans, stratégies de retard, calcul des séries, `nextRunAt`, schémas zod |
| `@workspace/i18n` | messages FR / EN |
| `@workspace/bible-data` | textes LSG 1910 et KJV (domaine public), embarqués dans l'app ou téléchargés à la demande |

L'**UI n'est pas partagée** : shadcn/Base UI est spécifique au DOM. On garde seulement la cohérence des tokens de design (couleurs, typographies).

**Règle à respecter dès maintenant côté web** : `@workspace/core` doit rester **pur**. Pas d'import Node (`fs`, `crypto` serveur), ni Next.js, ni Prisma, ni DOM.

## 4. API

Le mobile ne peut pas appeler les Server Actions. On ajoutera des **Route Handlers REST versionnés** dans `apps/web/app/api/v1/*`, qui appellent **les mêmes services serveur** (`apps/web/server/services/*`) que les Server Actions.

- Endpoints prévus : `GET /today`, `POST /readings/:id/complete`, `GET /plans`, `GET /plans/:id`, `POST /plans` (depuis un modèle), `GET|POST|PATCH /prayers`, `POST /meditation-sessions`, `GET|POST /notes`, `GET /groups`, `GET /groups/:id`, `POST /groups/join`, `GET|POST /groups/:id/comments`, `GET|POST|PATCH /reminders`, `POST /devices`.
- Validation par les schémas zod de `@workspace/core`. Les types de réponse sont exportés pour le client mobile.
- **Auth** : plugin `@better-auth/expo` côté serveur et client, session dans `expo-secure-store`, Google et Apple en natif.
- **Bible** : aucun appel réseau, les textes du domaine public sont lus localement.

## 5. Notifications

- Les notifications **in-app** (modèle `Notification`, centre de notifications du web) sont réutilisées telles quelles : même API, même compteur de non lues.
- L'email est optionnel (désactivé tant que Resend n'est pas configuré) : le mobile repose sur l'in-app et le push.
- Le modèle `PushDevice` prévoit déjà `kind = EXPO` (en plus de `WEB_PUSH`).
- À la connexion, l'app enregistre son jeton Expo via `POST /api/v1/devices`.
- Le dispatch des rappels existant (déclenché par le cron GitHub Actions) envoie aussi via l'**Expo Push Service** pour les appareils `EXPO`. Les jetons invalides (`DeviceNotRegistered`) sont supprimés.
- **Notifications locales de secours** : les rappels de la semaine sont programmés localement, pour qu'ils fonctionnent sans réseau. On dédoublonne avec le push distant via un identifiant (rappel + date).
- Actions de notification : « Marquer comme lu », « Ouvrir la lecture », « J'ai prié ».

## 6. Hors ligne

- Cache des lectures du jour et des 7 prochains jours pour chaque plan actif.
- Le texte biblique est embarqué : la lecture fonctionne entièrement hors ligne.
- File de mutations persistée (lecture faite, prière, session de méditation), rejouée à la reconnexion. Les opérations sont idempotentes côté serveur grâce aux contraintes uniques.
- Indicateur « hors ligne » discret.

## 7. Publication sur les stores

- **Sign in with Apple** est obligatoire sur iOS dès qu'une connexion Google est proposée (règle App Store 4.8). Il a été reporté de la v1 web (coût du programme Apple Developer) et sera ajouté au démarrage du mobile.
- Politique de confidentialité et fiches « Data safety » (Google) / « App Privacy » (Apple) : email, données de lecture et de prière privées, aucune revente ni publicité.
- **Deep links / universal links** : `/join/[code]` (invitation de groupe), `/read/[passage]`, `/today`.
- Assets : icône, splash screen, captures FR / EN.
- Comptes nécessaires : Expo/EAS (gratuit), Google Play Console (25 $ une fois), Apple Developer (99 $/an).
- **Option 100 % gratuite pour commencer** : PWA installable et APK Android distribué directement (build EAS gratuit). Les stores viendront quand les dons couvriront les frais.

## 8. Phases

1. **Socle** : création de l'app Expo dans le monorepo, auth (email, Google, Apple), navigation, i18n.
2. **MVP lecture et rappels** : Aujourd'hui, cocher, lecteur, rappels push et locaux.
3. **Prière et méditation** : journal, minuteur, notes.
4. **Groupes** : consultation, commentaires, prières partagées, rejoindre par lien.
5. **Hors ligne et finitions** : file de mutations, accessibilité, performances.
6. **Publication** : APK direct, puis test interne Google Play et TestFlight, puis production.

## 9. Prérequis côté web (à respecter pendant les milestones M1 à M7)

- [ ] Logique métier dans `@workspace/core` (pure) et des services serveur découplés des Server Actions.
- [ ] Schémas zod partagés pour toutes les entrées.
- [ ] `PushDevice` multi-type (`WEB_PUSH | EXPO`).
- [ ] Messages i18n dans `@workspace/i18n`, sans dépendance à next-intl dans les fichiers de messages.
- [ ] Opérations de progression idempotentes (contraintes uniques).
- [ ] Textes bibliques dans `@workspace/bible-data`, utilisables sans serveur.
- [ ] Apple Sign-In (issue dédiée, à faire au démarrage du mobile).

## 10. Licence

L'app mobile est aussi sous **AGPL-3.0-or-later**, et le dépôt public fournit le code source correspondant. Avant la publication, il faudra vérifier la compatibilité des conditions des stores avec l'AGPL. Les Marques (nom, logo) restent régies par [TRADEMARKS.md](../../TRADEMARKS.md).
