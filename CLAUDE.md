## MemPalace — Indexation des sessions et du code

Ce projet utilise **MemPalace** pour centraliser et chercher dans l'historique des conversations et la documentation du code.

### Pourquoi MemPalace ?
- **Traçabilité des décisions** — retrouver pourquoi une architecture a été choisie
- **Context retrieval** — accéder rapidement aux discussions passées sur une feature
- **Continuité** — quand Claude revient, il peut chercher l'historique du projet sans le relire entièrement

### Comment ça marche
- **Auto-indexation** — chaque commit déclenche `.git/hooks/post-commit` qui exporte les sessions dans `~/.mempalace/palace`
- **Search centralisée** — une base unique pour conversations + code du projet
- **Zéro maintenance** — tout est automatique

### Commandes clés
```bash
# Chercher dans tout le palace
source ~/.claude/env-config.sh
mempalace search "ta requête"
mempalace search "pourquoi sections dynamiques"  # retrouve les décisions

# Voir le contexte de réveil (essentiellement du projet)
mempalace wake-up --wing projet_luv_resval

# Voir l'état du palace
mempalace status
```

### Structure du palace
```
WING: conversations        — Historique des sessions Claude (6 drawers)
WING: projet_luv_resval    — Code + docs du projet (591 drawers)
  ROOM: src                — Code source
  ROOM: documentation      — Fichiers .md
  ROOM: general            — Config, scripts, etc.
```

---

## graphify — Cartographie intelligente du code

Ce projet utilise **graphify** pour construire une carte de dépendances du code et répondre aux questions architecturales sans relire la codebase entière.

### Pourquoi graphify ?
- **Optimisation des réponses** — "qui appelle qui ?" se répond en ~30 tokens au lieu de 3000
- **Détection de couplage** — voir les points d'intégration critiques (CRT, sections, audio)
- **Navigation rapide** — trouver le chemin d'une fonctionnalité de bout en bout

### Comment ça marche
- **Graph auto-généré** — `graphify-out/graph.json` contient les nœuds (fichiers, fonctions) et les arêtes (imports, appels)
- **God nodes** — le graph identifie les fichiers centraux (ex. `main.ts`, `sectionManager.ts`)
- **Query API** — `graphify query "comment la section MPC s'intègre"` traverse le graph intelligemment

### Commandes clés
```bash
# Chercher une question architecturale
graphify query "qui appelle crtManager ?"
graphify query "quels fichiers importent audioManager" --budget 500

# Voir le rapport du graph
cat graphify-out/GRAPH_REPORT.md
```

### Structure du graph
```
graphify-out/
  ├── graph.json           — Nœuds et arêtes du code
  ├── GRAPH_REPORT.md      — Résumé : god nodes, communities
  ├── wiki/                — Pages navigables par sujet
  └── memory/              — Q&A feedback pour affiner le graph
```

### Regles d'utilisation
- Before answering architecture or codebase questions, read `graphify-out/GRAPH_REPORT.md` for god nodes and community structure
- If `graphify-out/wiki/index.md` exists, navigate it instead of reading raw files
- After modifying code files in this session, run `python3 -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"` to keep the graph current
