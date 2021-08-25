# 2021-our-participants
A datavisualization project showing the diversity of our participants and their work

## Todo

### Bert
- Finish treemap->grid conversion
- Set up a new menu (swipe through questions or implement menu in 1 dedicated cell)
- Make everything responsive (to screen size)
- (add alt texts for images)
- In Firefox the emoji values in the treemap don't show...hopefully this is auto fixed when you switch tot he gridview

### Laurens
- projectCard still needs to be styled
- flipping back to the cells means the question get's reset. Because a rerender is triggered. Ideally the app should keep track of the current question and if set, pass it to the grid component
- Some original images are way bigger than anything we will show on screen, even on a mousover popout full size. Ideally they should be resized so the user doesn't have to download 7mb images.  Suggestion go for 1600 as largest instead of original.
- It looks like the 'sharp' image resizer sometimes takes cutouts of the images instead of actually resizing them. Do we decide this is a feature or a bug? (reproduce: look at neighbourhood47 original and resized).
- Nice to have: larger popout versions of images on mouseover (with max width and height)
- Repo can become public when the google sheet refs are removed and the sheet is offline
- "I live together with" sentence generation doesn't always work. Might be better to replace with "living situation:" followed by the answer itself.
- Host project somewhere. 
- Check if it can be implemented in the main wordpress website
- Small bug: In the pet column, there can be multiple values causing the emojiGet to return undefined. Should be wrapped in a function that checks if undefined is returned. possible also delete the multiple values for simplicity

## Resources
I've used [this example](https://svelte.dev/repl/9c5a422b0dfd4c43a7cd7fd807cdbb1c?version=3.24.0) to get the flip animation to work.
