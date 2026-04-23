# Figma Variable Linter — Design Spec

**Date:** 2026-04-23
**Statut:** Approuvé

---

## Contexte

Dans le pipeline GenDS (Figma → CSS → React), les designers doivent lier chaque propriété visuelle à une variable Figma pour que les tokens exportés soient cohérents. Sans garde-fou, des valeurs brutes (couleurs hex, tailles en px, etc.) se glissent dans les composants et cassent la chaîne de tokenisation.

Ce plugin permet d'auditer une sélection Figma et de visualiser les violations directement sur le canvas.

---

## Objectif

Créer un plugin Figma standalone qui :
1. Audite les layers sélectionnés (récursivement)
2. Détecte les propriétés non liées à une variable Figma
3. Affiche des badges d'annotation sur le canvas pour chaque violation
4. Se nettoie en un clic

---

## Architecture

Plugin Figma standard (pas un widget), sans dépendance externe.

```
figma-plugin-variable-linter/
├── manifest.json    — nom, permissions, entrypoints
├── code.ts          — logique d'audit + création des overlays (sandbox Figma)
└── ui.html          — panel UI (Run / Clear / compteur)
```

Communication via `postMessage` :
- `ui → code` : `{ type: 'run' }` | `{ type: 'clear' }`
- `code → ui` : `{ type: 'result', count: number }`

---

## Logique d'audit

Parcours récursif de tous les layers de la sélection. Pour chaque layer, vérification via l'API `boundVariables`.

### Propriétés auditées

| Catégorie | Propriétés |
|---|---|
| Couleurs | `fills`, `strokes` |
| Typographie | `fontSize`, `fontFamily`, `lineHeight`, `letterSpacing` |
| Spacing | `paddingLeft`, `paddingRight`, `paddingTop`, `paddingBottom`, `itemSpacing`, `counterAxisSpacing` |
| Radius | `cornerRadius`, `topLeftRadius`, `topRightRadius`, `bottomLeftRadius`, `bottomRightRadius` |
| Effets | `effects` (shadows uniquement — blurs exclus) |

### Règle de filtrage

- Les valeurs **égales à zéro** sont ignorées (propriété non appliquée : `radius: 0`, `padding: 0`)
- Toute autre valeur, y compris `opacity: 1`, est flaggée — c'est une valeur intentionnelle qui devrait être tokenisée

### Structure d'une violation

```ts
{
  layerId: string
  layerName: string
  property: string   // ex: "fill", "fontSize"
  rawValue: string   // ex: "#FF0000", "14"
}
```

---

## Badges overlay

Pour chaque violation, un badge frame est créé sur le canvas.

**Positionnement :**
- Coin supérieur gauche du layer (`absoluteBoundingBox.x / y`)
- Offset de `-4px` pour déborder légèrement sans masquer le layer
- Si plusieurs violations sur le même layer : empilement vertical (`+20px` par badge)

**Style du badge :**
- Fond : `#FF3B30`
- Texte : blanc, `fontSize: 10`, `fontFamily: Inter`
- Padding : `2px 6px`
- Border-radius : `4px`
- Contenu : `{property}: {rawValue}` — ex: `fill: #FF0000`

**Regroupement :**
Tous les badges sont enfants d'un frame racine nommé `[Audit]`, ajouté directement à `figma.currentPage`. Ce frame est le seul artefact créé par le plugin — son existence sert aussi d'indicateur qu'un audit est en cours.

---

## Panel UI

Fenêtre fixe `width: 240px`.

```
┌─────────────────────────┐
│  Variable Linter        │
│                         │
│  [  Run Audit  ]        │
│                         │
│  → 12 violations found  │
│                         │
│  [  Clear  ]            │
└─────────────────────────┘
```

**Comportements :**
- Si rien n'est sélectionné au Run : message `"Select at least one layer"`
- Après Run : affiche `"X violations found"` ou `"No violations"` si propre
- Clear : supprime `[Audit]` du canvas + remet le compteur à zéro

---

## Ce qui est hors scope

- Audit de la page entière (phase ultérieure)
- Export/rapport des violations
- Intégration CI (phase code — voir note ci-dessous)

---

## Note — Phase 2 (code)

La même logique d'audit sera reproduite côté React sous forme de règles ESLint, en extension de la règle existante `no-hardcoded-px-in-style` du launcher GenDS. Les propriétés à couvrir seront les mêmes : couleurs, spacing, typo, radius.
