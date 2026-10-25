# Feuille de route — Application mobile Bible Plan (Expo)

> Statut : **en cours** (milestones M9 à M19). Suivi : issue épique [#34](https://github.com/franckniat/bible-plan/issues/34) (label `area:mobile`).
> Principe directeur : **local d'abord**. Tout fonctionne sans compte et sans réseau. Le compte ne sert qu'à **sauvegarder et synchroniser** (et aux groupes, qui sont sociaux par nature).

## 1. Le modèle « sans compte, puis synchronisation »

```
            Sans compte                          Avec compte
 ┌──────────────────────────────┐     ┌──────────────────────────────────┐
 │ UI ──lit/écrit──> SQLite     │     │ UI ──lit/écrit──> SQLite         │
 │                   (vérité)   │ ──> │                   │  ▲           │
 │ Rappels = notifs locales     │ créer│        outbox ────┘  │ pull     │
 │ Bible embarquée              │ ou   │          │ push      │          │
 │ Plans générés sur l'appareil │ se   │          ▼           │          │
 └──────────────────────────────┘ connecter  /api/v1/sync (Neon)        │
                                      └──────────────────────────────────┘
```

- **La base locale (SQLite) est toujours la source de vérité de l'écran.** L'UI ne fait jamais d'appel réseau pour afficher ses données ; elle lit SQLite (requêtes réactives).
- **Aucun utilisateur anonyme côté serveur.** Un visiteur n'existe que sur son téléphone (identifiant local `deviceId`). Pas de ligne en base, pas de coût Neon, rien à purger pour le RGPD. (Le plugin `anonymous` de better-auth est écarté pour ces raisons.)
- **Chaque écriture locale ajoute une entrée dans une `outbox`**, même sans compte. Tant qu'il n'y a pas de compte, l'outbox n'est simplement jamais envoyée. À la création du compte, tout l'historique part d'un coup : c'est « l'adoption ».
- **Les identifiants sont générés sur l'appareil** (UUIDv7, comme le serveur aujourd'hui). Un même enregistrement garde le même id partout, ce qui rend le push idempotent.

### Ce qui marche sans compte

| Fonction | Sans compte | Avec compte |
|---|---|---|
| Lecteur biblique (LSG 1910, KJV), surbrillances, historique | ✅ | ✅ + synchro |
| Plans : modèles, assistant, Aujourd'hui, cocher, rattrapage, calendrier | ✅ (générateur `@workspace/core` sur l'appareil) | ✅ + synchro |
| Journal de prière, « J'ai prié » | ✅ | ✅ + synchro |
| Minuteur de méditation / prière, notes | ✅ | ✅ + synchro |
| Rappels de lecture et de méditation | ✅ notifications programmées sur l'appareil | ✅ + push serveur (dédoublonné) |
| **Temps de prière** (prévenance 5 min, écran de prière, mode strict) | ✅ entièrement local | ✅ + réglages synchronisés |
| Séries et statistiques | ✅ (calculées localement) | ✅ (recalculées sur tous les appareils) |
| **Trophées et badges** | ✅ (calculés localement) | ✅ + synchro, visibles aussi sur le web |
| Centre de notifications | ✅ notifications locales | ✅ + notifications serveur |
| Groupes | ❌ → invitation à créer un compte | ✅ |
| Utilisation sur le web / plusieurs appareils | ❌ | ✅ |

### Quand proposer le compte (sans jamais l'imposer)

