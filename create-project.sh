#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# create-project.sh
# Usage : bash create-project.sh <NomDuProjet> [chemin/destination]
# Exemple: bash create-project.sh MyApp /Users/Quentin.Waret/Desktop
# ─────────────────────────────────────────────────────────────────
set -e

# ── Arguments ────────────────────────────────────────────────────
PROJECT_NAME="${1:-}"
DEST="${2:-$(pwd)}"

if [[ -z "$PROJECT_NAME" ]]; then
  echo "❌  Usage : bash create-project.sh <NomDuProjet> [destination]"
  exit 1
fi

# npm interdit les majuscules → slug en lowercase pour create-next-app
SLUG=$(echo "$PROJECT_NAME" | tr '[:upper:]' '-' | sed 's/^-*//' | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g')

TARGET="$DEST/$PROJECT_NAME"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATES="$SCRIPT_DIR/templates"

echo ""
echo "🚀  Création du projet : $PROJECT_NAME"
echo "📁  Destination        : $TARGET"
echo ""

# ── Vérifications ─────────────────────────────────────────────────
if [[ -d "$TARGET" ]]; then
  echo "❌  Le dossier $TARGET existe déjà."
  exit 1
fi

command -v node >/dev/null 2>&1 || { echo "❌  Node.js requis."; exit 1; }
command -v npm  >/dev/null 2>&1 || { echo "❌  npm requis."; exit 1; }

# ── 1. create-next-app ───────────────────────────────────────────
echo "📦  [1/5] Initialisation Next.js…"
cd "$DEST"
npx create-next-app@latest "$SLUG" \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*" \
  --yes

# Renommage dossier slug → NomDuProjet
if [[ "$SLUG" != "$PROJECT_NAME" ]]; then
  mv "$DEST/$SLUG" "$TARGET"
fi

cd "$TARGET"

# ── 2. Dépendances supplémentaires ───────────────────────────────
echo ""
echo "📦  [2/4] Installation des dépendances…"
npm install framer-motion clsx tailwind-merge
npm install --save-dev @svgr/webpack svgo

# ── 3. Structure des dossiers ────────────────────────────────────
echo ""
echo "📁  [3/4] Création de la structure…"
mkdir -p components/ui components/blocks components/modules components/pages
mkdir -p public/fonts
mkdir -p public/icons && touch public/icons/.gitkeep
mkdir -p .cursor/rules

# ── 5. Copie des scripts de sync + rules + CLAUDE.md ─────────────
echo ""
echo "📋  [4/4] Copie des règles et scripts…"

mkdir -p scripts
cp "$SCRIPT_DIR/convert-tokens.js"          scripts/
cp "$SCRIPT_DIR/tokens-to-css.js"           scripts/
cp "$TEMPLATES/optimize-icons.js"           scripts/
npm pkg set scripts.sync-tokens="node scripts/convert-tokens.js && node scripts/tokens-to-css.js" --silent
npm pkg set scripts.optimize-icons="node scripts/optimize-icons.js" --silent

# figma-design-tokens.json est privé et généré par plugin — ne pas versionner
echo "" >> .gitignore
echo "# figma" >> .gitignore
echo "figma-design-tokens.json" >> .gitignore

cp "$TEMPLATES/rules/"*.md .cursor/rules/

# Concatène toutes les rules en un seul fichier → à mettre en cache dans Claude Code
# pour éviter de recharger le contexte à chaque session et réduire la consommation de tokens
cat "$TEMPLATES/rules/"*.md > CONTEXTE_GLOBAL.md

cat > CLAUDE.md << 'CLAUDE'
# Règles du projet

Ce fichier est chargé automatiquement par Claude Code.

---

## Stack

- **Framework** : Next.js App Router
- **Language** : TypeScript 5 — typage strict, pas de `any`
- **Style** : Tailwind v4
- **Animation** : Framer Motion
- **Lint** : ESLint 9

---

## Structure des fichiers

```
app/                    → pages et layout Next.js
app/globals.css         → tokens CSS + Tailwind

components/
├── ui/                 → atomes (composants de base indivisibles, jamais de logique métier)
├── blocks/             → molécules (assemblages de composants ui, peut recevoir des données en props)
├── modules/            → organismes (sections complètes, peut fetcher ses propres données)
└── pages/              → templates (assemblages de modules)

public/fonts/           → fonts en .woff2
public/icons/           → icônes SVG (fill="currentColor", importées via SVGR)
.cursor/rules/          → règles par rôle pour Cursor
```

---

## Conventions de code

- All code comments, JSDoc, and inline documentation in **English**
- Props typées exhaustivement — interface dédiée par composant
- JSDoc sur chaque prop
- Exports : named ET default
- Pas de `any`, pas de `// @ts-ignore`
- Imports : React → libs externes → composants → types
- Composants découpés si > 80 lignes
- Fichiers et dossiers : PascalCase
- SVGR icons: size via `style={{ width, height }}` only — never `size-[var(...)]` (crashes Turbopack)

---

## Tokens — règle absolue

Les composants consomment uniquement :
- `Theme-color` → couleurs et états
- `Typographie` → styles de texte
- `Effets` → ombres et blur

Les `Fondations` ne sont **jamais** appelées directement dans les composants.
**Aucune valeur hardcodée** — tout passe par les tokens.

---

## Animations

- **CSS `transition`** : autorisé pour les changements de style purs au `:hover`/`:focus`/`:active` (`color`, `background-color`, `box-shadow`, `border`)
- **Framer Motion** : obligatoire pour les entrées/sorties, animations de layout, séquences, et tout ce qui implique `transform`
- Easing : `cubic-bezier(0.76, 0, 0.24, 1)` — durées entre 300ms et 600ms
- `reducedMotion` géré globalement via `components/Providers.tsx` — ne pas appeler `useReducedMotion()` dans les composants
- Entrées lentes, sorties rapides

---

## Lecture Figma — MCP

Lire UNIQUEMENT les collections de variables dans cet ordre :
1. `Fondations`
2. `Typographie`
3. `Theme-color`
4. `Effets`

Ignorer : fills, styles locaux, couleurs directement appliquées sur les calques.

---

## Avant tout commit

- `tsc --noEmit` passe sans erreur
- `eslint .` passe sans erreur
- Aucune valeur hardcodée introduite
- Rapport de modifications généré

---

## Classes CSS — règle absolue

Toujours utiliser `cn` (de `@/lib/utils`) pour composer les classes Tailwind.
Ne jamais utiliser `.filter(Boolean).join(" ")` ni concaténation de strings.

---

## Référence rapide — Tokens CSS

> Cheat sheet pour éviter de relire `app/_tokens.css` en entier à chaque session.
> Si un token est absent de cette liste, lire `_tokens.css` pour vérifier.

**Containers** : `--color-container-primary` `-hover` `-pressed` | `--color-container-secondary` `-hover` `-pressed` | `--color-container-disable`
**Content** : `--color-content-primary` `-hover` `-pressed` | `--color-content-on-primary` | `--color-content-on-secondary` | `--color-content-on-disable`
**Borders** : `--border-primary` `-hover` `-pressed` | `--border-secondary` | `--border-disable`
**Border widths** : `--borders-width-thin` (1px) · `--borders-width-default` (2px) · `--borders-width-thick` (3px)
**Spacing courants** : `--spacing-4` · `--spacing-8` · `--spacing-12` · `--spacing-16` · `--spacing-20` · `--spacing-24` · `--spacing-32` · `--spacing-48`
**Icons** : `--icon-size-xs` (12px) · `--icon-size-sm` (16px) · `--icon-size-md` (20px) · `--icon-size-lg` (24px) · `--icon-size-xl` (32px)
**Motion** : `--motion-duration-normal` (300ms) · signature easing `cubic-bezier(0.76, 0, 0.24, 1)`
**Typo** : `typo-headline-md/sm` · `typo-body-lg/lg-alt/md/md-alt/sm` · `typo-label-lg-reg/light/caps` · `typo-label-md-reg/light/caps/alt` · `typo-label-sm-reg/light/caps/alt`

---

## Icônes disponibles (`public/icons/`)

> Mettre à jour cette liste après chaque ajout d'icône dans le projet.

_(vide — liste à compléter après sync-tokens ou ajout manuel)_

---

## Composants existants

> Mettre à jour cette liste après chaque génération de composant.

| Composant | Dossier | Description |
|---|---|---|
| _(aucun)_ | — | — |

---

## Rôles disponibles (voir `.cursor/rules/`)

| Fichier | Usage |
|---|---|
| `BASE.md` | Socle technique — toujours actif |
| `ROLE-DEV.md` | Développement composants React/TS |
| `ROLE-A11Y.md` | Audit et implémentation accessibilité |
| `ROLE-AUDIT.md` | Audit code — génère un rapport avant toute modif |
| `ROLE-MOTION.md` | Animations Framer Motion + performance |

**Exemple d'appel :**
```
Applique ROLE-AUDIT.md et BASE.md. Audite le composant Header.tsx.
```
CLAUDE

# ── 5b. next.config.ts + types SVG ──────────────────────────────
cat > next.config.ts << 'EOF'
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: [{ loader: "@svgr/webpack", options: { svgo: false } }],
    });
    return config;
  },
};

