# Connexion avec Google

Le bouton « Continuer avec Google » est déjà dans le code (pages de connexion et d'inscription, `packages/auth`). Il apparaît dès que `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` sont définis, et reste caché sinon. Il reste à créer le client OAuth dans Google Cloud et à en copier les deux valeurs.

Les valeurs de `<domaine>` ci-dessous sont celles du site déployé (par exemple `bible-plan.franckniat.me`). Le même `<domaine>`, en `https://` et sans barre finale, doit être dans `BETTER_AUTH_URL` sur Vercel.

## 1. Projet et écran de consentement

[console.cloud.google.com](https://console.cloud.google.com) → créer un projet « Bible Plan » → **Google Auth Platform** (ou *API et services → Écran de consentement OAuth*).

| Champ | Valeur |
|---|---|
| Nom de l'application | `Bible Plan` |
| E-mail d'assistance utilisateur | une adresse qui reçoit du courrier, par exemple `hello@franckniat.me` |
| Logo de l'application | `apps/web/public/icons/icon-512.png` (carré, 512 × 512, 27 Ko ; Google demande un PNG ou JPG carré de 1 Mo au plus, il l'affiche en 120 × 120) |
| Page d'accueil de l'application | `https://<domaine>/fr` |
| Lien vers les règles de confidentialité | `https://<domaine>/fr/privacy` |
| Lien vers les conditions d'utilisation | `https://<domaine>/fr/terms` |
| Domaines autorisés | le domaine racine, sans `https://` ni sous-domaine, par exemple `franckniat.me` |
| E-mail du développeur | votre adresse |
| Type d'audience | **Externe** |

Les pages de confidentialité et de conditions existent en anglais aussi (`/en/privacy`, `/en/terms`) ; Google n'en demande qu'une.

**Champs d'application (scopes)** : uniquement les trois de base, `openid`, `.../auth/userinfo.email` et `.../auth/userinfo.profile`. Ils ne sont pas « sensibles » : aucune vérification de sécurité n'est exigée, seulement celle de la marque (nom, logo, domaine).

**État de publication**
- Tant que l'application est en **Test**, seuls les comptes listés dans *Utilisateurs tests* (100 au plus) peuvent se connecter. Ajoutez-y votre adresse et celles de vos testeurs.
- Pour que tout le monde puisse se connecter, passez-la en **En production**. Avec les scopes de base, c'est immédiat ; la vérification de la marque (logo, nom, domaine) peut demander quelques jours. Sans elle, Google affiche juste un écran « application non vérifiée » avec un avertissement.
- Le domaine doit vous appartenir et être vérifié dans la **Search Console** de Google. Un domaine `*.vercel.app` ne peut pas l'être : pour une vraie mise en production avec la marque affichée, prévoyez un domaine à vous (celui de l'adresse `hello@franckniat.me` convient, par exemple avec un sous-domaine).

## 2. Deux clients OAuth : local et production

*Identifiants → Créer des identifiants → ID client OAuth → Application Web.* Un client par environnement évite de mélanger les adresses de retour.

### Client « Bible Plan (local) »

| Champ | Valeur |
|---|---|
| Nom | `Bible Plan (local)` |
| Origines JavaScript autorisées | `http://localhost:3002` |
| URI de redirection autorisés | `http://localhost:3002/api/auth/callback/google` |

Le port est celui de `BETTER_AUTH_URL` dans `apps/web/.env.local` (3002 ici). Si vous lancez le site sur `3000`, ajoutez aussi `http://localhost:3000` et `http://localhost:3000/api/auth/callback/google`.

### Client « Bible Plan (production) »

| Champ | Valeur |
|---|---|
| Nom | `Bible Plan (production)` |
| Origines JavaScript autorisées | `https://<domaine>` |
| URI de redirection autorisés | `https://<domaine>/api/auth/callback/google` |

Google n'accepte pas de joker : les déploiements de prévisualisation Vercel (`xxx-git-branche.vercel.app`) ne peuvent pas se connecter avec Google. Utilisez la connexion par e-mail pour les tester. Si le site est servi aussi en `www.`, ajoutez les deux variantes.

## 3. Variables d'environnement

Chaque client donne un **ID client** et un **Secret client**.

| Où | Variables |
|---|---|
| Local, `apps/web/.env.local` | `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` du client « local » |
| Vercel, environnement **Production** | `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` du client « production », et `BETTER_AUTH_URL=https://<domaine>` |

Sans guillemets dans Vercel. Redémarrez le serveur de développement (ou redéployez) après les avoir ajoutées. Le secret ne se met jamais dans le dépôt ni dans un message.

## 4. Vérifier

1. Les pages `/fr/sign-in` et `/fr/sign-up` montrent « Continuer avec Google ».
2. Le clic ouvre le choix du compte Google avec le nom et le logo de Bible Plan, puis revient sur l'application connecté.
3. Le compte est créé avec le nom du profil Google et la langue du site ; l'e-mail est déjà vérifié.
4. Si l'adresse existait déjà (compte par mot de passe ou lien magique), better-auth rattache Google à ce compte au lieu d'en créer un autre.

**Erreurs fréquentes**
- `redirect_uri_mismatch` : l'URI de redirection de la console ne correspond pas exactement à `<BETTER_AUTH_URL>/api/auth/callback/google` (http ou https, port, barre finale).
- « Accès bloqué : l'application n'a pas terminé la validation » : l'application est en Test et l'adresse n'est pas dans les utilisateurs tests.
- Le bouton n'apparaît pas : une des deux variables est vide, ou le serveur n'a pas été redémarré.
