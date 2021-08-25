<script>
	//SVELTE
	import { onMount } from 'svelte'

	//LIBS
	import {csv} from 'd3-fetch'
	
	//COMPONENTS
	import Treemap from './Treemap.svelte'
	import ProjectCard from './ProjectCard.svelte'

	const vizWidth = screen.width * .6
	const vizHeight = screen.height * .7

	let inputData = []
	let flipped = false
	let currentParticipant = false
	
	//This functions flips a node by tweening its yRot and opacity
	function flip(node, {
		delay = 0,
		duration = 1000
	}) {
		return {
			delay,
			duration,
			css: (t, u) => `
				transform: rotateY(${1 - (u * 180)}deg);
				opacity: ${.8 - u};
			`
		}
	}

	//Load the word data and set variables
	onMount(async () => {
		inputData = await csv('assets/data/survey.csv')
	})
</script>

<main>
	<h1>Our participants</h1>
	<div class="card-container">
		{#if !flipped}
			<div class="side" style="width:{vizWidth}px; height:{vizHeight}px;" transition:flip>
				{#if inputData.length > 0}
					<Treemap  
						data={inputData} 
						width={vizWidth} 
						height={vizHeight}
						bind:currentParticipant={currentParticipant}
						on:flip={() => flipped = !flipped}
					/>
				{/if}
			</div>
		{:else if flipped}
			<div class="side" style="width:{vizWidth}px; height:{vizHeight}px;" transition:flip>
				{#if currentParticipant}
				  <ProjectCard 
					  participant={currentParticipant}
					  on:flip={() => flipped = !flipped}
				  />
				{/if}
			</div>
		{/if}
	</div>
</main>

<style>
	main {
		text-align: center;
		margin: 0 auto;
	}

	h1 {
		color: rgb(204, 108.22, 51);
		text-transform: uppercase;
		font-size: 2em;
		font-weight: 200;
	}
	
	.side {
		position: absolute;
		overflow: hidden;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>