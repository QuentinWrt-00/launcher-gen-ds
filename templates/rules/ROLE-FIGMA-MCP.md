# ROLE-FIGMA-MCP.md
> Applique BASE.md + ces règles.
> À activer systématiquement quand tu implémente un composant depuis le MCP Figma.

Tu traduis le code généré par le MCP Figma en composant React conforme au projet.
Le code MCP est une **base de travail**, pas un résultat final. Applique chaque règle ci-dessous avant d'écrire le composant.

---

## Protocole de lecture Figma (Workflow obligatoire)

Avant d'écrire la moindre ligne de code pour un composant, tu dois suivre scrupuleusement ces étapes :

1. **Analyser le noeud Figma** : Utiliser `get_design_context` sur l'URL fournie pour récupérer la structure du composant et les noms des variables Figma appliquées.
2. **Résoudre via le Code (Source de vérité)** : Lire `app/_tokens.css`. Faire le mapping entre les variables Figma et les variables CSS du projet (appliquer la règle de conversion slash `/` → tiret `-`).
   - 🚨 *Si une variable Figma n'existe pas dans `_tokens.css`, tu ne dois pas inventer de valeur ni hardcoder de Hex/RGB. Tu dois le signaler dans ton rapport.*
   - 🚨 *Si tu détectes un groupe de variables typographiques, cherche la classe utilitaire `@utility typo-*` correspondante dans `_tokens.css`.*
3. **Vérifier les Assets** : Explorer le dossier `public/icons/` pour vérifier si les SVG nécessaires existent déjà avant de proposer un export.
4. **Vérifier les fonts** : Vérifier que `app/fonts.css` existe et est importé dans `globals.css`. Si absent, créer le fichier avec les `@font-face` des polices du projet (voir `ROLE-FONTS.md`) avant d'écrire le composant. Sans cette étape, les variables typographiques tombent sur `system-ui`.
5. **Appliquer les règles de nettoyage** : Supprimer les attributs de debug MCP, les fallbacks CSS, et appliquer les règles d'animation (Framer Motion / CSS) définies ci-dessous.
6. **Valider les décisions avant de coder** : Avant d'écrire la première ligne, figer explicitement :
   - Animation : `CSS transition` ou `motion.*` (appliquer §6 — pas de cas mixte non tranché)
   - Props : liste figée de l'interface (`label`, `disabled`, `className`…)
   - Tokens : mapping Figma → CSS complété, variables manquantes signalées
   - Assets : icônes présentes ✓ / manquantes → bloquer et informer l'utilisateur

   Ces 4 points résolus = coder immédiatement. Un seul point non résolu = poser la question à l'utilisateur, ne pas débattre en interne.

---

## 1. Noms de variables CSS — slash → tiret

Le MCP Figma conserve le `/` des groupes Figma dans les noms de variables CSS.
Notre `_tokens.css` utilise des `-`. Il faut toujours convertir.

```
MCP génère   →  var(--color-container\/primary)
À écrire     →  var(--color-container-primary)
```

**Règle :** remplacer `\/` par `-` dans tous les `var(--...)` du code MCP.

---

## 2. Typographie — toujours utiliser les classes utilitaires

Le MCP génère des propriétés `font-family`, `font-size`, `font-weight`, etc. individuelles.
Ces propriétés ne doivent **jamais** apparaître dans les composants.

**Règle :** remplacer l'ensemble des classes `font-[...]`, `text-[length:...]`, `leading-[...]`, `tracking-[...]` qui forment un style typographique par la classe utilitaire `typo-*` correspondante.

```
MCP génère   →  font-[family-name:var(--typography-label-md-alt\/font-family,...)]
                text-[length:var(--typography-label-md-alt\/font-size,...)]
                leading-[var(--typography-label-md-alt\/line-height,...)]
                tracking-[var(--typography-label-md-alt\/letter-spacing,...)]

À écrire     →  typo-label-md-alt
```

Classes disponibles dans `_tokens.css` : `typo-headline-md`, `typo-headline-sm`, `typo-body-lg`, `typo-body-lg-alt`, `typo-body-md`, `typo-body-md-alt`, `typo-body-sm`, `typo-label-lg-reg`, `typo-label-lg-light`, `typo-label-lg-caps`, `typo-label-md-reg`, `typo-label-md-light`, `typo-label-md-caps`, `typo-label-md-alt`, `typo-label-sm-reg`, `typo-label-sm-light`, `typo-label-sm-caps`, `typo-label-sm-alt`.

---

## 3. Assets SVG — export manuel, pas les URLs MCP

Les assets téléchargés depuis `localhost:3845` (serveur MCP) sont des **artefacts internes Figma** : dimensions non standard (`viewBox="0 0 2 2"`), variables CSS Figma internes (`fill="var(--fill-0, white)"`). Ils ne correspondent pas aux exports Figma réels et ne doivent pas être utilisés tels quels.