- Bandeau discret dans Réglages : « Vos données ne sont que sur ce téléphone. Créez un compte pour les sauvegarder. »
- Moments utiles, une seule fois chacun et refusables : après 7 jours de série, au premier trophée, à la fin du premier plan, en ouvrant « Groupes », en touchant un lien d'invitation `/join/[code]`.
- Sans compte, une **sauvegarde manuelle** (export / import d'un fichier JSON via la feuille de partage) protège contre la perte du téléphone.

## 2. Rappels, temps de prière et mode concentration

### Pourquoi tout est programmé sur l'appareil

Le cron GitHub Actions qui déclenche les rappels serveur part **5 à 30 minutes en retard** ([REMINDERS.md](../../docs/REMINDERS.md)). C'est acceptable pour une notification, pas pour « 5 minutes avant » ni pour verrouiller l'écran à l'heure dite. Sur mobile :

- **Les rappels sont programmés localement** (`expo-notifications`, alarmes exactes sur Android) : ils arrivent à la minute, sans réseau et sans compte. Pour l'utilisateur, c'est une notification push comme une autre.
- **Le push serveur (Expo Push) est un complément** pour les comptes : il prévient quand un rappel a été créé ou modifié ailleurs (web) et que l'appareil ne l'a pas encore reprogrammé. Clé de dédoublonnage `rappel + échéance` : si la notification locale est programmée, le push est ignoré.

### Rappels de méditation

- Heure, jours, et passage proposé (plan du jour ou passage choisi).
- Actions de notification : « Méditer maintenant » (ouvre le minuteur sur le passage), « Plus tard » (+15 min).

### Temps de prière

Un rappel de prière devient un **temps de prière** : une heure, des jours, une durée (par exemple 15 min) et un niveau de concentration.

```
 T-5 min                 T                                   T + durée
 ──┬──────────────────────┬────────────────────────────────────┬──
   │ « Dans 5 min :       │ Écran de prière plein écran        │ Fin : son doux,
   │  temps de prière     │ minuteur, sujets de prière,        │ session PRAYER
   │  (15 min) »          │ passage du jour                    │ enregistrée
   │ [Passer cette fois]  │ ─ Doux : [Continuer ce que je      │ (statistiques,
   │                      │   faisais] toujours visible        │  séries, badges)
   │                      │ ─ Strict : aucun bouton pour sortir│
```

| Niveau | Comportement |
|---|---|
| **Notification** | Rappel seul, comme aujourd'hui sur le web. |
| **Doux** (par défaut) | Prévenance à T-5, puis l'écran de prière s'affiche au-dessus des autres apps. Un bouton « Continuer ce que je faisais » le ferme. |
| **Strict** | Même chose, mais **sans bouton pour sortir** avant la fin du minuteur. Les autres apps restent bloquées pendant la durée. |

Règles du mode strict, pour qu'il soit respecté et accepté par les stores :

- **Le téléphone et les appels d'urgence restent toujours accessibles** (le système le garantit, et on autorise en plus l'app Téléphone). L'utilisateur peut ajouter quelques apps toujours permises.
- **Activation réfléchie** : écran d'explication et confirmation ; le mode ne peut pas être désactivé **pendant** un temps de prière, et un changement de réglage ne prend effet qu'au temps de prière suivant (sinon on contourne en deux touches).
- **Honnêteté** : on explique que l'utilisateur garde la main sur son téléphone par les réglages du système (retirer l'autorisation, désinstaller). L'app ne cache pas cette sortie ; elle la rend simplement plus lointaine qu'un bouton.
- « Passer cette fois » à T-5 reste possible en mode strict, mais doit être confirmé ; un temps passé n'est **jamais compté comme un échec** (pas de pénalité dans les séries ni les badges).

### Mise en œuvre native

L'écran de prière au-dessus des autres apps et le blocage ne sont pas possibles en JavaScript seul. Il faut un **module Expo natif** (Swift / Kotlin) dans `apps/mobile/modules/prayer-focus`, d'où **des builds de développement EAS dès le début** (Expo Go ne suffit pas).

