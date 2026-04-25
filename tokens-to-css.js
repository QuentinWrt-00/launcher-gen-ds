/**
 * tokens-to-css.js
 * Lit figma-design-tokens.w3c.json → génère app/_tokens.css
 * Injecte automatiquement l'import dans app/globals.css si absent.
 *
 * Usage : node scripts/tokens-to-css.js [input.w3c.json] [output.css]
 */

const fs   = require('fs');
const path = require('path');

const INPUT      = process.argv[2] || path.join(__dirname, '../figma-design-tokens.w3c.json');
const OUTPUT_CSS = process.argv[3] || path.join(__dirname, '../app/_tokens.css');
const GLOBALS    = path.join(__dirname, '../app/globals.css');
const IMPORT_LINE = '@import "./_tokens.css";';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** "path.key" → "--path-key"
 *  Le préfixe de collection n'est PAS inclus dans le path (strippé en amont).
 *  Les variables Figma portent elles-mêmes leur préfixe dans leur nom de groupe.
 *  Normalizations applied:
 *  - Removes "primitive" / "semantic" / "sementic" (Figma artefacts, backward compat)
 *  - "typographie" → "typography"  (frenglish fix)
 *  - "tablette"    → "tablet"      (French → English)
 */
function toVar(tokenPath) {
  return '--' + tokenPath
    .replace(/\./g, '-')
    .replace(/^semantic-|^sementic-|^primitive-/g, '')
    .replace(/-sementic-|-semantic-/g, '-')
    .replace(/-primitive-/g, '-')
    .replace(/^typographie(-|$)/, 'typography$1')
    .replace(/-typographie(-|$)/g, '-typography$1')
    .replace(/-tablette(-|$)/g, '-tablet$1');
}

/** "4px" → "0.25rem", "0px" → "0" */
function pxToRem(value) {
  const num = parseFloat(value);
  if (isNaN(num) || num === 0) return '0';
  return `${parseFloat((num / 16).toFixed(4))}rem`;
}

/** Alias W3C {collection.path.key} → var(--path-key)
 *  Strips le premier segment (nom de collection) avant de résoudre.
 */
function resolveAlias(value) {
  return value.replace(/\{([^}]+)\}/g, (_, p) => {
    const withoutCollection = p.includes('.') ? p.slice(p.indexOf('.') + 1) : p;
    return `var(${toVar(withoutCollection)})`;
  });
}

/** Formate une valeur selon le $type W3C */
function formatCssValue(value, type) {
  if (typeof value === 'string' && value.startsWith('{')) {
    return resolveAlias(value);
  }
  switch (type) {
    case 'gradient': {
      if (!value || !value.stops) return String(value);
      const stops = value.stops
        .map(s => `${s.color} ${Math.round(s.position * 100)}%`)
        .join(', ');
      if (value.type === 'linear') {
        return `linear-gradient(${value.angle}deg, ${stops})`;
      }
      if (value.type === 'radial') {
        return `radial-gradient(circle at ${value.cx}% ${value.cy}%, ${stops})`;
      }
      if (value.type === 'angular') {
        return `conic-gradient(from ${value.angle}deg at ${value.cx}% ${value.cy}%, ${stops})`;
      }
      if (value.type === 'diamond') {
        // Pas d'équivalent CSS natif — rendu en radial
        return `radial-gradient(circle at ${value.cx}% ${value.cy}%, ${stops})`;
      }
      return String(value);
    }
    case 'cubicBezier':
      if (Array.isArray(value)) return `cubic-bezier(${value.join(', ')})`;
      return String(value).trim();
    case 'fontFamily': {
      const quoted = Array.isArray(value) ? value.map(f => `"${f}"`).join(', ') : `"${value}"`;
      // Generic fallback — override to "Georgia, serif" etc. if the brand font is a serif.
      return `${quoted}, system-ui, sans-serif`;
    }
    case 'fontWeight':
      return String(value);
    case 'dimension':
      if (typeof value === 'string' && value.endsWith('px')) return pxToRem(value);
      return String(value).trim();
    case 'dimension-px':
      return String(value).trim();
    case 'number':
      return String(value);
    default:
      return String(value).trim();
  }
}

// ─── Walk tokens tree ─────────────────────────────────────────────────────────

