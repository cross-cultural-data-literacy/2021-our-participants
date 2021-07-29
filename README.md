# 2021-our-participants
A datavisualization project showing the diversity of our participants and their work

## Data
Any data included in the repository should be anonimised.

## Ingredients
- Tree map
- [Datasheet](https://docs.google.com/spreadsheets/d/e/2PACX-1vTpHsrDU_GQb1bscKLWeyuWt_5N5UglcmtuyfjizGE3h27UKIJ9f-UvOFv7mOsoM3POpYq_vSrAXwK_/pub?gid=1518708891&single=true&output=csv)
- Hosted version

## Svelte + d3
- [d3 preprocessing + svelte template logic for rendering](https://svelte.dev/repl/8262eb73a08f48adba8e0b706c1a939f?version=3.22.1)

## Todo
- Treemap should group similar nodes! That way they can also visually be grouped
- Emoji text-size should be refined, current method doesn't stay within bounds for different resolutions

## Change notes
Laurens:
- The text of each node was actually positioned in the cell above, resulting in empty rows at the bottom. Changed it by adding the height of the cell to the y-pos. Might be better to transform/position the parent group?
- Added exception pattern for some mismatched emoji's 🙁
- Columnwidth was calculated by hand but actually defined by d3. So i've removed it.