| | Android | iOS (16+) |
|---|---|---|
| Programmation exacte | `AlarmManager` exact (`USE_EXACT_ALARM` / `SCHEDULE_EXACT_ALARM`) | `DeviceActivity` : plage horaire gérée par le système, même app fermée |
| Écran de prière à T | notification plein écran (`USE_FULL_SCREEN_INTENT`), y compris écran verrouillé | notification « Time Sensitive » ; les apps bloquées affichent l'écran de prière (bouclier) |
| Blocage des apps | service de premier plan + superposition (`SYSTEM_ALERT_WINDOW`) qui recouvre toute app ouverte hors liste autorisée (détection via `UsageStatsManager`) | **Screen Time** : `FamilyControls` (autorisation individuelle) + `ManagedSettings` qui bloque les apps choisies, extensions `ShieldConfiguration` / `ShieldAction` |
| Mode doux | bouton « Continuer » qui retire la superposition | bouton secondaire du bouclier qui le lève |
| Mode strict | pas de bouton jusqu'à la fin | bouclier sans bouton jusqu'à la fin de la plage |
| Prérequis | permissions spéciales accordées par l'utilisateur ; déclarations Google Play (alarme exacte, plein écran, service `specialUse`) | **entitlement « Family Controls (Distribution) » à demander à Apple** (validation de plusieurs semaines), compte Apple Developer payant, extensions ajoutées via config plugin (`@bacons/apple-targets`) |

L'accessibilité Android (`AccessibilityService`) est écartée : Google Play la réserve aux outils d'accessibilité.

## 3. Trophées et badges (web et mobile)

Récompenser la **régularité**, pas la quantité : on compte des jours et des sessions, jamais des minutes ou des chapitres « avalés ».

- **Badges** : la collection du quotidien, avec des niveaux bronze / argent / or. Exemples : *Premiers pas* (première lecture, première prière, première méditation) ; *Fidélité* (7, 30, 100 jours de série) ; *Prière* (10, 50, 200 prières) ; *Méditation* (10, 50, 200 sessions) ; *Temps de prière* (temps de prière menés à terme 7, 30, 100 fois) ; *Livres* (un livre lu en entier, 10, 30 livres) ; *Notes* (10 notes de méditation).
- **Trophées** : les grands accomplissements, rares. Exemples : terminer un plan ; lire les Psaumes, les Évangiles, le Nouveau Testament, la Bible entière ; une année de régularité (300 jours actifs sur 365, pas forcément consécutifs).
- **Pas de classement**, pas de comparaison. Privés par défaut ; partage facultatif d'une carte d'image (comme les versets). Affichage dans les groupes : plus tard, sur choix de chacun.
- **Rien ne se perd** : un badge obtenu le reste, même si la série casse ensuite.

Mise en œuvre commune :

- **Catalogue et règles dans `@workspace/core/achievements`** : fonction pure `evaluateAchievements(historique) → [{ key, level, unlockedAt }]`, testée (tests de propriété, fuseaux horaires). Elle tourne à l'identique sur le serveur et sur le téléphone, hors ligne.
- Les trophées sont **dérivés** des événements (progrès, prières, sessions, notes) : en synchro, c'est une **union** (date d'obtention la plus ancienne). Aucun conflit possible.
- Table `Achievement` côté serveur (`userId, key, level, unlockedAt`, unique `userId + key + level`) pour l'affichage et les notifications ; même table en local sur le mobile.
- Noms et descriptions FR / EN dans `@workspace/i18n` ; illustrations SVG partagées (rendues avec `react-native-svg` sur mobile).
- À l'obtention : animation de célébration, notification dans l'app.
- Côté web : milestone dédiée (voir [ROADMAP.md](../../docs/ROADMAP.md)), avec calcul rétroactif pour les comptes existants.

## 4. Synchronisation

### Protocole

- `POST /api/v1/sync/push` : lot de changements de l'outbox `{ table, id, op: upsert|delete, data, clientUpdatedAt }`. Idempotent (rejouer un lot ne change rien). Réponse : ids acceptés, ids rejetés avec la raison, enregistrements fusionnés renvoyés.
- `GET /api/v1/sync/pull?cursor=…` : tout ce qui a changé côté serveur depuis le curseur (y compris les suppressions), paginé. Le curseur est une séquence serveur monotone (`syncVersion` bigint), pas une date d'horloge.
- Cycle : push puis pull, déclenché au démarrage, au retour au premier plan, après une écriture (avec un délai de quelques secondes), au retour du réseau, et en tâche de fond (`expo-background-task`) quand l'OS le permet.
- Les suppressions sont des **pierres tombales** (`deletedAt`), purgées après 90 jours.