export default nextConfig;
EOF

mkdir -p types
cat > types/svg.d.ts << 'EOF'
declare module "*.svg" {
  import type { FC, SVGProps } from "react";
  const SVG: FC<SVGProps<SVGSVGElement>>;
  export default SVG;
}
EOF

# ── 6. Nettoyage du boilerplate Next.js ──────────────────────────
echo ""
echo "🧹  [5/5] Nettoyage du boilerplate Next.js…"

mkdir -p lib
cat > lib/utils.ts << 'EOF'
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
EOF

cat > components/Providers.tsx << 'EOF'
"use client";

import { MotionConfig } from "framer-motion";

/**
 * Providers — composant client racine.
 * Configure Framer Motion globalement :
 * - reducedMotion="user" : respecte la préférence OS sans hook dans chaque composant
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
EOF

cat > app/layout.tsx << 'EOF'
import type { Metadata } from "next";
import Providers from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Design System",
  description: "Design System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
EOF

cat > app/page.tsx << 'EOF'
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/showcase");
}
EOF

cat > app/globals.css << 'EOF'
@import "tailwindcss";
@import "./_tokens.css";

@theme inline {
  --font-sans:  var(--typography-font-family-secondary);
  --font-serif: var(--typography-font-family-primary);
  --breakpoint-tablet:  1024px;
  --breakpoint-desktop: 1280px;
}

body {
  background: var(--theme-color-background-default);
  color: var(--theme-color-content-default);
  font-family: var(--typography-font-family-secondary);
}
EOF

# ── Git commit ───────────────────────────────────────────────────
git add -A
git commit -m "init: Next.js + Tailwind v4 + Framer Motion + rules"

# ── Fin ──────────────────────────────────────────────────────────
echo ""
echo "✅  Projet \"$PROJECT_NAME\" prêt dans : $TARGET"
echo ""
echo "   cd $TARGET"
echo "   npm run dev"
echo ""
