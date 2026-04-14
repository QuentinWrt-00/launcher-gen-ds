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
1. Exporter l'icône manuellement depuis Figma (format SVG, taille 24×24)
2. Remplacer `fill="black"` (ou toute couleur hardcodée) par `fill="currentColor"`
3. Déposer dans `public/icons/<nom-semantique>.svg`
4. Importer via SVGR — jamais via `<img>`

```tsx
// ✅ Correct
import DotIcon from "@/public/icons/dot.svg";
<DotIcon aria-hidden className="shrink-0" style={{ width: 'var(--icon-size-sm)', height: 'var(--icon-size-sm)' }} />

// ❌ Interdit
<img src="/icons/dot.svg" />
const imgDot = "http://localhost:3845/assets/...";
```

**Règle pour les assets statiques** (illustrations, images raster) : `<img>` est autorisé. Déposer dans `public/` avec un chemin sémantique.

**Un seul fichier par icône** — pas de variantes par état (`dot.svg` / `dot-disabled.svg`). La couleur change via `currentColor` qui hérite de la `color` CSS du parent.

---

## 4. Icônes — container et dimensionnement via tokens

Le MCP Figma enveloppe souvent les icônes dans un container (ex: `size-[16px]`). Ce container sert à la mise en page et au centrage — il doit être préservé avec les tokens de taille.

**Règle :** ne jamais utiliser de valeur numérique directe pour dimensionner une icône ou son container.

```tsx
// ✅ Correct — token via style prop sur le container
<span
  className="relative flex shrink-0 items-center justify-center"
  style={{ width: 'var(--icon-size-sm)', height: 'var(--icon-size-sm)' }}
>
  <DotIcon aria-hidden />
</span>

// ❌ Interdit
<DotIcon width={16} height={16} />
<span className="size-[16px]">...</span>
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

## 6. Animations — Framer Motion obligatoire

Le MCP génère des états statiques (default, hover, pressed, disabled).
Ces états ne doivent **jamais** être implémentés via CSS `transition`.

**Règle :**
- Remplacer `<div>` / `<button>` interactifs par `motion.div` / `motion.button`
- États hover → `whileHover`
- États pressed → `whileTap`
- Toujours appeler `useReducedMotion()` — si actif : `transition: { duration: 0 }`
- Easing signature : `cubic-bezier(0.76, 0, 0.24, 1)` — durée : `300ms`

---

## 7. Attributs de debug MCP à supprimer

Le MCP ajoute des attributs `data-node-id`, `id="node-*"` pour le debug Figma.
Ces attributs ne doivent **pas** apparaître dans le code final.

**Règle :** supprimer tous les `data-node-id="..."` et `id="node-..."`.
