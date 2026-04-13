# BASE.md — Socle technique du projet

> Fichier réutilisable sur tous les projets.
> Contient uniquement les règles techniques.
> Pour l'architecture du design system, voir DS-ARCHITECTURE.md.
> Pour les règles d'usage du projet, voir DESIGN-RULES.md.

---

## 1. Stack technique

- Framework : Next.js App Router
- Language : TypeScript 5 — typage strict, pas de `any`
- Style : Tailwind v4
- Composants : base-ui/react (primitives accessibles, sans style)
- Animation : Framer Motion
- Lint : ESLint 9

---

## 2. Structure des fichiers
```
app/                    → pages et layout Next.js
app/globals.css         → tokens CSS + Tailwind

components/
├── ui/                 → atomes
│                         Composants de base indivisibles
│                         Jamais de logique métier
│
├── blocks/             → molécules
│                         Assemblages de composants ui
│                         Peut recevoir des données en props
│
├── modules/            → organismes
│                         Sections complètes de page
│                         Peut fetcher ses propres données
│
└── pages/              → templates
                          Assemblages de modules

public/                 → assets statiques
public/fonts/           → fonts en .woff2
```

### Conventions de nommage
- Fichiers et dossiers : PascalCase
- Un composant principal par fichier
- Variantes et états gérés par props
- Composants découpés si > 80 lignes

---

## 3. Conventions de code

- Props typées exhaustivement — interface dédiée par composant
- JSDoc sur chaque prop
- Exports : named ET default
- Pas de `any`, pas de `// @ts-ignore`
- Imports organisés :
  React → libs externes → composants → types

---

## 4. Tokens — règle absolue

Les composants consomment uniquement :
- Les tokens de `Theme-color` → couleurs et états
- Les tokens de `Typographie` → styles de texte
- Les tokens d'`Effets` → ombres et blur

Les `Fondations` ne sont jamais appelées
directement dans les composants.
Aucune valeur hardcodée — tout passe par les tokens.

---

## 5. Animations

- Easing : `--fondations-motion-ease-*`
- Durées : `--fondations-motion-duration-*`
- Framer Motion pour toutes les interactions
- Tableaux fallback déclarés comme constantes
  stables hors du corps des hooks
- Aucune valeur d'animation hardcodée

---

## 6. Lecture Figma — Instructions MCP

Lire UNIQUEMENT les collections de variables
du fichier Figma fourni dans cet ordre :
1. `Fondations`
2. `Typographie`
3. `Theme-color`
4. `Effets`

Ignorer : fills, styles locaux, couleurs
directement appliquées sur les calques.

---

## 7. Règles de livraison

Avant tout commit ou livraison :
- `tsc --noEmit` passe sans erreur
- `eslint .` passe sans erreur
- Aucune valeur hardcodée introduite
- Rapport de modifications généré