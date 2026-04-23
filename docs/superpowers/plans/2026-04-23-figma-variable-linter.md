# Figma Variable Linter — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Créer un plugin Figma standalone (`figma-plugin-variable-linter/`) qui détecte les propriétés non liées à une variable Figma sur les layers sélectionnés et affiche des badges d'annotation sur le canvas.

**Architecture:** Plain JS, sans build step — même pattern que le plugin existant `figma-plugin/`. Logique d'audit pure dans `findViolations()`, création des overlays via l'API Figma dans `createAuditOverlays()`, panel UI minimaliste dans `ui.html`. Les badges sont regroupés sous un frame `[Audit]` supprimé au Clear.

**Tech Stack:** JavaScript vanilla, Figma Plugin API

---

## File Map

| Fichier | Rôle |
|---|---|
| `figma-plugin-variable-linter/manifest.json` | Déclaration du plugin (nom, entrypoints) |
| `figma-plugin-variable-linter/code.js` | Logique audit + overlays + message handlers |
| `figma-plugin-variable-linter/ui.html` | Panel UI (Run / Clear / compteur) |

---

### Task 1 : Scaffold + manifest

**Files:**
- Create: `figma-plugin-variable-linter/manifest.json`

- [ ] **Step 1 : Créer le répertoire et le manifest**

```bash
mkdir figma-plugin-variable-linter
```

`figma-plugin-variable-linter/manifest.json` :
```json
{
  "name": "AKQA Variable Linter",
  "id": "akqa-variable-linter-1",
  "api": "1.0.0",
  "main": "code.js",
  "ui": "ui.html",
  "editorType": ["figma"]
}
```

- [ ] **Step 2 : Vérifier dans Figma que le plugin se charge**

Dans Figma Desktop :
1. Menu **Plugins > Development > Import plugin from manifest...**
2. Sélectionner `figma-plugin-variable-linter/manifest.json`

Expected : le plugin apparaît dans la liste Development. Il n'a pas encore de `code.js`, donc il n'est pas encore exécutable — c'est normal.

- [ ] **Step 3 : Commit**

```bash
git add figma-plugin-variable-linter/manifest.json
git commit -m "chore: scaffold figma-plugin-variable-linter"
```

---

### Task 2 : Panel UI

**Files:**
- Create: `figma-plugin-variable-linter/ui.html`

- [ ] **Step 1 : Créer ui.html**

`figma-plugin-variable-linter/ui.html` :
```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>AKQA Variable Linter</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: Inter, system-ui, sans-serif;
  font-size: 12px;
  background: #FAF5F2;
  color: #000;
  padding: 20px;
  width: 240px;
}
h2 {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 16px;
  letter-spacing: 0.02em;
}
button {
  width: 100%;
  padding: 10px 16px;
  border: none;
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
}
#btn-run  { background: #000; color: #FAF5F2; margin-bottom: 8px; }
#btn-clear { background: #e8e3df; color: #000; }
button:hover    { opacity: 0.75; }
button:disabled { opacity: 0.3; cursor: not-allowed; }
#status {
  font-size: 11px;
  color: #555;
  min-height: 16px;
  margin: 12px 0;
}
#status.error   { color: #c0392b; }
#status.success { color: #1a7a3c; }
</style>
</head>
<body>

<h2>Variable Linter</h2>
<button id="btn-run">Run Audit</button>
<div id="status"></div>
<button id="btn-clear">Clear</button>

<script>
var status = document.getElementById('status');
var btnRun  = document.getElementById('btn-run');
var btnClear = document.getElementById('btn-clear');

btnRun.addEventListener('click', function() {
  btnRun.disabled = true;
  status.className = '';
  status.textContent = 'Running…';
  parent.postMessage({ pluginMessage: { type: 'run' } }, '*');
});

btnClear.addEventListener('click', function() {
  status.className = '';
  status.textContent = '';
  parent.postMessage({ pluginMessage: { type: 'clear' } }, '*');
});

window.onmessage = function(event) {
  var msg = event.data.pluginMessage;
  if (!msg) return;
  btnRun.disabled = false;
  if (msg.type === 'result') {
    if (msg.count === 0) {
      status.className = 'success';
      status.textContent = 'No violations ✓';
    } else {
      status.className = '';
      status.textContent = '→ ' + msg.count + ' violation' + (msg.count > 1 ? 's' : '') + ' found';
    }
  }
  if (msg.type === 'error') {
    status.className = 'error';
    status.textContent = msg.message;
  }
};
</script>
</body>
</html>
```

- [ ] **Step 2 : Commit**

