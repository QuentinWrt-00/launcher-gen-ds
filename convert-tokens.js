/**
 * convert-tokens.js
 * Convertit figma-design-tokens.json → format W3C Design Tokens (DTCG)
 * Spec : https://design-tokens.github.io/community-group/format/
 *
 * Usage : node scripts/convert-tokens.js [input] [output]
 */

const fs = require('fs');
const path = require('path');

const INPUT  = process.argv[2] || path.join(__dirname, '../figma-design-tokens.json');
const OUTPUT = process.argv[3] || path.join(__dirname, '../figma-design-tokens.w3c.json');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Figma float color (0-1) → CSS hex ou rgba() si alpha < 1 */
function toHex(r, g, b, a = 1) {
  const hex = (n) => Math.round(n * 255).toString(16).padStart(2, '0');
  if (a < 1) {
    const rInt = Math.round(r * 255);
    const gInt = Math.round(g * 255);
    const bInt = Math.round(b * 255);
    const aVal = parseFloat(a.toFixed(2));
    return `rgba(${rInt}, ${gInt}, ${bInt}, ${aVal})`;
  }
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

/** "cubic-bezier(a, b, c, d)" → [a, b, c, d] */
function parseCubicBezier(str) {
  const match = str.trim().match(/cubic-bezier\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\s*\)/);
  if (match) return [parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3]), parseFloat(match[4])];
  return str.trim();
}

/** Détermine le $type W3C d'un token selon sa collection + son nom */
function getType(collectionName, tokenName, resolvedType) {
  const col = collectionName.trim().toLowerCase();
  const name = tokenName.toLowerCase();

  if (resolvedType === 'COLOR') return 'color';

  if (resolvedType === 'STRING') {
    if (name.includes('family')) return 'fontFamily';
    if (name.includes('weight')) return 'fontWeight';
    if (name.includes('easing') || name.includes('cubic-bezier')) return 'cubicBezier';
    return 'string';
  }

  if (resolvedType === 'FLOAT') {
    if (col === 'opacity') return 'number';
    if (col === 'motion' && name.includes('duration')) return 'duration';
    if (col === 'shadow' && (name.includes('color') || name.includes('colour'))) return 'color';
    if (col === 'shadow') return 'dimension';
    if (name.includes('weight')) return 'fontWeight';
    if (col === 'breakpoints') return 'dimension-px';
    return 'dimension';
  }

  return 'unknown';
}

/** Formate la valeur d'un token selon son type W3C */
function formatValue(type, rawValue, collectionName) {
  const col = collectionName.trim().toLowerCase();

  if (type === 'color') {
    if (rawValue && typeof rawValue === 'object' && 'r' in rawValue) {
      return toHex(rawValue.r, rawValue.g, rawValue.b, rawValue.a);
    }
  }

  if (type === 'cubicBezier') {
    return parseCubicBezier(rawValue);
  }

  if (type === 'fontWeight') {
    return String(rawValue);
  }

  if (type === 'dimension-px') {
    return `${rawValue}px`;
  }

  if (type === 'duration') {
    return `${rawValue}ms`;
  }

  if (type === 'dimension') {
    if (col === 'opacity') return rawValue;
    return `${rawValue}px`;
  }

  if (type === 'number') {
    const col = collectionName.trim().toLowerCase();
    if (col === 'opacity') return parseFloat(rawValue) / 100;
    return rawValue;
  }

  return rawValue;
}

// ─── Gradient helpers ─────────────────────────────────────────────────────────

/**
 * Matrice affine Figma 2×3 → angle CSS en degrés.
 * Vecteur direction en espace objet : dx = a, dy = c.
 * Convention CSS : 0° = to top, 90° = to right, sens horaire.
 */
function gradientTransformToAngle(gradientTransform) {
  const [[a], [c]] = gradientTransform;
  const angleDeg = Math.atan2(a, -c) * (180 / Math.PI);
  return Math.round(((angleDeg % 360) + 360) % 360);
}

/**
 * Matrice affine Figma 2×3 → centre en % pour radial / angular / diamond.
 * Le centre est le point (0.5, 0.5) de l'espace gradient projeté en espace objet.
 */
function gradientCenter(gradientTransform) {
  const [[a, b, tx], [c, d, ty]] = gradientTransform;
  const cx = Math.round((a * 0.5 + b * 0.5 + tx) * 100);
  const cy = Math.round((c * 0.5 + d * 0.5 + ty) * 100);
  return { cx, cy };
}

/** Convertit les gradientStops Figma (floats 0-1) en tableau stops W3C */
function buildStops(gradientStops) {
  return gradientStops.map(stop => ({
    color: toHex(stop.color.r, stop.color.g, stop.color.b, stop.color.a),
    position: stop.position,
  }));
}

/**
 * Convertit colorStyles → tokens W3C de type "gradient".
 * LINEAR  → linear-gradient
 * RADIAL  → radial-gradient (circle, centre calculé)
 * ANGULAR → conic-gradient  (angle de départ + centre)
 * DIAMOND → radial-gradient (fallback CSS — pas d'équivalent natif)
 */
