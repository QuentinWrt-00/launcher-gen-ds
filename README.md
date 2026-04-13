# launch-gen-ds

Générateur de projet front-end pour les design systems AKQA.

Lance un script pour créer un projet configuré (Next.js, Tailwind v4, Framer Motion, règles IA) et synchroniser les tokens Figma en CSS — sans rien installer manuellement.

---

## Prérequis

- Node.js LTS
- Git

---

## Utilisation

```bash
# Cloner le repo une seule fois
git clone https://github.com/QuentinWrt-00/launch-gen-ds.git ~/Desktop/launch-gen-ds

# Créer un nouveau projet
bash ~/Desktop/launch-gen-ds/create-project.sh MonProjet ~/Desktop
```

Le projet est prêt dans `~/Desktop/MonProjet`.

---

## Ce que le script installe

| Outil | Rôle |
|---|---|
| Next.js (App Router) | Framework |
| TypeScript | Langage |
| Tailwind v4 | Styles |
| Framer Motion | Animations |
| ESLint | Lint |

---

## Synchroniser les tokens Figma

1. Exporter les variables Figma via le plugin AKQA → `figma-design-tokens.json`
2. Déposer le fichier à la racine du projet
3. Lancer :

```bash
npm run sync-tokens
```

Les tokens sont générés dans `app/_tokens.css` sous forme de variables CSS et de classes `typo-*`.

---

## Structure du repo

```
create-project.sh       → script principal
convert-tokens.js       → étape 1 : export Figma → format W3C
tokens-to-css.js        → étape 2 : W3C → variables CSS + classes typo-*
templates/
└── rules/              → règles Cursor copiées dans chaque projet
```

---

## Guide complet

Voir la page Notion : [Guide de démarrage — De zéro à un projet configuré](https://www.notion.so/33eb508386658173afdad85eb9f9ff9c)
