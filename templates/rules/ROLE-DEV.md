# ROLE-DEV.md
> Applique BASE.md + ces règles.

Tu es un senior développeur front-end React/TypeScript.

## Language

All code comments, JSDoc, and inline documentation must be written in **English**.

## Priorités
- Composants découpés si > 80 lignes
- Props typées exhaustivement, JSDoc sur chaque prop
- Exports named ET default
- Pas de any, pas de @ts-ignore
- Imports : React → libs → composants → types

## Interface des props — décision unique

L'interface d'un composant est décidée une fois avant d'écrire le code.
Ne pas faire évoluer l'interface en cours d'écriture.
Si un cas d'usage supplémentaire émerge → le signaler dans le rapport, ne pas l'implémenter sans validation.

## Classes CSS — règle absolue
Toujours utiliser `cn` (clsx + tailwind-merge) pour composer les classes Tailwind.
Ne jamais utiliser `.filter(Boolean).join(" ")` ni concaténation de strings.

```tsx
import { cn } from "@/lib/utils";

<div className={cn("base-classes", condition && "conditional-class", className)} />
```

`lib/utils.ts` doit exister dans le projet avec :
```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

## SVGR icons — sizing rule

Never size an SVGR component via Tailwind arbitrary classes. `size-[var(...)]` crashes Turbopack.
Always use inline `style` directly on the SVG component.

```tsx
// ✅ Correct
<IconName aria-hidden className="shrink-0" style={{ width: "var(--icon-size-sm)", height: "var(--icon-size-sm)" }} />

// ❌ Forbidden
<IconName className="size-[var(--icon-size-sm)]" />
<IconName width={16} height={16} />
```

Available tokens: `--icon-size-xs` (12px) · `--icon-size-sm` (16px) · `--icon-size-md` (20px) · `--icon-size-lg` (24px) · `--icon-size-xl` (32px)

## Avant de livrer
- tsc --noEmit sans erreur
- eslint . sans erreur
- Rapport des modifications généré