function convertColorStyles(colorStyles) {
  const result = {};
  for (const [groupName, items] of Object.entries(colorStyles)) {
    const group = {};
    for (const [tokenName, style] of Object.entries(items)) {
      const paint = style.paints?.[0];
      if (!paint) continue;

      const stops = buildStops(paint.gradientStops);

      if (paint.type === 'GRADIENT_LINEAR') {
        const angle = gradientTransformToAngle(paint.gradientTransform);
        group[tokenName] = {
          $type: 'gradient',
          $value: { type: 'linear', angle, stops },
        };
      } else if (paint.type === 'GRADIENT_RADIAL') {
        const { cx, cy } = gradientCenter(paint.gradientTransform);
        group[tokenName] = {
          $type: 'gradient',
          $value: { type: 'radial', cx, cy, stops },
        };
      } else if (paint.type === 'GRADIENT_ANGULAR') {
        const { cx, cy } = gradientCenter(paint.gradientTransform);
        const angle = gradientTransformToAngle(paint.gradientTransform);
        group[tokenName] = {
          $type: 'gradient',
          $value: { type: 'angular', angle, cx, cy, stops },
        };
      } else if (paint.type === 'GRADIENT_DIAMOND') {
        const { cx, cy } = gradientCenter(paint.gradientTransform);
        group[tokenName] = {
          $type: 'gradient',
          $value: { type: 'diamond', cx, cy, stops },
          $extensions: { 'com.figma': { note: 'Diamond gradient — rendu en radial, pas d\'équivalent CSS natif' } },
        };
      }
    }
    if (Object.keys(group).length > 0) result[groupName] = group;
  }
  return result;
}

// ─── Build ID → path map ──────────────────────────────────────────────────────

function buildIdMap(data) {
  const map = {}; // VariableID:xxx → "collection.path.to.token"

  const { variablesByCollection, variableCollectionMetadata } = data;

  for (const [colId, tokens] of Object.entries(variablesByCollection)) {
    const colMeta = variableCollectionMetadata[colId];
    const colName = colMeta ? colMeta.name.trim() : colId;

    function walkForIds(obj, pathParts) {
      for (const [key, val] of Object.entries(obj)) {
        if (val && val.id && val.resolvedType) {
          const tokenPath = [...pathParts, key].join('.');
          map[val.id] = `${colName}.${tokenPath}`;
        } else if (val && typeof val === 'object') {
          walkForIds(val, [...pathParts, key]);
        }
      }
    }
    walkForIds(tokens, []);
  }

  return map;
}

// ─── Convert collection → W3C group ──────────────────────────────────────────

function convertCollection(tokens, colName, defaultModeId, idMap) {
  const result = {};

  function walkTokens(obj, target) {
    for (const [key, val] of Object.entries(obj)) {
      if (val && val.id && val.resolvedType) {
        // C'est un token
        const type = getType(colName, val.name, val.resolvedType);
        const rawValue = val.valuesByMode[defaultModeId];

        let $value;

        if (rawValue && typeof rawValue === 'object' && rawValue.type === 'VARIABLE_ALIAS') {
          // Alias → référence W3C
          const refPath = idMap[rawValue.id];
          $value = refPath ? `{${refPath}}` : rawValue.id;
        } else {
          $value = formatValue(type, rawValue, colName);
        }

        const token = { $value, $type: type };
        if (val.description) token.$description = val.description;

        // Modes additionnels → $extensions
        const allModes = Object.entries(val.valuesByMode);
        if (allModes.length > 1) {
          const modes = {};
          for (const [modeId, modeVal] of allModes) {
            if (modeId === defaultModeId) continue;
            if (modeVal && typeof modeVal === 'object' && modeVal.type === 'VARIABLE_ALIAS') {
              const refPath = idMap[modeVal.id];
              modes[modeId] = refPath ? `{${refPath}}` : modeVal.id;
            } else {
              modes[modeId] = formatValue(type, modeVal, colName);
            }
          }
          if (Object.keys(modes).length > 0) {
            token.$extensions = { 'com.figma': { modes } };
          }
        }

        target[key] = token;
      } else if (val && typeof val === 'object') {
        target[key] = {};
        walkTokens(val, target[key]);
      }
    }
  }

  walkTokens(tokens, result);
  return result;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log(`\n📥  Lecture : ${INPUT}`);

const raw  = fs.readFileSync(INPUT, 'utf8');
const data = JSON.parse(raw);

const { variablesByCollection, variableCollectionMetadata } = data;

// Étape 1 : carte ID → chemin
const idMap = buildIdMap(data);

// Étape 2 : conversion
const output = {};
let tokenCount = 0;

for (const [colId, tokens] of Object.entries(variablesByCollection)) {
  const meta = variableCollectionMetadata[colId];
  const colName = meta ? meta.name.trim() : colId;
  const defaultModeId = meta ? meta.defaultModeId : Object.keys(
    Object.values(tokens)[0]?.valuesByMode || {}
  )[0];

  output[colName] = convertCollection(tokens, colName, defaultModeId, idMap);

  // Comptage
  function count(obj) {
    let n = 0;
    for (const v of Object.values(obj)) {
      if (v.$value !== undefined) n++;
      else n += count(v);
    }
    return n;
  }
  tokenCount += count(output[colName]);
}

// Étape 3 : colorStyles → gradients
if (data.colorStyles) {
  const gradients = convertColorStyles(data.colorStyles);
  for (const [groupName, tokens] of Object.entries(gradients)) {
    output[groupName] = tokens;
    tokenCount += Object.keys(tokens).length;
  }
}

// Étape 4 : écriture
fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2), 'utf8');

console.log(`✅  Conversion terminée`);
console.log(`   Collections : ${Object.keys(output).join(', ')}`);
console.log(`   Tokens      : ${tokenCount}`);
console.log(`📤  Sortie     : ${OUTPUT}\n`);
