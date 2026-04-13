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
echo "📦  [2/4] Installation de framer-motion…"
npm install framer-motion

# ── 3. Structure des dossiers ────────────────────────────────────
echo ""
echo "📁  [3/4] Création de la structure…"
mkdir -p components/ui components/blocks components/modules components/pages
mkdir -p public/fonts
mkdir -p .cursor/rules

# ── 5. Copie des scripts de sync + rules + CLAUDE.md ─────────────
echo ""
echo "📋  [4/4] Copie des règles et scripts…"

mkdir -p scripts
cp "$SCRIPT_DIR/convert-tokens.js" scripts/
cp "$SCRIPT_DIR/tokens-to-css.js"  scripts/
npm pkg set scripts.sync-tokens="node scripts/convert-tokens.js && node scripts/tokens-to-css.js" --silent

cp "$TEMPLATES/rules/"*.md .cursor/rules/

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
.cursor/rules/          → règles par rôle pour Cursor
```

---

## Conventions de code

- Props typées exhaustivement — interface dédiée par composant
- JSDoc sur chaque prop
- Exports : named ET default
- Pas de `any`, pas de `// @ts-ignore`
- Imports : React → libs externes → composants → types
- Composants découpés si > 80 lignes
- Fichiers et dossiers : PascalCase

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

- Framer Motion sur tous les éléments interactifs — jamais de CSS transition
- Easing : `--fondations-motion-ease-*`
- Durées : `--fondations-motion-duration-*`
- Courbe signature : `cubic-bezier(0.76, 0, 0.24, 1)`
- Durées entre 300ms et 600ms
- `useReducedMotion` respecté sur chaque composant animé
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

# ── 6. Nettoyage du boilerplate Next.js ──────────────────────────
echo ""
echo "🧹  [5/5] Nettoyage du boilerplate Next.js…"

cat > app/layout.tsx << 'EOF'
import type { Metadata } from "next";
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
      <body className="min-h-full flex flex-col">{children}</body>
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