function walkTokens(obj, pathParts, lines) {
  for (const [key, val] of Object.entries(obj)) {
    const currentPath = [...pathParts, key];

    if (val && val.$value !== undefined) {
      const cssVar   = toVar(currentPath.join('.'));
      const cssValue = formatCssValue(val.$value, val.$type);
      const comment  = val.$description ? `  /* ${val.$description} */` : '';
      lines.push(`  ${cssVar}: ${cssValue};${comment}`);
    } else if (val && typeof val === 'object') {
      walkTokens(val, currentPath, lines);
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log(`\n📥  Lecture   : ${INPUT}`);

const tokens = JSON.parse(fs.readFileSync(INPUT, 'utf8'));

// Read breakpoint values from tokens — drives both @media rules and Tailwind @theme.
// "tablette" is the Figma FR variable name; "tablet" is the normalized fallback.
const bp = tokens?.breakpoints ?? {};
const mobileBreakpoint  = bp.mobile?.$value                    ?? '768px';
const tabletBreakpoint  = (bp.tablet  ?? bp.tablette)?.$value  ?? '1024px';
const desktopBreakpoint = bp.desktop?.$value                   ?? '1280px';

// Groupes de collections → sections CSS commentées
const SECTION_LABELS = {
  colors:          'Colors (primitives + semantic)',
  radius:          'Border radius',
  opacity:         'Opacity',
  'typographie':   'Typography',
  spacings:        'Spacing',
  shadow:          'Shadows',
  'borders-width': 'Border widths',
  'icon-size':     'Icon sizes',
  motion:          'Motion (duration + easing)',
  blur:            'Blur (layer / backdrop)',
  breakpoints:     'Breakpoints',
  gradient:        'Gradients',
};

const allLines = [
  '/**',
  ' * _tokens.css — généré automatiquement par scripts/tokens-to-css.js',
  ' * ⚠️  NE PAS MODIFIER MANUELLEMENT — relancer `npm run sync-tokens`',
  ' */',
  '',
  ':root {',
];

let tokenCount = 0;
for (const [collection, data] of Object.entries(tokens)) {
  const label = SECTION_LABELS[collection] || collection;
  allLines.push(`\n  /* ─── ${label} ─── */`);

  const lines = [];
  walkTokens(data, [], lines); // collection prefix strippé — porté par le nom de variable Figma
  allLines.push(...lines);
  tokenCount += lines.length;

  // Shorthand box-shadow après les tokens shadow décomposés
  // Auto-détecte tout groupe ayant offsetX comme enfant direct — générique, aucun hardcode
  if (collection === 'shadow') {
    const groups = [];
    for (const [key, val] of Object.entries(data)) {
      if (val && typeof val === 'object' && val.offsetX?.$value !== undefined) {
        groups.push(key);
      }
    }
    if (groups.length > 0) {
      allLines.push('');
      allLines.push('  /* ─── Shadows (shorthand) ─── */');
      for (const group of groups) {
        const inset = group.includes('inner') ? 'inset ' : '';
        allLines.push(`  --${group}: ${inset}var(--${group}-offsetX) var(--${group}-offsetY) var(--${group}-blur) var(--${group}-spread) var(--${group}-color);`);
      }
    }
  }
}

allLines.push('}', '');

// ─── Utilitaires Tailwind @utility ────────────────────────────────────────────

const CAPS_IDS = new Set(['label-lg-caps', 'label-md-caps', 'label-sm-caps']);
const typoData = tokens['typographie'] || tokens['typography'] || {};

// Styles composites = nœuds directs de `typographie` qui ont font-size.$value
const compositeStyles = Object.entries(typoData).filter(
  ([, node]) =>
    node &&
    typeof node === 'object' &&
    !node.$value &&
    node['font-size']?.$value !== undefined
);

if (compositeStyles.length > 0) {
  allLines.push('');
  allLines.push('/* ─── Utilitaires typographiques (Tailwind @utility) ─── */');
  allLines.push('/* ⚠️  NE PAS MODIFIER MANUELLEMENT — relancer `npm run sync-tokens` */');

  for (const [id] of compositeStyles) {
    // Si le nom de groupe Figma inclut déjà "typography-", on le strip pour éviter le doublon
    const utilId = id.replace(/^typography-/, '');
    const p = `--typography-${utilId}`;
    allLines.push('');
    allLines.push(`@utility typo-${utilId} {`);
    allLines.push(`  font-family: var(${p}-font-family);`);
    allLines.push(`  font-weight: var(${p}-font-weight);`);
    allLines.push(`  font-size: var(${p}-font-size);`);
    allLines.push(`  line-height: var(${p}-line-height);`);
    allLines.push(`  letter-spacing: var(${p}-letter-spacing);`);
    if (CAPS_IDS.has(utilId)) {
      allLines.push('  text-transform: uppercase;');
    }
    allLines.push('}');
  }
  console.log(`✅  Utilities  : ${compositeStyles.length} classes @utility typo-* générées`);
}

// ─── Overrides mobiles auto-générés depuis le mode Figma 2008:0 ──────────────

const MOBILE_MODE = '2008:0';
const mobileOverrides = [];

function collectMobileOverrides(obj, pathParts) {
  for (const [key, val] of Object.entries(obj)) {
    const currentPath = [...pathParts, key];
    if (val && val.$value !== undefined) {
      const mobileVal = val.$extensions?.['com.figma']?.modes?.[MOBILE_MODE];
      if (mobileVal !== undefined && String(mobileVal) !== String(val.$value)) {
        const cssVar = toVar(currentPath.join('.'));
        const cssValue = formatCssValue(mobileVal, val.$type);
        mobileOverrides.push(`    ${cssVar}: ${cssValue};`);
      }
    } else if (val && typeof val === 'object') {
      collectMobileOverrides(val, currentPath);
    }
  }
}

for (const [, collectionData] of Object.entries(tokens)) {
  collectMobileOverrides(collectionData, []);
}

if (mobileOverrides.length > 0) {
  allLines.push('');
  allLines.push('/* ─── Overrides mobiles (mode 2008:0 Figma, auto-généré) ─── */');
  allLines.push('/* ⚠️  NE PAS MODIFIER MANUELLEMENT — relancer `npm run sync-tokens` */');
  allLines.push(`@media (max-width: ${mobileBreakpoint}) {`);
  allLines.push('  :root {');
  allLines.push(...mobileOverrides);
  allLines.push('  }');
  allLines.push('}');
  allLines.push('');
  console.log(`✅  Mobile     : ${mobileOverrides.length} overrides @media générés depuis Figma`);
}

// ─── Écriture du CSS ──────────────────────────────────────────────────────────

fs.writeFileSync(OUTPUT_CSS, allLines.join('\n'), 'utf8');
console.log(`✅  CSS généré : ${OUTPUT_CSS}  (${tokenCount} variables CSS dans :root)`);

// ─── Mise à jour du safelist Tailwind dans DesignTokenShowcase.tsx ───────────

const SHOWCASE_FILE = path.join(__dirname, '../components/modules/DesignTokenShowcase.tsx');

if (fs.existsSync(SHOWCASE_FILE) && compositeStyles.length > 0) {
  const typoClasses = compositeStyles.map(([id]) => `typo-${id.replace(/^typography-/, '')}`);

  // Regroupe par préfixe (typo-headline-*, typo-body-*, typo-label-*) pour la lisibilité
  const groups = {};
  for (const cls of typoClasses) {
    const parts = cls.replace('typo-', '').split('-');
    const prefix = parts[0]; // headline, body, label
    if (!groups[prefix]) groups[prefix] = [];
    groups[prefix].push(cls);
  }

  const classLines = Object.values(groups).map(g => ` * ${g.join(' ')}`);

  const newComment = [
    '/**',
    ' * Safelist Tailwind — empêche le tree-shaking des classes typo-* générées dynamiquement.',
    ' * Ces classes sont définies via @utility dans _tokens.css et utilisées via typoClassName(id).',
    ' * ⚠️  NE PAS MODIFIER MANUELLEMENT — relancer `npm run sync-tokens`',
    ...classLines,
    ' */',
  ].join('\n');

  let showcase = fs.readFileSync(SHOWCASE_FILE, 'utf8');
  showcase = showcase.replace(
    /\/\*\*\n \* Safelist Tailwind[\s\S]*?\*\//,
    newComment
  );
  fs.writeFileSync(SHOWCASE_FILE, showcase, 'utf8');
  console.log(`✅  Safelist   : ${typoClasses.length} classes typo-* mises à jour dans DesignTokenShowcase.tsx`);
}

// ─── Mise à jour chirurgicale de globals.css ─────────────────────────────────
// Ne touche QUE : (1) l'import _tokens.css, (2) le bloc @theme inline.
// Tout le reste (body, custom CSS) est préservé tel quel.

if (fs.existsSync(GLOBALS)) {
  const themeBlock = [
    '@theme inline {',
    '  --font-sans:  var(--typography-font-family-secondary);',
    '  --font-serif: var(--typography-font-family-primary);',
  ];
  if (tabletBreakpoint)  themeBlock.push(`  --breakpoint-tablet:  ${tabletBreakpoint};`);
  if (desktopBreakpoint) themeBlock.push(`  --breakpoint-desktop: ${desktopBreakpoint};`);
  themeBlock.push('}');
  const themeStr = themeBlock.join('\n');

  let content = fs.readFileSync(GLOBALS, 'utf8');

  // 1) S'assurer que l'import _tokens.css est présent juste après tailwindcss
  if (!content.includes(IMPORT_LINE)) {
    content = content.replace('@import "tailwindcss";', `@import "tailwindcss";\n${IMPORT_LINE}`);
  }

  // 2) Remplacer le bloc @theme inline existant — ou l'ajouter à la fin
  if (/@theme inline \{[\s\S]*?\}/.test(content)) {
    content = content.replace(/@theme inline \{[\s\S]*?\}/, themeStr);
  } else {
    content = content.trimEnd() + '\n\n' + themeStr + '\n';
  }

  fs.writeFileSync(GLOBALS, content, 'utf8');
  console.log(`✅  globals.css mis à jour — breakpoints Tailwind : tablet=${tabletBreakpoint}, desktop=${desktopBreakpoint}`);
}

console.log(`\n🎉  Terminé — ${tokenCount} tokens CSS prêts.\n`);
