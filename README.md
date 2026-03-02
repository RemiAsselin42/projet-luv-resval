# Projet Luv Resval

Tribute artistique au rappeur Luv Resval avec une expérience web immersive combinant 3D, animations, et interactivité.

## Description

Site web artistique mettant en lumière le style unique de Luv Resval et son influence dans le rap. Le projet combine des éléments visuels 3D (Three.js), des animations fluides (GSAP), et une interface interactive inspirée de ses thèmes musicaux : cinéma, science-fiction, Star Wars, et ambiances dystopiques.

## Fonctionnalités

- **Visage 3D hybride** : Luv Resval / Darth Vader réactif aux interactions
- **Drillz 3D** : Souris animée révélant un univers musical
- **MPC Drum Machine** : Interface pour créer des beats
- **Défilement Star Wars** : Histoire et carrière de l'artiste
- Références complètes à sa discographie
- Thèmes : Star Wars, Zelda, Harry Potter, dystopie, mélancolie

## Technologies

- **Build & Dev**: [Vite](https://vitejs.dev/)
- **3D Rendering**: [Three.js](https://threejs.org/) v0.183
- **Animations**: [GSAP](https://greensock.com/gsap/) v3.14
- **Styles**: SASS/SCSS
- **Type Checking**: TypeScript v5.8 (strict mode)
- **Linting**: ESLint v9 + Stylelint v16
- **Formatage**: Prettier v3

## Scripts disponibles

```bash
# Développement
npm run dev              # Lance le serveur de dev (port 5173)

# Build
npm run build            # Build de production
npm run preview          # Prévisualiser le build

# Qualité de code
npm run lint             # Lint JavaScript/TypeScript
npm run lint:fix         # Fix auto des problèmes ESLint
npm run lint:style       # Lint SCSS/CSS
npm run lint:style:fix   # Fix auto des problèmes Stylelint
npm run format           # Formater le code avec Prettier
npm run format:check     # Vérifier le formatage
npm run typecheck        # Vérifier les types TypeScript

# Tests
npm test                 # Lancer les tests (à configurer)
```

## Structure du projet

```
projet-luv-resval/
├── .github/
│   └── workflows/       # GitHub Actions CI/CD
├── src/
│   ├── styles/          # Variables et mixins SCSS
│   ├── main.ts          # Point d'entrée
│   └── style.scss       # Styles principaux
├── docs/
│   └── AGENTS.md        # Documentation pour les agents
├── index.html           # HTML principal
└── vite.config.ts       # Configuration Vite
```

## Workflow CI/CD

Deux workflows GitHub Actions :

- **CI** (`ci.yml`) : Lint, typecheck, build sur push/PR
- **Deploy** (`deploy.yml`) : Déploiement automatique sur GitHub Pages

## 🔧 Configuration

- **TypeScript**: Mode strict activé (`tsconfig.json`)
- **ESLint**: Flat config moderne (`eslint.config.js`)
- **Stylelint**: Configuration SCSS standard (`.stylelintrc.json`)
- **Prettier**: Formatage cohérent (`.prettierrc.json`)
- **EditorConfig**: Consistance entre éditeurs (`.editorconfig`)

## Variables d'environnement

Copier `.env.example` vers `.env` et ajuster selon vos besoins.

## Développement

1. Créer une **branche** (`git checkout -b feature/nouvelle-fonctionnalite`)
2. **Commit** (`git commit -m 'Ajout nouvelle fonctionnalité'`)
3. **Push** (`git push origin feature/nouvelle-fonctionnalite`)

## Ressources

- [Documentation Three.js](https://threejs.org/docs/)
- [Documentation GSAP](https://greensock.com/docs/)
- [Site officiel Luv Resval](https://luvresval-officiel.com)
- [Wikipedia Luv Resval](https://fr.wikipedia.org/wiki/Luv_Resval)

---

**MPC Part III** - Tribute artistique à Luv Resval
