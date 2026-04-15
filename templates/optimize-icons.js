#!/usr/bin/env node
/**
 * optimize-icons.js
 * Nettoie les SVGs dans public/icons/ après export Figma :
 * - Supprime les artefacts Figma (preserveAspectRatio, overflow, style, id, width, height)
 * - Normalise fill et stroke en currentColor (sauf valeur "none")
 * Usage : npm run optimize-icons
 */

const { optimize } = require("svgo");
const fs = require("fs");
const path = require("path");

const iconsDir = path.join(process.cwd(), "public/icons");

if (!fs.existsSync(iconsDir)) {
  console.log("📁  public/icons/ introuvable — abandon.");
  process.exit(0);
}

const svgoConfig = {
  plugins: [
    {
      name: "preset-default",
      params: {
        overrides: {
          removeViewBox: false, // viewBox obligatoire pour le dimensionnement CSS
        },
      },
    },
    "removeTitle",
    "removeDesc",
    {
      name: "removeAttrs",
      params: {
        // Artefacts systématiques des exports Figma
        attrs: ["preserveAspectRatio", "overflow", "style", "id"],
      },
    },
    {
      name: "removeDimensions", // Supprime width/height racine — le dimensionnement est géré en CSS
    },
  ],
};

const files = fs.readdirSync(iconsDir).filter((f) => f.endsWith(".svg"));

if (files.length === 0) {
  console.log("ℹ️   Aucun SVG dans public/icons/");
  process.exit(0);
}

let count = 0;

for (const file of files) {
  const filePath = path.join(iconsDir, file);
  const input = fs.readFileSync(filePath, "utf8");

  const result = optimize(input, { path: filePath, ...svgoConfig });

  // Normalise fill et stroke en currentColor (sauf "none")
  // Couvre les icônes "filled" (fill) et "outline" (stroke)
  const cleaned = result.data
    .replace(/\bfill="(?!none")[^"]*"/g, 'fill="currentColor"')
    .replace(/\bstroke="(?!none")[^"]*"/g, 'stroke="currentColor"');

  fs.writeFileSync(filePath, cleaned, "utf8");
  console.log(`  ✅  ${file}`);
  count++;
}

console.log(`\n🎉  ${count} SVG${count > 1 ? "s" : ""} optimisé${count > 1 ? "s" : ""} dans public/icons/`);
