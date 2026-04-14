# Prompt — Intégrer un composant Figma en React
# Prompt — Implement a Figma component in React

Remplace uniquement `[URL_DU_NODE_FIGMA]` par l'URL du nœud Figma à intégrer.
Replace only `[FIGMA_NODE_URL]` with the URL of the Figma node to implement.

---

## 🇫🇷 Version française

```
Applique BASE.md, ROLE-DEV.md, ROLE-FIGMA-MCP.md, ROLE-A11Y.md, ROLE-MOTION.md et ROLE-FONTS.md.

Je souhaite que tu intègres ce composant Figma en React :
[URL_DU_NODE_FIGMA]

⚠️ AVANT d'écrire le moindre code, exécute strictement ce protocole dans l'ordre :
1. Utilise `get_design_context` puis `get_variable_defs` sur l'URL fournie pour analyser la structure et les variables Figma.
2. Lis le fichier `app/_tokens.css` en entier pour faire correspondre les variables Figma aux tokens CSS du projet (n'oublie pas la conversion `/` en `-`). Cherche les utilitaires `typo-*` pour la typographie.
3. Vérifie le dossier `public/icons/` pour voir si les assets SVG existent déjà.
4. Vérifie `components/ui/` pour éviter de dupliquer un composant existant.

Une fois ton analyse terminée, génère le composant avec ces contraintes absolues :
- Stack : Next.js, TypeScript strict (pas de any), Tailwind v4.
- Zéro valeur hardcodée (ni couleur, ni typo, ni spacing si possible) : tout doit provenir des tokens ou de Tailwind.
- Animation : Respecte la distinction stricte entre CSS native (pour les :hover de couleurs/ombres) et Framer Motion (pour les layout/transforms).
- Si tu utilises Framer Motion, n'oublie pas la directive `"use client"` en ligne 1.
- Nettoyage : Retire tous les fallbacks CSS et les attributs de debug Figma (`data-node-id`, etc.).

Génère le composant dans le dossier approprié (`components/ui/` si c'est un atome, `components/blocks/` si c'est une molécule) et fais-moi un court rapport final listant les tokens utilisés et les éventuels tokens Figma manquants dans notre CSS.
```

---

## 🇬🇧 English version

```
Apply BASE.md, ROLE-DEV.md, ROLE-FIGMA-MCP.md, ROLE-A11Y.md, ROLE-MOTION.md and ROLE-FONTS.md.

I want you to implement this Figma component in React:
[FIGMA_NODE_URL]

⚠️ BEFORE writing any code, strictly follow this protocol in order:
1. Use `get_design_context` then `get_variable_defs` on the provided URL to analyse the component structure and Figma variables.
2. Read the entire `app/_tokens.css` file to map Figma variables to the project's CSS tokens (apply the `/` → `-` conversion rule). Look for `typo-*` utilities for typography.
3. Check the `public/icons/` folder to see if the required SVG assets already exist.
4. Check `components/ui/` to avoid duplicating an existing component.

Once your analysis is complete, generate the component with these absolute constraints:
- Stack: Next.js, strict TypeScript (no any), Tailwind v4.
- Zero hardcoded values (no colours, no typography, no spacing where possible): everything must come from tokens or Tailwind.
- Animation: strictly follow the distinction between native CSS (for :hover colour/shadow changes) and Framer Motion (for layout/transforms).
- If you use Framer Motion, add the `"use client"` directive on line 1.
- Cleanup: remove all CSS fallbacks and Figma debug attributes (`data-node-id`, etc.).

Generate the component in the appropriate folder (`components/ui/` for an atom, `components/blocks/` for a molecule) and provide a short final report listing the tokens used and any Figma tokens missing from our CSS.
```
