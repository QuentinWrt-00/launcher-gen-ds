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
var BADGE_COLOR = { r: 1, g: 0.231, b: 0.188 };
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
  auditFrame.resize(1, 1);
  figma.currentPage.appendChild(auditFrame);

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