```bash
git add figma-plugin-variable-linter/ui.html
git commit -m "feat(variable-linter): add UI panel"
```

---

### Task 3 : Logique d'audit (`findViolations`)

**Files:**
- Create: `figma-plugin-variable-linter/code.js` (section audit uniquement, pas encore de message handler)

Note : Cette fonction est pure (aucun appel Figma) — elle prend un tableau de nodes et retourne un tableau de violations.

- [ ] **Step 1 : Créer code.js avec la logique d'audit**

`figma-plugin-variable-linter/code.js` :
```js
// ─── Helpers ──────────────────────────────────────────────────────────────────

function rgbToHex(r, g, b) {
  function toHex(v) { return Math.round(v * 255).toString(16).padStart(2, '0').toUpperCase(); }
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

// ─── Audit ────────────────────────────────────────────────────────────────────

/**
 * Vérifie si une propriété numérique n'est pas liée à une variable.
 * Ignore les valeurs à 0 (propriété non appliquée) sauf si skipZero = false.
 */
function checkNumberProp(node, prop, violations, skipZero) {
  var value = node[prop];
  if (typeof value !== 'number') return;
  if (skipZero !== false && value === 0) return;
  var bound = node.boundVariables && node.boundVariables[prop];
  if (bound) return;
  violations.push({ layerId: node.id, layerName: node.name, property: prop, rawValue: String(value) });
}

function checkFills(node, violations) {
  if (!Array.isArray(node.fills)) return;
  var boundFills = (node.boundVariables && node.boundVariables.fills) || [];
  node.fills.forEach(function(fill, i) {
    if (fill.type !== 'SOLID') return;
    if (boundFills[i]) return;
    violations.push({
      layerId: node.id,
      layerName: node.name,
      property: 'fill',
      rawValue: rgbToHex(fill.color.r, fill.color.g, fill.color.b),
    });
  });
}

function checkStrokes(node, violations) {
  if (!Array.isArray(node.strokes)) return;
  var boundStrokes = (node.boundVariables && node.boundVariables.strokes) || [];
  node.strokes.forEach(function(stroke, i) {
    if (stroke.type !== 'SOLID') return;
    if (boundStrokes[i]) return;
    violations.push({
      layerId: node.id,
      layerName: node.name,
      property: 'stroke',
      rawValue: rgbToHex(stroke.color.r, stroke.color.g, stroke.color.b),
    });
  });
}

function checkRadius(node, violations) {
  ['cornerRadius', 'topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'].forEach(function(prop) {
    checkNumberProp(node, prop, violations, true);
  });
}

function checkSpacing(node, violations) {
  ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom', 'itemSpacing', 'counterAxisSpacing'].forEach(function(prop) {
    checkNumberProp(node, prop, violations, true);
  });
}

function checkEffects(node, violations) {
  if (!Array.isArray(node.effects)) return;
  var boundEffects = (node.boundVariables && node.boundVariables.effects) || [];
  node.effects.forEach(function(effect, i) {
    if (effect.type !== 'DROP_SHADOW' && effect.type !== 'INNER_SHADOW') return;
    if (boundEffects[i]) return;
    violations.push({
      layerId: node.id,
      layerName: node.name,
      property: 'effect',
      rawValue: effect.type === 'DROP_SHADOW' ? 'drop-shadow' : 'inner-shadow',
    });
  });
}

function checkTextProps(node, violations) {
  if (node.type !== 'TEXT') return;

  // fontSize — nombre simple
  checkNumberProp(node, 'fontSize', violations, false);

  // fontFamily — string via node.fontName.family
  if (!(node.boundVariables && node.boundVariables.fontFamily)) {
    var fontName = node.fontName;
    if (fontName && fontName.family) {
      violations.push({ layerId: node.id, layerName: node.name, property: 'fontFamily', rawValue: fontName.family });
    }
  }

  // lineHeight — objet { unit: 'PIXELS'|'PERCENT'|'AUTO', value?: number }
  if (!(node.boundVariables && node.boundVariables.lineHeight)) {
    var lh = node.lineHeight;
    if (lh && lh.unit !== 'AUTO') {
      var lhVal = lh.value + (lh.unit === 'PERCENT' ? '%' : 'px');
      violations.push({ layerId: node.id, layerName: node.name, property: 'lineHeight', rawValue: lhVal });
    }
  }

  // letterSpacing — objet { unit: 'PIXELS'|'PERCENT', value: number }
  if (!(node.boundVariables && node.boundVariables.letterSpacing)) {
    var ls = node.letterSpacing;
    if (ls && ls.value !== 0) {
      var lsVal = ls.value + (ls.unit === 'PERCENT' ? '%' : 'px');
      violations.push({ layerId: node.id, layerName: node.name, property: 'letterSpacing', rawValue: lsVal });
    }
  }
}

function auditNode(node, violations) {
  checkFills(node, violations);
  checkStrokes(node, violations);
  checkRadius(node, violations);
  checkSpacing(node, violations);
  checkEffects(node, violations);
  checkTextProps(node, violations);

  if (node.children && node.children.length) {
    node.children.forEach(function(child) { auditNode(child, violations); });
  }
}

/**
 * Point d'entrée de l'audit.
 * @param {readonly SceneNode[]} nodes - sélection Figma
 * @returns {{ layerId, layerName, property, rawValue }[]}
 */
function findViolations(nodes) {
  var violations = [];
  nodes.forEach(function(node) { auditNode(node, violations); });
  return violations;
}
```