### Règles de fusion par entité

| Entité | Règle |
|---|---|
| `ReadingProgress`, `PrayerLog`, `MeditationSession` | **Ajout seul** : union. Un doublon (`enrollmentId + readingId`) est sans effet. |
| `PrayerRequest`, `MeditationNote`, `Reminder` (y compris durée et niveau de concentration) | Dernière écriture gagne (`clientUpdatedAt`, serveur en arbitre en cas d'égalité). |
| `Highlight` | Dernière écriture gagne par verset (`userId + book + chapter + verse`) ; à l'adoption, la couleur déjà dans le compte est gardée (même règle que #57). |
| `ReadingPlan` + `PlanDay` + `PlanReading` | **Un agrégat** synchronisé en bloc, avec un numéro de version. Les jours déjà lus ne sont jamais régénérés par le rattrapage, donc leurs ids restent stables. Si deux appareils rattrapent hors ligne en même temps, le dernier gagne et les progrès orphelins sont rattachés par passage. |
| `PlanEnrollment` | Dernière écriture gagne sur le statut. Deux inscriptions au **même modèle** à l'adoption : on garde les deux et on propose de les fusionner. |
| `ActivityDay`, `Achievement` | **Dérivés** : recalculés à partir des événements des deux côtés. `Achievement` est en plus fusionné par union (date la plus ancienne). |
| Liste d'apps autorisées en mode strict | **Jamais synchronisée** : propre à chaque appareil (et opaque sur iOS). |
| `Notification` serveur, `PushDevice`, groupes | Serveur uniquement (lecture en ligne, cache local). |

### Adoption (premier compte sur un appareil)

1. Inscription ou connexion (email + mot de passe, magic link, Google, Apple).
2. Le compte est **vide** : tout l'historique local est poussé, `userId` est rempli localement.
3. Le compte **existe déjà** (web ou autre téléphone) : on pousse le local, on tire le distant, on fusionne selon les règles ci-dessus, puis on recalcule activité et trophées. Écran de résumé : « 3 plans, 42 prières, 18 notes et 5 badges ajoutés à votre compte ». Rien n'est jamais supprimé en silence.

### Déconnexion et suppression

- Déconnexion : choix entre « Garder mes données sur ce téléphone » (redevient un usage sans compte, l'outbox repart de zéro) et « Effacer ce téléphone ».
- Suppression du compte (RGPD, #36) : supprimée côté serveur ; le téléphone propose de garder une copie locale sans compte.

## 5. Stack

- **Expo** (SDK stable du moment) + **Expo Router** (routing par fichiers, deep links), **builds de développement EAS** (modules natifs).
- **expo-sqlite + Drizzle ORM** : schéma typé, migrations embarquées, `useLiveQuery` pour des écrans réactifs.
- **NativeWind** pour garder les conventions Tailwind et les tokens de couleur du web (crème, or, sombre neutre).
- **TanStack Query** seulement pour ce qui est en ligne par nature (groupes, notifications serveur).
- **better-auth + `@better-auth/expo`**, session dans `expo-secure-store` ; Google et Apple en natif.
- **expo-notifications** (local + Expo Push), **expo-keep-awake** et **expo-audio** pour les minuteurs, **expo-background-task** pour la synchro de fond.
- **Module natif `prayer-focus`** (Expo Modules API, Swift / Kotlin) + extensions iOS via `@bacons/apple-targets`.
- **react-native-svg** et **Reanimated** pour les badges et les célébrations.
- **EAS Build / Submit / Update** (OTA pour les correctifs JS ; une modification native demande un nouveau build).
- Tests : Vitest pour la logique, **Maestro** pour les parcours de bout en bout, tests manuels sur appareils réels pour le mode concentration.

## 6. Code partagé

| Package | Rôle pour le mobile |
|---|---|
| `@workspace/core` | canon, générateur de plans, rattrapage, séries, `nextReminderRun`, **trophées et badges**, schémas zod. **Tourne sur l'appareil.** Doit rester pur (pas de Node, Next, Prisma, DOM). |
| `@workspace/sync` *(nouveau)* | schémas zod des enregistrements synchronisés, format push/pull, règles de fusion. Pur, testé une fois, utilisé par le serveur et l'app. |
| `@workspace/i18n` | messages FR / EN (dont noms et descriptions des badges). |
| `@workspace/bible-data` | LSG 1910 et KJV embarquées dans l'app ; les autres versions téléchargeables à la demande (le dossier `data` fait 14 Mo). |

L'UI n'est pas partagée (shadcn/Base UI dépend du DOM), seulement les tokens de design et les illustrations SVG des badges.

## 7. Feuille de route

Chaque phase devient une milestone ; chaque ligne une issue (une tâche = un commit, comme pour le web). M8 est la milestone web des trophées ; le mobile commence à **M9**. Les phases **M9 à M15 n'ont besoin d'aucun compte** : on livre une app complète hors ligne avant d'écrire une ligne de synchro côté app.

### M9 — Prérequis côté serveur et packages partagés
*Peut commencer pendant M5–M8 du web, sans bloquer le web.*

- [ ] Sortir de `apps/web/server/services` la logique pure encore côté serveur vers `@workspace/core` : contenu intelligent des rappels (#21), recalcul de l'activité à partir des événements, reconstruction d'un plan au rattrapage.
- [ ] `Reminder` : prévenance (`leadMinutes`, 5 par défaut pour la prière), durée du temps de prière (`durationMinutes`), niveau (`focusMode` : `NOTIFY | SOFT | STRICT`). Le web affiche et modifie ces champs, sans les appliquer.
- [ ] Schéma prêt pour la synchro : `updatedAt`, `deletedAt` et `syncVersion` sur toutes les tables synchronisées ; le serveur accepte un id fourni par le client.
- [ ] `ActivityDay` recalculé à partir des événements (plus d'incréments), avec tests sur plusieurs fuseaux.
- [ ] Package `@workspace/sync` : schémas, règles de fusion, tests de propriété (l'ordre d'arrivée des lots ne change pas le résultat).
- [ ] *Critère de fin* : le web utilise les mêmes règles ; tous les tests verts.

### M10 — Socle Expo
- [ ] `apps/mobile` dans le monorepo pnpm/Turbo (Metro configuré pour le workspace), `turbo dev --filter mobile`.
- [ ] Builds de développement EAS Android et iOS (nécessaires pour les modules natifs).
- [ ] **Demander à Apple l'entitlement Family Controls (Distribution)** dès maintenant : la validation prend du temps et conditionne le mode strict sur iOS (M15).
- [ ] Expo Router : onglets Aujourd'hui, Bible, Prière, Plus ; deep links `/today`, `/read/[passage]`, `/join/[code]`, `/prayer-time`.
- [ ] NativeWind, tokens de thème clair / sombre, logo et icônes.
- [ ] i18n FR / EN (langue du téléphone par défaut).
- [ ] CI : typecheck, lint, tests.
- [ ] *Critère de fin* : l'app démarre sur Android et iOS, navigation et langue OK.

### M11 — Stockage local
- [ ] expo-sqlite + Drizzle, migrations embarquées et testées (montée de version sans perte).
- [ ] Couche « dépôts » : seul point d'écriture, qui alimente l'`outbox` à chaque changement.
- [ ] Profil local : `deviceId`, langue, fuseau, version de la Bible préférée.
- [ ] Export / import d'une sauvegarde JSON.
- [ ] *Critère de fin* : données conservées après fermeture, mise à jour de l'app et redémarrage.

### M12 — Bible hors ligne
- [ ] Lecteur chapitre par chapitre, précédent / suivant, réglages de lecture.
- [ ] Sélection de versets : surbrillance, copier, partager, comparer.
- [ ] Historique de lecture, versions téléchargeables.
- [ ] *Critère de fin* : mode avion, toute la Bible lisible, surbrillances conservées.

### M13 — Plans de lecture hors ligne
- [ ] Modèles et assistant (nombre de chapitres par jour, premier et dernier livre), générés sur l'appareil.
- [ ] Page Aujourd'hui, cocher une lecture, détail et vue calendrier d'un plan.
- [ ] Rattrapage (SHIFT / REDISTRIBUTE).
- [ ] *Critère de fin* : créer un plan et le suivre une semaine en mode avion.

### M14 — Prière, méditation, rappels, statistiques et trophées hors ligne
- [ ] Journal de prière, minuteur de méditation et de prière (écran verrouillé, son de fin), notes de méditation.
- [ ] Rappels de lecture et de **méditation** en notifications programmées localement, contenu intelligent, reprogrammés à chaque ouverture et changement de fuseau ; actions « Méditer maintenant », « Plus tard », « Marquer comme lu », « J'ai prié ».
- [ ] Temps de prière, niveau **Notification** : prévenance à T-5 et rappel à T.
- [ ] Séries, carte d'activité et résumé des statistiques.
- [ ] **Trophées et badges** : collection, détail, progression vers le niveau suivant, célébration à l'obtention, carte de partage.
- [ ] *Critère de fin* : **v1 sans compte complète**, utilisable en bêta (APK direct).

### M15 — Temps de prière : écran de prière et mode concentration
- [ ] Module natif `prayer-focus` (Expo Modules API) : interface commune JS, implémentations Android et iOS.
- [ ] Android : alarmes exactes, notification plein écran, écran de prière au-dessus de l'écran verrouillé.
- [ ] Android : service de premier plan + superposition qui recouvre les apps non autorisées pendant la durée ; mode doux (bouton « Continuer ») et strict (sans bouton).
- [ ] iOS : autorisation Screen Time, plage `DeviceActivity`, bouclier `ManagedSettings` avec écran de prière ; mode doux (bouton du bouclier) et strict.
- [ ] Choix des apps toujours autorisées (Téléphone d'office), par appareil.
- [ ] Réglages : niveau, durée, activation du mode strict avec explication et confirmation, verrouillage des réglages pendant un temps de prière.
- [ ] Session `PRAYER` enregistrée à la fin (statistiques, séries, badge *Temps de prière*) ; un temps passé ou interrompu n'est pas pénalisé.
- [ ] Tests sur appareils réels : téléphone verrouillé, app tuée, redémarrage, changement de fuseau, batterie économique (Android), appel entrant pendant un temps de prière.
- [ ] *Critère de fin* : sur un Android et un iPhone réels, le temps de prière démarre à l'heure, app fermée, dans les trois niveaux.

### M16 — Compte et synchronisation
- [ ] Serveur : plugin `@better-auth/expo`, Sign in with Apple (#30), routes `POST /api/v1/sync/push` et `GET /api/v1/sync/pull`.
- [ ] App : inscription / connexion (email, magic link par deep link, Google, Apple natifs).
- [ ] Moteur de synchro : push, pull, curseur, reprise après erreur, synchro de fond.
- [ ] Adoption et fusion avec un compte existant (y compris recalcul des trophées), écran de résumé.
- [ ] Indicateur discret (synchronisé / en attente / hors ligne), invitations à créer un compte.
- [ ] Déconnexion (garder ou effacer), suppression de compte.
- [ ] Push serveur : enregistrement du jeton Expo (`PushDevice` de type `EXPO`), envoi par le cron existant via Expo Push, dédoublonnage avec les notifications locales (clé rappel + échéance), suppression des jetons `DeviceNotRegistered`. Un rappel modifié sur le web est reprogrammé sur le téléphone à la synchro suivante.
- [ ] Tests : deux appareils hors ligne qui modifient les mêmes données puis se reconnectent ; adoption avec un compte web déjà rempli.
- [ ] *Critère de fin* : une prière ajoutée sur le téléphone apparaît sur le web, et inversement ; un badge obtenu sur le téléphone apparaît sur le web.

### M17 — Groupes *(après M6 côté web)*
- [ ] Liste et détail, progression du plan commun, commentaires, prières partagées.
- [ ] Rejoindre par lien `/join/[code]` ; sans compte, le lien mène à l'inscription puis rejoint automatiquement.
- [ ] *Critère de fin* : rejoindre un groupe depuis une invitation reçue par message.

### M18 — Qualité
- [ ] Accessibilité (VoiceOver, TalkBack, taille de police système), contrastes clair / sombre ; l'écran de prière reste utilisable avec un lecteur d'écran.
- [ ] Performances : démarrage à froid, listes longues, taille du binaire (Bible embarquée), consommation de batterie du mode concentration.
- [ ] Parcours Maestro : premier lancement sans compte, plan hors ligne, obtention d'un badge, adoption, synchro.
- [ ] PostHog (analytics sans données personnelles, suivi des erreurs).

### M19 — Publication
- [ ] Politique de confidentialité mise à jour (données locales, synchro facultative, usage de Screen Time / des statistiques d'utilisation **sur l'appareil uniquement**), fiches « Data safety » et « App Privacy ».
- [ ] Déclarations Google Play : alarmes exactes, notification plein écran, service de premier plan, superposition, accès aux statistiques d'utilisation, avec vidéo de démonstration.
- [ ] Revue Apple : justification de Family Controls, démonstration du mode strict et des sorties possibles.
- [ ] Universal links / App Links pour `/join`, `/read`, `/today`.
- [ ] Icône, splash, captures FR / EN.
- [ ] APK direct → test interne Google Play → TestFlight → production. EAS Update pour les correctifs JS.

## 8. Ordre et parallélisme

```
Web M8 (trophées) ─────────────────────────────┐
M9 ──────────────┐                             │
M10 → M11 → M12 → M13 → M14 ──> bêta sans compte (APK)
                          └──> M15 (mode concentration, a besoin de l'entitlement Apple)
                 └───────────> M16 (a besoin de M9, M11, et de M8 web pour les trophées)
                                 → M17 (a besoin de M6 web) → M18 → M19
```

M9 (serveur) et M10–M14 (app) avancent en parallèle. La bêta sans compte peut sortir avant la synchro ; M15 peut sortir d'abord sur Android si l'entitlement Apple tarde.

## 9. Risques

| Risque | Parade |
|---|---|
| Perte du téléphone sans compte | invitations à créer un compte, export JSON |
| Conflits de rattrapage sur deux appareils | agrégat versionné, rattachement des progrès par passage, tests dédiés |
| Horloges des téléphones fausses | `syncVersion` serveur pour le curseur ; `clientUpdatedAt` seulement pour départager |
| Migrations SQLite qui cassent des données | migrations testées sur des bases de versions précédentes en CI |
| Notifications en double (locale + push) | clé de dédoublonnage rappel + échéance, push serveur ignoré si la locale est programmée |
| **Entitlement Family Controls refusé ou lent** | demande dès M10 ; sinon iOS se limite au mode doux (notification Time Sensitive + écran de prière à l'ouverture) |
| **Refus Google Play des permissions sensibles** (plein écran, superposition, statistiques d'utilisation) | justification « alarme de prière » documentée, vidéo ; repli : notification + écran de prière à l'ouverture, sans blocage |
| Android qui tue le service (économie de batterie des constructeurs) | alarmes exactes, service de premier plan, guide pour exclure l'app de l'optimisation, tests sur plusieurs marques |
| Mode strict vécu comme un piège | activation explicite, sorties système expliquées, appels toujours possibles, aucune pénalité |
| Trophées qui poussent à la performance | régularité plutôt que volume, pas de classement, badges jamais retirés |
| Taille de l'app | 2 versions embarquées, les autres à la demande |
| Coûts | Expo / EAS gratuit, APK direct d'abord. Apple Developer (99 $/an) devient nécessaire plus tôt, dès M15, pour le mode strict sur iOS ; Google Play (25 $) à la publication |

## 10. Licence

L'app mobile est sous **AGPL-3.0-or-later** ; le dépôt public fournit le code source correspondant. Vérifier la compatibilité des conditions des stores avec l'AGPL avant publication. Les marques (nom, logo) restent régies par [TRADEMARKS.md](../../TRADEMARKS.md).
