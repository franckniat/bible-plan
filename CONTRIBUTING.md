# Contribuer à Bible Plan

Merci de votre intérêt ! Ce guide explique comment proposer une contribution.

En participant, vous acceptez de respecter le [Code de conduite](CODE_OF_CONDUCT.md).

## Licence de vos contributions

Bible Plan est distribué sous **GNU AGPL-3.0-or-later**. Toute contribution acceptée est publiée sous cette même licence (*inbound = outbound*). Vous restez titulaire de vos droits d'auteur.

## Developer Certificate of Origin (DCO)

Chaque commit doit être **signé** pour certifier que vous avez le droit de soumettre le code, conformément au [Developer Certificate of Origin 1.1](https://developercertificate.org/) reproduit ci-dessous.

Utilisez l'option `-s` :

```bash
git commit -s -m "feat(plans): add weekday selection (#13)"
```

Elle ajoute une ligne `Signed-off-by: Votre Nom <votre@email>` au message, qui doit correspondre à l'auteur du commit. Les pull requests contenant des commits non signés ne seront pas fusionnées.

Pour signer après coup les commits d'une branche :

```bash
git rebase --signoff main
```

<details>
<summary>Texte du DCO 1.1</summary>

```
Developer Certificate of Origin
Version 1.1

Copyright (C) 2004, 2006 The Linux Foundation and its contributors.

Everyone is permitted to copy and distribute verbatim copies of this
license document, but changing it is not allowed.


Developer's Certificate of Origin 1.1

By making a contribution to this project, I certify that:

(a) The contribution was created in whole or in part by me and I
    have the right to submit it under the open source license
    indicated in the file; or

(b) The contribution is based upon previous work that, to the best
    of my knowledge, is covered under an appropriate open source
    license and I have the right under that license to submit that
    work with modifications, whether created in whole or in part
    by me, under the same open source license (unless I am
    permitted to submit under a different license), as indicated
    in the file; or

(c) The contribution was provided directly to me by some other
    person who certified (a), (b) or (c) and I have not modified
    it.

(d) I understand and agree that this project and the contribution
    are public and that a record of the contribution (including all
    personal information I submit with it, including my sign-off) is
    maintained indefinitely and may be redistributed consistent with
    this project or the open source license(s) involved.
```

</details>

## Messages de commit

Le projet suit [Conventional Commits](https://www.conventionalcommits.org/fr/) :

```
type(scope): description courte (#numéro-issue)
```

- **types** : `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`, `ci`
- **scopes** : `core`, `db`, `auth`, `i18n`, `ui`, `web`, `plans`, `bible`, `reminders`, `prayer`, `meditation`, `groups`, `mobile`, `github`
- un commit = une tâche cohérente ; le dernier commit d'une issue contient `Closes #n`.

## Mise en place locale

Prérequis : Node.js ≥ 20.9 et pnpm (version indiquée dans `package.json`).

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local   # puis renseigner les valeurs
pnpm dev
```

Avant d'ouvrir une pull request :

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Proposer un changement

1. Ouvrez (ou commentez) une issue pour discuter du changement.
2. Forkez le dépôt et créez une branche depuis `main`.
3. Faites des commits atomiques, signés, au format Conventional Commits.
4. Ouvrez une pull request qui référence l'issue.

## Sécurité

Ne signalez **pas** une vulnérabilité dans une issue publique : voir [SECURITY.md](SECURITY.md).
