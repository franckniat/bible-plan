# Feuille de route

Le suivi détaillé se fait dans les [issues](https://github.com/franckniat/bible-plan/issues) et les [milestones](https://github.com/franckniat/bible-plan/milestones). Chaque issue liste ses tâches : **une tâche = un commit** sur `main` (`type(scope): description (#n)`, signé avec `git commit -s`).

## Principes d'architecture

- La logique métier pure (canon biblique, générateur de plans, rattrapage, séries, échéances des rappels, schémas zod) vit dans `@workspace/core`, partagé avec la future app mobile.
- Les mutations web passent par des Server Actions qui délèguent à des services serveur (`apps/web/server/services`), réutilisables par une API REST pour le mobile.
- Le texte biblique provient de versions du domaine public (LSG 1910, KJV) embarquées dans `@workspace/bible-data` : aucune API payante, lecture possible hors ligne.
- 100 % gratuit : uniquement des offres gratuites (Neon, Vercel Hobby, Resend, PostHog, GitHub Actions). Seul coût : un nom de domaine pour les emails d’authentification.
- Notifications : dans l’app et en push. Resend sert aux emails d’authentification ; les rappels par email sont prêts mais désactivés (`EMAIL_REMINDERS_ENABLED`).

## M1 — Fondations

CI, packages de base, base de données, i18n, emails, authentification, squelette de l'app.

- [#1 CI GitHub Actions, Dependabot et Vitest](https://github.com/franckniat/bible-plan/issues/1)
- [#2 packages/core : socle de la logique métier partagée](https://github.com/franckniat/bible-plan/issues/2) — dépend de #1
- [#3 packages/db : Prisma + Neon](https://github.com/franckniat/bible-plan/issues/3) — dépend de #1
- [#4 packages/i18n + next-intl : application FR / EN](https://github.com/franckniat/bible-plan/issues/4) — dépend de #2
- [#5 packages/notifications : EmailSender (Resend)](https://github.com/franckniat/bible-plan/issues/5) — dépend de #4
- [#6 packages/auth : better-auth (email + mot de passe)](https://github.com/franckniat/bible-plan/issues/6) — dépend de #3, #5
- [#7 Pages d'authentification, Google et magic link](https://github.com/franckniat/bible-plan/issues/7) — dépend de #6
- [#8 Squelette de l'application et profil utilisateur](https://github.com/franckniat/bible-plan/issues/8) — dépend de #7

## M2 — Plans de lecture

Canon biblique, générateur de plans, modèles, création, page Aujourd'hui, gestion du retard.

- [#9 Canon biblique : livres, chapitres, versets](https://github.com/franckniat/bible-plan/issues/9) — dépend de #2
- [#10 Générateur de plans équilibrés](https://github.com/franckniat/bible-plan/issues/10) — dépend de #9
- [#11 Modèles de plans prédéfinis](https://github.com/franckniat/bible-plan/issues/11) — dépend de #10
- [#12 Persistance des plans et de la progression](https://github.com/franckniat/bible-plan/issues/12) — dépend de #11, #6
- [#13 Assistant de création de plan](https://github.com/franckniat/bible-plan/issues/13) — dépend de #12, #8
- [#14 Page Aujourd'hui et détail d'un plan](https://github.com/franckniat/bible-plan/issues/14) — dépend de #13
- [#15 Gestion du retard (rattrapage)](https://github.com/franckniat/bible-plan/issues/15) — dépend de #14

## M3 — Bible

Textes du domaine public (LSG 1910, KJV) et lecteur intégré.

- [#16 packages/bible-data : textes du domaine public (LSG 1910, KJV)](https://github.com/franckniat/bible-plan/issues/16) — dépend de #9
- [#17 Lecteur biblique intégré](https://github.com/franckniat/bible-plan/issues/17) — dépend de #16, #14

## M4 — Rappels

Rappels planifiés (cron GitHub Actions), notifications dans l'app, Web Push / PWA, contenu intelligent. Les rappels par email sont prêts mais désactivés.

- [#18 Modèle des rappels et calcul de la prochaine échéance](https://github.com/franckniat/bible-plan/issues/18) — dépend de #8, #2
- [#37 Centre de notifications dans l'application](https://github.com/franckniat/bible-plan/issues/37) — dépend de #8, #18
- [#19 Envoi des rappels : cron GitHub Actions + notifications](https://github.com/franckniat/bible-plan/issues/19) — dépend de #18, #37, #5
- [#20 PWA et notifications Web Push](https://github.com/franckniat/bible-plan/issues/20) — dépend de #19
- [#21 Contenu intelligent des rappels](https://github.com/franckniat/bible-plan/issues/21) — dépend de #20, #22

## M5 — Prière & méditation

Journal de prière, minuteur, notes de méditation, séries et statistiques.

- [#22 Journal de prière](https://github.com/franckniat/bible-plan/issues/22) — dépend de #8
- [#23 Minuteur de méditation](https://github.com/franckniat/bible-plan/issues/23) — dépend de #17
- [#24 Notes de méditation](https://github.com/franckniat/bible-plan/issues/24) — dépend de #23
- [#25 Séries et statistiques](https://github.com/franckniat/bible-plan/issues/25) — dépend de #22, #23, #14

## M6 — Groupes

Groupes, invitations, plan commun, prières partagées, commentaires.

- [#26 Groupes et invitations](https://github.com/franckniat/bible-plan/issues/26) — dépend de #8
- [#27 Plan de lecture commun au groupe](https://github.com/franckniat/bible-plan/issues/27) — dépend de #26, #15
- [#28 Sujets de prière partagés](https://github.com/franckniat/bible-plan/issues/28) — dépend de #26, #22
- [#29 Commentaires sur la lecture du jour](https://github.com/franckniat/bible-plan/issues/29) — dépend de #27

## M7 — Lancement

Landing, dons, PostHog, RGPD, accessibilité, e2e, mise en production.

- [#31 Landing, page Soutenir et SEO](https://github.com/franckniat/bible-plan/issues/31) — dépend de #8
- [#35 PostHog : analytics produit et suivi des erreurs](https://github.com/franckniat/bible-plan/issues/35) — dépend de #8
- [#36 Confidentialité et RGPD](https://github.com/franckniat/bible-plan/issues/36) — dépend de #25, #29
- [#32 Accessibilité et tests de bout en bout](https://github.com/franckniat/bible-plan/issues/32) — dépend de #21, #25, #29
- [#33 Mise en production](https://github.com/franckniat/bible-plan/issues/33) — dépend de #32, #31, #35, #36

## Hors milestone

Travaux planifiés après la v1 web.

- [#30 Connexion avec Apple](https://github.com/franckniat/bible-plan/issues/30) — dépend de #7
- [#34 [Épique] Application mobile Expo](https://github.com/franckniat/bible-plan/issues/34) — dépend de #33, #30
