---
description: 'Trouve le code mort (unreachable, unused, deprecated) dans le projet.'
argument-hint: '[répertoire ou fichier spécifique, ou vide pour analyser tout src/]'
allowed-tools: Read, Grep, Glob, Bash(npm run type-check:*), Bash(npx tsc:*)
context: fork
agent: agent
---

## Périmètre d'analyse

"$ARGUMENTS"

## Objectif

Identifier tout le code mort dans le projet TypeScript : branches inatteignables, fonctions/exports jamais utilisés, variables déclarées mais ignorées, conditions toujours vraies/fausses.

## Processus

### 1. Collecte du périmètre

```bash
# Fichiers source à analyser (hors tests, hors generated)
find src/ -name "*.ts" -o -name "*.tsx" | grep -v ".d.ts"
```

Si `$ARGUMENTS` est fourni, restreins l'analyse à ce chemin.

### 2. Catégories de code mort à chercher

#### A. Branches logiquement inatteignables

Cherche les patterns où une condition est **toujours vraie ou toujours fausse** à l'endroit où elle est évaluée :

- `if (x)` après un bloc qui garantit déjà `x === true` (ex: `ghostTypes.length > 0` + toutes les valeurs déjà décomposées)
- `if (!x)` après un early return sur `x` falsy
- `return` final après un `if (guaranteed_true) { return; }` (le return final ne peut jamais être atteint)
- `switch` avec `default` structurellement impossible si l'union TypeScript est exhaustive

Patterns à grep :

```
// Retour "fourre-tout" après logique exhaustive
'Cas non géré'
'Should never happen'
'unreachable'
'impossible'
```

#### B. Exports jamais importés (dead exports)

Cherche les fonctions/types/constantes exportés mais jamais utilisés dans le reste du projet :

```bash
# Liste tous les exports nommés
grep -r "^export " src/ --include="*.ts" -h | sort

# Pour chaque export, vérifie s'il est importé ailleurs
grep -r "import.*{" src/ --include="*.ts"
```

#### C. Variables déclarées mais jamais lues

```bash
# const/let déclarés mais assignés sans jamais être lus
grep -rn "const [a-z]" src/ --include="*.ts"
```

Signaux : variable déclarée, jamais utilisée après (TypeScript les signale avec `noUnusedLocals`).

#### D. Code derrière un `return` ou `throw`

```bash
grep -rn -A3 "^  return " src/ --include="*.ts"
grep -rn -A3 "^  throw " src/ --include="*.ts"
```

Cherche du code sur la ligne suivante d'un `return`/`throw` sans condition.

#### E. Conditions toujours vraies (type narrowing TypeScript)

Exemple : `if (hasInvisible)` où TypeScript sait déjà que `hasInvisible === true` grâce au flow précédent.

Lire chaque fichier et raisonner sur le flow de contrôle : après quel chemin de code cette variable ne peut-elle avoir qu'une seule valeur ?

#### F. Dead code par import circulaire ou shadowing

```bash
grep -rn "^import " src/ --include="*.ts"
```

Cherche des imports déclarés mais dont le symbole n'est jamais utilisé dans le fichier.

### 3. Analyse file par file

Pour chaque fichier du périmètre :

1. **Lis le fichier** avec `Read`
2. **Identifie le flow de contrôle** : early returns, conditions exhaustives, unions TypeScript
3. **Marque les blocs suspects** : tout code après lequel un `return` est garanti
4. **Vérifie les usages** : pour les exports, grep leur nom dans tout le projet

### 4. Critères de sévérité

| Sévérité    | Critère                                                            |
| ----------- | ------------------------------------------------------------------ |
| 🔴 Certain  | Branch/code prouvablement inatteignable par raisonnement statique  |
| 🟡 Probable | Export non trouvé à l'import, mais peut-être utilisé dynamiquement |
| 🟢 Suspect  | Code difficile à déclencher mais pas impossible                    |

### 5. Format du rapport

Produis un rapport structuré :

````markdown
# Rapport : Code Mort

## Résumé

- **Fichiers analysés** : N
- **Occurrences trouvées** : X certaines, Y probables, Z suspectes

---

## 🔴 Code mort certain

### `src/features/ghost-sweep/fix.ts` — lignes 303-307

**Type** : Return inatteignable
**Raison** : À ce point du code, `ghostTypes.length > 0` et `hasEmpty = hasZeroSize = false`
impliquent `hasInvisible = true`. Le bloc `if (hasInvisible)` est toujours vrai,
rendant le `return { message: 'Cas non géré' }` structurellement inatteignable.

**Code mort** :

```typescript
return {
  success: false,
  message: 'Cas non géré',
  ghostTypes,
};
```
````

**Correction** : Supprimer le bloc `if (hasInvisible)` (remplacer par son corps direct)
et supprimer le return final.

---

## 🟡 Exports probablement inutilisés

### `src/shared/utils.ts` — `export function formatDate`

**Raison** : Aucun `import.*formatDate` trouvé dans src/
**Caveat** : Peut être utilisé depuis les tests ou une entrée non scannée

---

## 🟢 Code suspect

### `src/features/pixel-lock/detection.ts` — ligne 87

**Type** : Condition redondante
**Raison** : `node.type === 'RECTANGLE'` déjà vérifié en ligne 72, redondant en ligne 87

---

## Actions recommandées

- [ ] Supprimer les branches mortes certaines
- [ ] Vérifier les exports probablement inutilisés avant suppression
- [ ] Ajouter `// exhaustive` ou assertion TypeScript aux endroits épuisants une union

### 6. Conseils pour l'analyse TypeScript

- Une union `type GhostType = 'invisible' | 'empty' | 'zero-size'` entièrement décomposée via `includes()` rend toute branche `else` dead code
- Un `if (A || B || C)` qui fait early return, suivi de `if (A)` et `if (B)`, garantit `C === true` pour le code suivant
- TypeScript avec `strictNullChecks` + flow analysis peut prouver statiquement certains unreachable — cherche les `never` dans le type inféré

Fournis un rapport exhaustif, précis, et actionnable. Pour chaque occurrence certaine, inclus un exemple de correction.
