# Installer la bêta Android de Bible Plan

La bêta est l'application complète **sans compte** : la Bible hors ligne, les
plans de lecture, le journal de prière, les rappels, les statistiques et les
trophées. Tout reste sur le téléphone ; une sauvegarde se fait depuis
**Réglages › Mes données**.

Elle se télécharge en dehors du Play Store, sous la forme d'un fichier APK.

## Installer

1. Sur le téléphone Android, ouvrez la page des
   [versions de Bible Plan](https://github.com/franckniat/bible-plan/releases)
   et prenez la dernière marquée **Pre-release** (« Bible Plan … beta … (Android) »).
2. Touchez le fichier `bible-plan-….apk` pour le télécharger.
3. Ouvrez-le depuis la notification de téléchargement ou l'app **Fichiers**.
4. Android demande d'autoriser l'installation d'applications depuis cette
   source (le navigateur ou Fichiers) : autorisez-la, puis revenez et
   touchez **Installer**.
5. Si Play Protect affiche un avertissement (application inconnue), touchez
   **Installer quand même** : l'application n'est pas encore publiée sur le
   Play Store, c'est la seule raison de l'avertissement.

## Mettre à jour

Installez la nouvelle version par-dessus l'ancienne, de la même façon : vos
plans, prières, notes et surlignages sont gardés. **Ne désinstallez pas**
l'application avant, cela effacerait vos données (faites une sauvegarde
d'abord si vous devez le faire).

## Signaler un problème

Décrivez ce que vous faisiez, ce qui s'est passé et ce que vous attendiez,
avec une capture d'écran si possible, dans une
[issue GitHub](https://github.com/franckniat/bible-plan/issues/new) ou
directement à la personne qui vous a envoyé le lien.

## Pour publier une bêta

Dans GitHub, **Actions › Beta APK › Run workflow** : le workflow construit
l'APK, le signe avec la clé de la bêta (secrets `ANDROID_KEYSTORE_BASE64`,
`ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`) et publie une
pré-version. Toutes les bêtas doivent être signées avec la même clé, sans
quoi Android refuse la mise à jour : gardez une copie du fichier de la clé
et de son mot de passe en lieu sûr.
