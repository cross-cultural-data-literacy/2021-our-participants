# 2021-our-participants
A datavisualization project showing the diversity of our participants and their work

This repository is a work in progress, hence the todo notes. You can run the project locally using `npm run dev`


## Updating the website
Make changes in main, pull to website branch and push from there to update the website.
**When updating the website branch, make sure the docs folder isn't gitignored.**

## Todo

### Laurens
- maybe make photos bigger (full width?). The photos might be the most interesting aspect of this project, it's worth it to show them at full screen size.
- projectCard still needs to be styled
- flipping back to the cells means the question get's reset. Because a rerender is triggered. Ideally the app should keep track of the current question and if set, pass it to the grid component
- Nice to have: larger popout versions of images on mouseover (with max width and height)
- Host project somewhere.
	+ I've hosted it on Github Pages using the website branch. Pushing to that branch will update the website.
	+ Remaining issue is that the CCDL website is not HTTPS so it wont be able to iframe github pages for now. They should prob get HTTPS sorted...
- Check if it can be implemented in the main wordpress website
	+ Probably possible as an iframe
- Check if it can be implemented in the main wordpress website
- Small bug: In the pet column, there can be multiple values causing the emojiGet to return undefined. Should be wrapped in a function that checks if undefined is returned. possible also delete the multiple values for simplicity

## Resources
I've used [this example](https://svelte.dev/repl/9c5a422b0dfd4c43a7cd7fd807cdbb1c?version=3.24.0) to get the flip animation to work.
