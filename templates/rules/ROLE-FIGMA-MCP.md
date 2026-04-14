# ROLE-FIGMA-MCP.md
> Applique BASE.md + ces règles.
> À activer systématiquement quand tu implémente un composant depuis le MCP Figma.

Tu traduis le code généré par le MCP Figma en composant React conforme au projet.
Le code MCP est une **base de travail**, pas un résultat final. Applique chaque règle ci-dessous avant d'écrire le composant.

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
1. **Avant tout** : lire `public/icons/` — l'icône existe peut-être déjà
2. Si elle n'existe pas : exporter manuellement depuis Figma (format SVG, taille 24×24)
3. Vérifier que le SVG utilise `fill="currentColor"` (pas `fill="black"` ou autre valeur hardcodée)
4. Déposer dans `public/icons/<nom-semantique>.svg`
5. Importer via SVGR — jamais via `<img>`

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
  <button className="transition-colors duration-300 ease-[cubic-bezier(0.76,0,0.24,1)] hover:bg-[var(--theme-color-...)]">
  ```
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