**Règle pour les icônes monochromes :**
1. **Avant tout** : lire `public/icons/` et lister explicitement dans ton rapport d'analyse les fichiers trouvés. Si l'icône nécessaire est présente, tu DOIS l'importer via SVGR — ne pas inline le SVG, ne pas recréer le fichier.
2. **Si le fichier existe mais que `fill` n'est pas `currentColor`** → **stopper immédiatement**. Ne pas modifier le fichier, ne pas créer un nouveau fichier. Informer l'utilisateur que le SVG n'a pas encore été optimisé et lui demander de lancer `npm run optimize-icons`. Ce script normalise `fill` et `stroke` en `currentColor` en place.
3. Si elle n'existe pas → **stopper immédiatement**. Lister les icônes manquantes dans le rapport final. Ne jamais extraire le SVG depuis Figma, ne jamais créer de placeholder, ne jamais inventer d'implémentation alternative (ni CSS pure, ni `<div>`, ni inline SVG). Informer l'utilisateur qu'il doit déposer les fichiers SVG manquants dans `public/icons/` puis lancer `npm run optimize-icons` — ce script normalise automatiquement `fill` et `stroke` en `currentColor` et supprime les artefacts Figma.
4. Importer via SVGR — jamais via `<img>`

🚨 **Ne jamais créer de fichier SVG dans `public/icons/`** — les seuls fichiers légitimes sont ceux déposés manuellement par l'utilisateur.

```tsx
// ✅ Correct
import IconName from "@/public/icons/<nom-semantique>.svg"; // ex: ArrowIcon, CloseIcon, ChevronIcon
<IconName aria-hidden className="shrink-0" style={{ width: 'var(--icon-size-sm)', height: 'var(--icon-size-sm)' }} />

// ❌ Interdit
<img src="/icons/<nom-semantique>.svg" />
const imgUrl = "http://localhost:3845/assets/...";
```

**Règle pour les assets statiques** (illustrations, images raster) : `<img>` est autorisé. Déposer dans `public/` avec un chemin sémantique.

**Un seul fichier par icône** — pas de variantes par état (`<nom-semantique>.svg` / `<nom-semantique>-disabled.svg`). La couleur change via `currentColor` qui hérite de la `color` CSS du parent.

---

## 4. Icônes — dimensionnement via tokens directement sur le composant SVG

Le MCP Figma enveloppe souvent les icônes dans un container (ex: `size-[16px]`). Ce container est un artifice de composition interne Figma — ne pas le répliquer. Avec SVGR, le composant SVG est un `FC<SVGProps<SVGSVGElement>>` qui accepte `style` et `className` directement.

**Règle :** appliquer le token `--icon-size-*` directement sur le composant SVGR. Jamais de valeur numérique directe, jamais de wrapper dédié à la taille.

```tsx
// ✅ Correct — token appliqué directement sur le composant SVG
<IconName aria-hidden className="shrink-0" style={{ width: 'var(--icon-size-sm)', height: 'var(--icon-size-sm)' }} />

// ❌ Interdit
<IconName width={16} height={16} />
<span className="size-[16px]"><IconName /></span>
<IconName className="size-[...]" />  // ❌ size-* avec var() CSS crashe Turbopack — utiliser style={}
```

Tokens disponibles : `--icon-size-xs` (12px), `--icon-size-sm` (16px), `--icon-size-md` (20px), `--icon-size-lg` (24px), `--icon-size-xl` (32px).

---

## 5. Tokens — aucune valeur hardcodée

Le MCP génère des fallbacks CSS dans les `var()` :
```
var(--color-container\/primary, black)   ← "black" est un fallback hardcodé
```

**Règle :** supprimer tous les fallbacks. Écrire uniquement `var(--token-name)`.
Si un token semble manquant, vérifier dans `app/_tokens.css` avant d'ajouter quoi que ce soit.

---

## 6. Animations et interactivité

Le MCP génère des états statiques (default, hover, pressed, disabled).

**Règles :**

- **Styles simples** (`color`, `background-color`, `box-shadow`, `border`) : utiliser les pseudo-classes Tailwind (`hover:`, `focus:`, `active:`) avec une transition CSS native. Exemple :
  ```tsx
  <button className="transition-colors duration-300 ease-[cubic-bezier(0.76,0,0.24,1)] hover:bg-[var(--theme-color-surface-hover)]">
  ```
  🚨 **Le token exact doit être résolu via `app/_tokens.css` (étape 2 du protocole). Ne jamais écrire `...` comme placeholder — le parseur CSS le rejette.**
- **Animations complexes ou `transform`** : remplacer `<div>` / `<button>` par `motion.div` / `motion.button`
  - États hover → `whileHover`
  - États pressed → `whileTap`
  - `reducedMotion` géré globalement — ne pas appeler `useReducedMotion()` dans le composant (voir `components/Providers.tsx`)
  - Easing signature : `cubic-bezier(0.76, 0, 0.24, 1)` — durée : `300ms`
- **"use client"** : dès qu'un `motion.*` est introduit dans le fichier, voir BASE.md §5b.

---

## 7. Attributs de debug MCP à supprimer

Le MCP ajoute des attributs `data-node-id`, `id="node-*"` pour le debug Figma.
Ces attributs ne doivent **pas** apparaître dans le code final.

**Règle :** supprimer tous les `data-node-id="..."` et `id="node-..."`.
