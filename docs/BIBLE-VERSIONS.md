# Ajouter une version de la Bible

Le registre des versions (`packages/bible-data/src/versions.ts`) est la seule liste que le code consulte : sélecteur de version du lecteur et des réglages, valeur par défaut selon la langue, comparaison, lecture parallèle, surbrillances. Ajouter une version, c'est lui donner ses chapitres et une entrée dans ce registre, sans toucher au reste.

> Ne publier qu'un texte **du domaine public** (ou dont la licence l'autorise clairement). Le texte n'est pas couvert par l'AGPL : noter la source et les droits dans [NOTICE](../NOTICE).

## 1. Les chapitres

Chaque chapitre est un fichier `packages/bible-data/data/<id>/<livre OSIS>/<chapitre>.json` :

```json
{ "version": "lsg1910", "book": "John", "chapter": 3, "verses": [[1, "Mais il y eut un homme…"]] }
```

Pour une version publiée par eBible.org, le script d'import les produit à partir de l'archive « VPL » :

1. Ajouter l'identifiant eBible.org de la version dans `sources`, en haut de `packages/bible-data/scripts/import-ebible.ts` (par exemple `lsg1910: "fraLSG"`).
2. Lancer l'import. Il remplace le dossier de la version :

   ```bash
   pnpm --filter @workspace/bible-data import:ebible <id>
   ```

3. Vérifier que `data/<id>/index.json` existe : il contient la source et le nombre de versets de chaque chapitre (`verseCounts`), dans la numérotation de la version.

Pour une autre source, produire les mêmes fichiers (`chapterSchema` dans `src/chapter.ts` décrit le format) et le même `index.json`.

## 2. L'entrée du registre

Dans `packages/bible-data/src/versions.ts`, importer l'index et ajouter une entrée à la liste `versions` :

```ts
import nvsIndex from "../data/nvs/index.json"

// …
{
  id: "nvs",
  name: "Nom complet de la version",
  abbreviation: "NVS",
  language: "fr",          // "fr" ou "en" : langue de l'application où elle est proposée par défaut
  year: 2000,
  source: nvsIndex.source,
  youVersion: { id: 0, abbreviation: "NVS" }, // la même traduction sur bible.com (lien « lire dans une autre traduction »)
  verseCounts: nvsIndex.verseCounts,
},
```

Le type `BibleVersionId` se déduit de la liste : l'identifiant est aussitôt accepté partout (réglages du profil, `?v=`, cookie, `?compare=`).

Si plusieurs versions ont la même `language`, la première de la liste est celle proposée par défaut dans cette langue.

## 3. Ce que vérifie `pnpm test`

`packages/bible-data/test/versions.test.ts` contrôle que chaque version déclarée a :

- un identifiant unique ;
- tous les chapitres du canon (un fichier par chapitre) et le bon nombre de chapitres par livre ;
- une version par défaut pour chaque langue de l'application.

## Numérotation différente

Beaucoup de versions ne numérotent pas tous les chapitres comme le canon des plans (la King James). Les titres de psaumes comptés comme versets de la Louis Segond en sont l'exemple. Rien à faire de plus que d'avoir des `verseCounts` exacts : les surbrillances, la comparaison et la lecture parallèle rangent les versets selon le canon (`versionVersesOf` et `canonVerseOf`, dans `src/versification.ts`) et affichent chaque version dans sa propre numérotation. Pour un chapitre dont le découpage est très différent, la correspondance est approximative, comme pour les passages d'un plan.
