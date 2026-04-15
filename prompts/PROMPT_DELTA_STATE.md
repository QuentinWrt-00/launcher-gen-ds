Voici le design de l'état [NOM_DE_L_ÉTAT — ex: Hover, Pressed, Disabled] : [URL_DU_NOEUD_FIGMA]

Avant tout, lis le composant existant : [chemin/Composant.tsx]

Ensuite, analyse le nœud Figma via MCP pour identifier les changements visuels propres à cet état.

Si les tokens correspondants ne sont pas encore appliqués dans le composant, génère le patch minimal :
- soit les classes à ajouter dans la variante `cva` concernée
- soit le bloc `whileHover` / `whileTap` à ajouter sur le `motion.*` existant

Format de réponse attendu : la ligne exacte à remplacer ou le bloc exact à insérer, avec son emplacement dans le fichier. Rien d'autre.

⚠️ Ne réécrire pas le composant entier. Ne pas modifier ce qui fonctionne déjà.