- [ ] **Step 2 : Vérifier manuellement la logique (dry run)**

Ouvrir Figma, console DevTools (Ctrl+Alt+I) non disponible côté plugin sandbox. À la place, ajouter temporairement une ligne en bas de `code.js` pour valider la structure :

```js
// Test rapide — à supprimer avant commit
var mockNode = {
  id: 'n1', name: 'Test', type: 'RECTANGLE',
  fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }],
  strokes: [], effects: [], boundVariables: {}, children: []
};
var result = findViolations([mockNode]);
console.log('violations:', JSON.stringify(result));
// Expected: [{ layerId: 'n1', layerName: 'Test', property: 'fill', rawValue: '#FF0000' }]
```

Supprimer ces lignes de test avant de passer à la suite.

- [ ] **Step 3 : Commit**

```bash
git add figma-plugin-variable-linter/code.js
git commit -m "feat(variable-linter): add audit engine (findViolations)"
```

---

### Task 4 : Overlays canvas (`createAuditOverlays`, `clearAuditOverlays`)

**Files:**
- Modify: `figma-plugin-variable-linter/code.js` (ajouter les fonctions overlay après `findViolations`)

- [ ] **Step 1 : Ajouter les fonctions overlay à code.js**

Ajouter après la fonction `findViolations` dans `code.js` :

```js
// ─── Overlays ─────────────────────────────────────────────────────────────────

var AUDIT_FRAME_NAME = '[Audit]';
var BADGE_COLOR = { r: 1, g: 0.231, b: 0.188 };  // #FF3B30
var BADGE_OFFSET_X = -4;
var BADGE_OFFSET_Y = -4;
var BADGE_STACK_OFFSET = 22;

async function createBadge(label, x, y, stackIndex) {
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });

  var badge = figma.createFrame();
  badge.name = 'badge:' + label;
  badge.fills = [{ type: 'SOLID', color: BADGE_COLOR }];
  badge.cornerRadius = 4;
  badge.layoutMode = 'HORIZONTAL';
  badge.primaryAxisSizingMode = 'AUTO';
  badge.counterAxisSizingMode = 'AUTO';
  badge.primaryAxisAlignItems = 'CENTER';
  badge.counterAxisAlignItems = 'CENTER';
  badge.paddingLeft = 6;
  badge.paddingRight = 6;
  badge.paddingTop = 2;
  badge.paddingBottom = 2;

  var text = figma.createText();
  text.characters = label;
  text.fontSize = 10;
  text.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  badge.appendChild(text);

  // Positionner après resize auto (le badge a maintenant ses dimensions réelles)
  badge.x = x + BADGE_OFFSET_X;
  badge.y = y + BADGE_OFFSET_Y + stackIndex * BADGE_STACK_OFFSET;

  return badge;
}

async function createAuditOverlays(violations) {
  clearAuditOverlays();
  if (violations.length === 0) return;

  var auditFrame = figma.createFrame();
  auditFrame.name = AUDIT_FRAME_NAME;
  auditFrame.fills = [];
  auditFrame.clipsContent = false;
  // Dimensionner le frame racine à 0x0 (il est juste un conteneur logique)
  auditFrame.resize(1, 1);
  figma.currentPage.appendChild(auditFrame);

  // Grouper les violations par layerId pour empiler les badges proprement
  var byLayer = {};
  violations.forEach(function(v) {
    if (!byLayer[v.layerId]) byLayer[v.layerId] = [];
    byLayer[v.layerId].push(v);
  });

  for (var layerId in byLayer) {
    var node = figma.getNodeById(layerId);
    if (!node || !node.absoluteBoundingBox) continue;
    var bounds = node.absoluteBoundingBox;
    var layerViolations = byLayer[layerId];

    for (var i = 0; i < layerViolations.length; i++) {
      var v = layerViolations[i];
      var badge = await createBadge(v.property + ': ' + v.rawValue, bounds.x, bounds.y, i);
      auditFrame.appendChild(badge);
    }
  }
}

function clearAuditOverlays() {
  var existing = figma.currentPage.findOne(function(n) { return n.name === AUDIT_FRAME_NAME; });
  if (existing) existing.remove();
}
```

