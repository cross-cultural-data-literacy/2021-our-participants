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
- Treemap should group similar nodes! That way they can also visually be grouped. Calculate the concave hull using [this](https://github.com/mapbox/concaveman). Pass in all coordinates of squares and get back a polygon for a polyline.
- Alternatively, switch to a list with list items and remove d3 treemap logic, as per [this example](https://observablehq.com/d/f9298c71ebe65027)
- Emoji text-size should be refined, current method doesn't stay within bounds for different resolutions
- Add something like alt-text so you can see the value of each cell on hover?
- Fix the two photo questions urls so they can be included
- ``_drawing_neighbourhood`` has a trailing " " in the name. Should be removed and code adjusted
- We could move the loading of data to the template logic using the async await block. Latest version of Svelte also supports a <then> block
- Put static urls in a config file
- Preload images using [this](https://sharp.pixelplumbing.com/) and stores icons and full sizes. Store those in the GH repo.
- Store gsheets csv as local json file
- Switch to personal card using [this](https://www.w3schools.com/howto/howto_css_flip_card.asp)

## Change notes
Laurens:
- The text of each node was actually positioned in the cell above, resulting in empty rows at the bottom. Changed it by adding the height of the cell to the y-pos. Might be better to transform/position the parent group?
- Added exception pattern for some mismatched emoji's 🙁
- Columnwidth was calculated by hand but actually defined by d3. So i've removed it.
- The google drive urls are not the right urls for embedding... using [this solution](https://dev.to/temmietope/embedding-a-google-drive-image-in-html-3mm9) to rewrite urls
- The images worked for a brief moment and then google said no(403). Possible solution [here](https://stackoverflow.com/questions/60129114/how-to-fix-403-error-while-displaying-images-from-google-drive).