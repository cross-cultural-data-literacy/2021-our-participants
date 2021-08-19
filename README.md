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
- The personal card should have more data like the participant's city and who they live with. Add some more columns to the data source and use them in the card
- projectCard still needs to be styled and shown dynamically
- Treemap should group similar nodes! That way they can also visually be grouped. Calculate the concave hull using [this](https://github.com/mapbox/concaveman). Pass in all coordinates of squares and get back a polygon for a polyline.
- Alternatively, switch to a list with list items and remove d3 treemap logic, as per [this example](https://observablehq.com/d/f9298c71ebe65027)
- Emoji text-size should be refined, current method doesn't stay within bounds for different resolutions
- Add something like alt-text so you can see the value of each cell on hover?
- Switch to personal card using [this](https://www.w3schools.com/howto/howto_css_flip_card.asp)
- Some original images are way bigger than anything we will show on screen, even on a mousover popout full size. Ideally they should be resized so the user doesn't have to download 7mb images.
- It looks like the 'sharp' image resizer sometimes takes cutouts of the images instead of actually resizing them. Do we decide this is a feature or a bug? (reproduce: look at neighbourhood47 original and resized)
- Nice to have: larger popout versions of images on mouseover (with max width and height)
- If we want to flip to the personal card by clicking on a cell. We'll have to match the value of the cell back to an original value in the csv to find the participant. Right now that's not possible as some of these values are emoji's. Prob the datamodel for the treemap will need to be a bit more complex to allow us to store the index of the row as an identifier. 
- Repo can become public when the google sheet refs are removed and the sheet is offline
- "I live together with" sentence generation doesn't always work. Might be better to replace with "living situation:" followed by the answer itself.

## Change notes
Laurens:
- The text of each node was actually positioned in the cell above, resulting in empty rows at the bottom. Changed it by adding the height of the cell to the y-pos. Might be better to transform/position the parent group?
- Added exception pattern for some mismatched emoji's 🙁
- Columnwidth was calculated by hand but actually defined by d3. So i've removed it.
- The google drive urls are not the right urls for embedding... using [this solution](https://dev.to/temmietope/embedding-a-google-drive-image-in-html-3mm9) to rewrite urls
- The images worked for a brief moment and then google said no(403). Possible solution [here](https://stackoverflow.com/questions/60129114/how-to-fix-403-error-while-displaying-images-from-google-drive).
- We could move the loading of data to the template logic using the async await block. Latest version of Svelte also supports a <then> block. Tried this but the component seems to render before the data is loaded so I reverted to the previous solution.
- Preload images using [this](https://sharp.pixelplumbing.com/) and stores icons and full sizes. Store those in the GH repo. Was a hassle but it works quite well now. 
- Fixed the two photo questions so all content is now complete as far as the treemap goes
- I added a component for the participant's personal card