- [ ] **Step 2 : Commit**

```bash
git add figma-plugin-variable-linter/code.js
git commit -m "feat(variable-linter): add canvas badge overlay functions"
```

---

### Task 5 : Message handler + test manuel complet

**Files:**
- Modify: `figma-plugin-variable-linter/code.js` (ajouter le handler en fin de fichier)

- [ ] **Step 1 : Ajouter le message handler à la fin de code.js**

```js
// ─── Plugin entrypoint ────────────────────────────────────────────────────────

figma.showUI(__html__, { width: 240, height: 148 });

figma.ui.onmessage = async function(msg) {
  if (msg.type === 'run') {
    var selection = figma.currentPage.selection;
    if (selection.length === 0) {
      figma.ui.postMessage({ type: 'error', message: 'Select at least one layer' });
      return;
    }
    var violations = findViolations(selection);
    await createAuditOverlays(violations);
    figma.ui.postMessage({ type: 'result', count: violations.length });
  }

  if (msg.type === 'clear') {
    clearAuditOverlays();
  }
};
```

- [ ] **Step 2 : Recharger le plugin dans Figma**

Dans Figma : **Plugins > Development > AKQA Variable Linter** (ou Ctrl+Alt+P).

Si le plugin était déjà ouvert, le fermer et le rouvrir pour prendre en compte le nouveau `code.js`.

- [ ] **Step 3 : Test — fill brut**

1. Créer un Rectangle
2. Lui appliquer un fill couleur brute `#FF0000` (sans variable Figma)
3. Sélectionner ce rectangle
4. Lancer le plugin > **Run Audit**

Expected :
- Badge rouge apparaît sur le canvas en haut à gauche du rectangle, texte `fill: #FF0000`
- Compteur dans le panel : `→ 1 violation found`

- [ ] **Step 4 : Test — sélection vide**

1. Désélectionner tout (clic dans le vide)
2. **Run Audit**

Expected : message rouge `Select at least one layer`

- [ ] **Step 5 : Test — Clear**

1. (Violations présentes depuis Step 3)
2. Cliquer **Clear**

Expected :
- Le frame `[Audit]` disparaît du canvas
- Le status dans le panel redevient vide

- [ ] **Step 6 : Test — aucune violation**

1. Créer un Rectangle, lier son fill à une variable Figma couleur
2. Sélectionner + **Run Audit**

Expected : `No violations ✓` en vert dans le panel, aucun badge sur le canvas

- [ ] **Step 7 : Commit**

```bash
git add figma-plugin-variable-linter/code.js
git commit -m "feat(variable-linter): wire up message handler"
```

---

### Task 6 : Tests de validation multi-propriétés

- [ ] **Step 1 : Test — spacing**

1. Créer un Frame avec auto-layout activé
2. Mettre `paddingLeft: 16` (valeur brute, pas de variable)
3. Sélectionner + **Run Audit**

Expected : badge `paddingLeft: 16`

- [ ] **Step 2 : Test — radius**

1. Créer un Rectangle avec `cornerRadius: 8` (valeur brute)
2. Sélectionner + **Run Audit**

Expected : badge `cornerRadius: 8`

- [ ] **Step 3 : Test — typographie**

1. Créer un Text node avec `fontSize: 14` (valeur brute, pas de variable)
2. Sélectionner + **Run Audit**

Expected : badge `fontSize: 14`

- [ ] **Step 4 : Test — imbrication**

1. Créer un Frame parent contenant un Rectangle enfant avec fill brute
2. Sélectionner le Frame parent uniquement + **Run Audit**

Expected : badge sur l'enfant (pas sur le Frame parent), car c'est là que la violation se trouve

- [ ] **Step 5 : Test — plusieurs violations sur un même layer**

1. Créer un Rectangle avec fill brute ET cornerRadius brut (ex: fill `#0000FF`, cornerRadius `12`)
2. Sélectionner + **Run Audit**

Expected : deux badges empilés verticalement sur ce rectangle (`fill: #0000FF` + `cornerRadius: 12`), compteur `→ 2 violations found`

- [ ] **Step 6 : Commit final**

```bash
git add figma-plugin-variable-linter/
git commit -m "feat: figma-plugin-variable-linter complete"
```
