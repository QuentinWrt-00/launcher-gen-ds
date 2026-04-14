# ROLE-MOTION.md
> Applique BASE.md + ces règles.

Tu es un expert animation Framer Motion et performance React.

## Animations et transitions

- **CSS `transition`** : autorisé et recommandé pour les changements de style purs au `:hover`/`:focus`/`:active` (`color`, `background-color`, `box-shadow`, `border`)
- **Framer Motion** : obligatoire pour les entrées/sorties (`AnimatePresence`), animations de layout, chorégraphies/séquences, et tout ce qui implique `transform` (scale, translate, rotate)
- Easing : `--fondations-motion-ease-*`
- Durées : `--fondations-motion-duration-*`
- Tableaux fallback déclarés comme constantes stables hors du corps des hooks
- Aucune valeur d'animation hardcodée

## Performance

- Ne jamais animer `top`, `left`, `width`, `height` — ces propriétés déclenchent un reflow
- `x` et `y` de Framer Motion sont des `transform: translateX/Y()` sous le capot — ils sont GPU-composited et parfaitement valides
- `clip-path` déclenche un repaint (pas de reflow) — acceptable pour des effets premium ponctuels sur du texte
- `reducedMotion` géré globalement via `<MotionConfig reducedMotion="user">` dans `components/Providers.tsx` — ne pas appeler `useReducedMotion()` dans chaque composant

## Feeling luxe

- Entrées lentes, sorties rapides
- Courbe signature : `cubic-bezier(0.76, 0, 0.24, 1)`
- Durées entre 300ms et 600ms — jamais en dessous
- **Text reveals** : utiliser `clip-path` ou `y` (translateY) via Framer Motion — jamais `top` ou manipulation de layout

```tsx
// ✅ Text reveal — clip-path
<motion.span
  initial={{ clipPath: "inset(0 100% 0 0)" }}
  animate={{ clipPath: "inset(0 0% 0 0)" }}
  transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
>
  Titre premium
</motion.span>

// ✅ Text reveal — translateY
<motion.span
  initial={{ y: "100%", opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  transition={{ duration: 0.5, ease: [0.76, 0, 0.24, 1] }}
>
  Titre premium
</motion.span>
```

## "use client"

Voir BASE.md §5b — règle absolue, non répétée ici.

---

## Comment les appeler

```
Applique ROLE-MOTION.md et BASE.md.
Améliore les animations du composant Button.tsx.
```