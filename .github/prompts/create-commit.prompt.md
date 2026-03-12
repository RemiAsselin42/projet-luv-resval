---
name: create-commit
description: 'Analyse les modifications depuis le dernier commit, les découpe en commits logiques, exécute les commits avec des messages clairs en français suivant les Conventional Commits. Use when: créer commits, faire un commit, committer, découper commits, messages de commit, git commit, stage changes, split commits.'
argument-hint: Faut-il créer un commit unique ou plusieurs commits logiques ?
agent: agent
---

# Créer des Commits Logiques et Descriptifs

Tu es un expert Git qui aide à créer des commits de haute qualité en français. Ton rôle est d'analyser les modifications, de les organiser en commits logiques, et d'exécuter les commits avec des messages clairs et descriptifs.

## Processus

### 1. Inspection de l'état actuel

Commence par examiner l'état du dépôt :

- `git status` : liste les fichiers modifiés
- `git diff` : affiche les modifications non indexées
- `git diff --stat` : résumé des changements si nombreux

### 2. Analyse des modifications

Pour chaque fichier modifié, identifie :

- Le type de changement (feature, fix, refactor, style, test, docs, perf, chore)
- Le scope affecté (composant, module, ou zone du projet)
- Les changements liés entre eux vs. indépendants

### 3. Définition des limites de commits

**Critères de découpage :**

- Fonctionnalité vs refactoring
- Backend vs frontend
- Formatage vs logique
- Tests vs code de production
- Mise à jour de dépendances vs changements de comportement
- Changements dans différents modules/features

**Règle d'or :** Un commit = un changement logique cohérent qui pourrait être revert indépendamment.

### 4. Staging sélectif

Pour chaque commit logique identifié :

- Utilise `git add -p` pour l'ajout interactif si les changements sont mélangés dans un fichier
- Utilise `git add <fichier>` pour ajouter des fichiers entiers
- Utilise `git restore --staged <fichier>` pour désindexer si nécessaire

### 5. Vérification avant commit

Avant chaque commit, vérifie les modifications indexées :

- `git diff --cached` : affiche exactement ce qui sera commité
- Vérifie l'absence de :
  - Secrets ou tokens
  - Logs de debug accidentels
  - Changements de formatage non liés
  - Code commenté inutile

### 6. Rédaction du message de commit

**Format Conventional Commits (OBLIGATOIRE) :**

```
type(scope): résumé court (max 72 caractères)

Corps du message expliquant :
- Quels changements ont été apportés
- Pourquoi ces changements étaient nécessaires
- Quel impact ils ont sur le projet

BREAKING CHANGE: description si applicable
```

**Types de commits :**

- `feat`: Nouvelle fonctionnalité
- `fix`: Correction de bug
- `refactor`: Refactoring sans changement de comportement
- `style`: Formatage, points-virgules, etc.
- `test`: Ajout ou modification de tests
- `docs`: Documentation uniquement
- `perf`: Amélioration de performance
- `chore`: Tâches de maintenance (deps, config, etc.)
- `build`: Changements du système de build
- `ci`: Changements de CI/CD

**Exemples de messages :**

```
feat(scroll-manager): ajoute la synchronisation avec les sections 3D

Implémente un système qui synchronise le scroll de la page avec
les animations des objets Three.js. Utilise Lenis pour le smooth scroll
avec détection des sections visibles et transitions fluides.

Impact : améliore la fluidité de l'expérience utilisateur.

fix(beatmaker): corrige le timing des samples audio

Les samples entre 0.5 et 1.5 secondes étaient incorrectement décalés.
Utilise requestAnimationFrame au lieu de setTimeout pour respecter
la synchronisation audio précise.

Corrige #42
```

### 7. Exécution du commit

- Utilise `git commit -v` pour voir le diff pendant la rédaction
- Ou `git commit -m "type(scope): message"` pour les messages courts
- Pour les messages multi-lignes, privilégie `git commit -F <fichier_message>`
   ou `git commit` (éditeur interactif) pour garantir de vrais retours à la ligne
   dans le corps.
- N'utilise jamais des séquences littérales `\n` dans les arguments `-m`.
- Important : chaque option `-m` crée un paragraphe distinct. Ne fais jamais
   `-m` ligne par ligne, sinon le message contient des lignes blanches inutiles.
- Si `-m` est nécessaire en CLI, limite-toi à :
   - un `-m` pour le sujet
   - un seul `-m` pour tout le corps (multi-lignes dans un seul bloc)
- Après commit, vérifie systématiquement le rendu exact avec
   `git log -1 --pretty=%B`.
- Exécute la commande et affiche le résultat

### 8. Vérification rapide

Après chaque commit :

- Affiche le hash et le message : `git log -1 --oneline`
- Vérifie que les tests passent (si applicable) : `npm test` ou équivalent
- Continue avec le prochain commit

### 9. Itération

Répète les étapes 4 à 8 jusqu'à ce que `git status` soit propre.

## Livrables

Pour chaque session de commit, fournis :

1. **Résumé des commits créés :**
   - Hash et message de chaque commit
   - Liste des fichiers inclus par commit
2. **Justification du découpage :**
   - Pourquoi ces regroupements spécifiques
   - Quels critères ont guidé la séparation

3. **Commandes exécutées :**
   - Toutes les commandes git utilisées
   - Résultat de `git diff --cached` avant chaque commit

## Principes à respecter

✅ **À FAIRE :**

- Messages de commit en français, clairs et descriptifs
- Découpage logique et cohérent
- Staging sélectif avec `git add -p` quand nécessaire
- Vérification systématique avec `git diff --cached`
- Messages au passé composé ("ajoute", "corrige", "modifie")
- Corps du message qui explique le "pourquoi", pas le "comment"

## Référence

Pour plus de détails sur les bonnes pratiques de commits, consulte :

- `.claude/skills/commit-work/SKILL.md`
- `.claude/skills/commit-work/README.md`

Applique ces principes avec rigueur pour créer un historique git propre, lisible et professionnel.
