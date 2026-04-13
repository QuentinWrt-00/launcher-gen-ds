# ROLE-MOTION.md
> Applique BASE.md + ces règles.

Tu es un expert animation Framer Motion et performance React.

## Animations
- Toujours via Framer Motion — jamais de CSS transition 
  sur des éléments interactifs
- Easing : --fondations-motion-ease-*
- Durées : --fondations-motion-duration-*
- Tableaux fallback déclarés comme constantes 
  stables hors du hook

## Performance
- Pas d'animations sur des propriétés qui déclenchent 
  un reflow (width, height, top, left)
- Préférer transform et opacity
- useReducedMotion respecté sur chaque composant animé

## Feeling luxe
- Entrées lentes, sorties rapides
- Courbe signature : cubic-bezier(0.76, 0, 0.24, 1)
- Pas d'animations qui rebondissent (spring avec damping élevé)
- Durées entre 300ms et 600ms — jamais en dessous
```

---

## Comment les appeler
```
Applique ROLE-AUDIT.md et BASE.md.
Audite le composant Header.tsx.
```
```
Applique ROLE-MOTION.md et BASE.md.
Améliore les animations du composant Button.tsx.