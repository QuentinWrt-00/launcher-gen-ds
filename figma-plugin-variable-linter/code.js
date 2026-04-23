// code.js — AKQA Variable Linter

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rgbToHex(r, g, b) {
  function toHex(v) { return Math.round(v * 255).toString(16).padStart(2, '0').toUpperCase(); }
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

// ─── Audit ────────────────────────────────────────────────────────────────────

function checkNumberProp(node, prop, violations, skipZero) {
  var value = node[prop];
  if (typeof value !== 'number') return;
  if (skipZero !== false && value === 0) return;
  if (node.boundVariables && node.boundVariables[prop]) return;
  violations.push({ layerId: node.id, layerName: node.name, property: prop, rawValue: String(value) });
}

function checkFills(node, violations) {
  if (!Array.isArray(node.fills)) return;
  var boundFills = (node.boundVariables && node.boundVariables.fills) || [];
  node.fills.forEach(function(fill, i) {
    if (fill.type !== 'SOLID') return;
    if (boundFills[i]) return;
    violations.push({ layerId: node.id, layerName: node.name, property: 'fill', rawValue: rgbToHex(fill.color.r, fill.color.g, fill.color.b) });
  });
}

function checkStrokes(node, violations) {
  if (!Array.isArray(node.strokes)) return;
  var boundStrokes = (node.boundVariables && node.boundVariables.strokes) || [];
  node.strokes.forEach(function(stroke, i) {
    if (stroke.type !== 'SOLID') return;
    if (boundStrokes[i]) return;
    violations.push({ layerId: node.id, layerName: node.name, property: 'stroke', rawValue: rgbToHex(stroke.color.r, stroke.color.g, stroke.color.b) });
  });
}

function checkRadius(node, violations) {
  if (typeof node.cornerRadius === 'undefined') return;
  var bv = node.boundVariables || {};

  // Si cornerRadius est bound (toutes coins identiques via variable) → rien à flag
  if (bv.cornerRadius) return;

  // Si au moins un coin individuel est bound → la valeur est tokenisée
  if (bv.topLeftRadius || bv.topRightRadius || bv.bottomLeftRadius || bv.bottomRightRadius) return;

  // cornerRadius uniforme et non bound
  if (typeof node.cornerRadius === 'number' && node.cornerRadius !== 0) {
    violations.push({ layerId: node.id, layerName: node.name, property: 'cornerRadius', rawValue: String(node.cornerRadius) });
    return;
  }

  // cornerRadius mixed → checker chaque coin individuellement
  ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'].forEach(function(prop) {
    checkNumberProp(node, prop, violations, true);
  });
}

function checkSpacing(node, violations) {
  // Uniquement sur les frames en auto-layout — exclut les viewboxes d'icônes et frames sans layout
  if (!node.layoutMode || node.layoutMode === 'NONE') return;
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
    violations.push({ layerId: node.id, layerName: node.name, property: 'effect', rawValue: effect.type === 'DROP_SHADOW' ? 'drop-shadow' : 'inner-shadow' });
  });
}

function checkTextProps(node, violations) {
  if (node.type !== 'TEXT') return;

  checkNumberProp(node, 'fontSize', violations, false);

  if (!(node.boundVariables && node.boundVariables.fontFamily)) {
    var fontName = node.fontName;
    if (fontName && fontName.family) {
      violations.push({ layerId: node.id, layerName: node.name, property: 'fontFamily', rawValue: fontName.family });
    }
  }

  if (!(node.boundVariables && node.boundVariables.lineHeight)) {
    var lh = node.lineHeight;
    if (lh && lh.unit !== 'AUTO') {
      violations.push({ layerId: node.id, layerName: node.name, property: 'lineHeight', rawValue: lh.value + (lh.unit === 'PERCENT' ? '%' : 'px') });
    }
  }

  if (!(node.boundVariables && node.boundVariables.letterSpacing)) {
    var ls = node.letterSpacing;
    if (ls && ls.value !== 0) {
      violations.push({ layerId: node.id, layerName: node.name, property: 'letterSpacing', rawValue: ls.value + (ls.unit === 'PERCENT' ? '%' : 'px') });
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

function findViolations(nodes) {
  var violations = [];
  nodes.forEach(function(node) { auditNode(node, violations); });
  return violations;
}

// ─── Overlays ─────────────────────────────────────────────────────────────────

var AUDIT_FRAME_NAME = '[Audit]';

function getSelectionBounds(selection) {
  var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  selection.forEach(function(node) {
    var b = node.absoluteBoundingBox;
    if (!b) return;
    if (b.x < minX) minX = b.x;
    if (b.y < minY) minY = b.y;
    if (b.x + b.width > maxX) maxX = b.x + b.width;
    if (b.y + b.height > maxY) maxY = b.y + b.height;
  });
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

async function createAuditOverlays(violations, selectionBounds) {
  clearAuditOverlays();
  if (violations.length === 0) return;

  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });

  // Bloc unique positionné à droite de la bounding box de toute la sélection
  var container = figma.createFrame();
  container.name = AUDIT_FRAME_NAME;
  container.fills = [{ type: 'SOLID', color: { r: 0.08, g: 0.08, b: 0.08 } }];
  container.cornerRadius = 6;
  container.layoutMode = 'VERTICAL';
  container.primaryAxisSizingMode = 'AUTO';
  container.counterAxisSizingMode = 'FIXED';
  container.resize(240, 10); // largeur fixe, hauteur auto
  container.paddingLeft = 12;
  container.paddingRight = 12;
  container.paddingTop = 10;
  container.paddingBottom = 10;
  container.itemSpacing = 5;
  container.x = selectionBounds.x + selectionBounds.width + 24;
  container.y = selectionBounds.y;

  // En-tête : nombre de violations
  var header = figma.createText();
  header.fontName = { family: 'Inter', style: 'Regular' };
  header.characters = violations.length + ' violation' + (violations.length > 1 ? 's' : '');
  header.fontSize = 11;
  header.fills = [{ type: 'SOLID', color: { r: 1, g: 0.231, b: 0.188 } }];
  container.appendChild(header);

  // Ligne de séparation visuelle (frame de 1px)
  var divider = figma.createFrame();
  divider.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 0.1 } }];
  divider.resize(216, 1);
  divider.layoutAlign = 'STRETCH';
  container.appendChild(divider);

  // Une ligne par violation : "LayerName  ›  property: value"
  violations.forEach(function(v) {
    var row = figma.createText();
    row.fontName = { family: 'Inter', style: 'Regular' };
    row.characters = v.layerName + '  ›  ' + v.property + ': ' + v.rawValue;
    row.fontSize = 10;
    row.fills = [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85 } }];
    container.appendChild(row);
  });

  figma.currentPage.appendChild(container);
}

function clearAuditOverlays() {
  var existing = figma.currentPage.findOne(function(n) { return n.name === AUDIT_FRAME_NAME; });
  if (existing) existing.remove();
}

// ─── Plugin entrypoint ────────────────────────────────────────────────────────

figma.showUI(__html__, { width: 240, height: 200 });

figma.ui.onmessage = async function(msg) {
  if (msg.type === 'run') {
    var selection = figma.currentPage.selection;
    if (selection.length === 0) {
      figma.ui.postMessage({ type: 'error', message: 'Select at least one layer' });
      return;
    }
    var violations = findViolations(selection);
    var selectionBounds = getSelectionBounds(selection);
    await createAuditOverlays(violations, selectionBounds);
    figma.ui.postMessage({ type: 'result', count: violations.length });
  }

  if (msg.type === 'clear') {
    clearAuditOverlays();
  }
};
