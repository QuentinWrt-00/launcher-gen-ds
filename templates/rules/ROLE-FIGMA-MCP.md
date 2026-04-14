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
MCP génère   →  var(--colors-container\/primary)
À écrire     →  var(--colors-container-primary)
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

## 3. Assets — jamais de localhost

Le MCP sert les assets depuis un serveur local temporaire (`http://localhost:3845/assets/...`).
Ces URLs ne fonctionnent que quand Figma Desktop est ouvert.

**Règle :** pour chaque asset `localhost:3845` dans le code MCP :
1. Télécharger le fichier : `curl -s "<url>" -o public/icons/<nom-semantique>.<ext>`
2. Vérifier que le fichier est valide (pas une page d'erreur HTML)
3. Remplacer la constante dans le composant : `"/icons/<nom-semantique>.<ext>"`

Nommage : kebab-case sémantique. Si plusieurs états : `<nom>-<etat>.svg` (ex: `dot.svg`, `dot-disabled.svg`).

---

## 4. Tokens — aucune valeur hardcodée

Le MCP génère des fallbacks CSS dans les `var()` :
```
var(--colors-container\/primary, black)   ← "black" est un fallback hardcodé
```

**Règle :** supprimer tous les fallbacks. Écrire uniquement `var(--token-name)`.
Si un token semble manquant, vérifier dans `app/_tokens.css` avant d'ajouter quoi que ce soit.

---

## 5. Animations — Framer Motion obligatoire

Le MCP génère des états statiques (default, hover, pressed, disabled).
Ces états ne doivent **jamais** être implémentés via CSS `transition`.

**Règle :**
- Remplacer `<div>` / `<button>` interactifs par `motion.div` / `motion.button`
- États hover → `whileHover`
- États pressed → `whileTap`
- Toujours appeler `useReducedMotion()` — si actif : `transition: { duration: 0 }`
- Easing signature : `cubic-bezier(0.76, 0, 0.24, 1)` — durée : `300ms`

---

## 6. Attributs de debug MCP à supprimer

Le MCP ajoute des attributs `data-node-id`, `id="node-*"` pour le debug Figma.
Ces attributs ne doivent **pas** apparaître dans le code final.

**Règle :** supprimer tous les `data-node-id="..."` et `id="node-..."`.
