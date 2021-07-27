<script>
	//SVELTE
	import { onMount } from 'svelte'

	//LIBS
	import {csv} from 'd3-fetch'
	
	//COMPONENTS
	import Treemap from './Treemap.svelte'

	let inputData = []
	//Load the word data and set variables
	onMount(async () => {
		inputData = await csv('https://docs.google.com/spreadsheets/d/e/2PACX-1vTpHsrDU_GQb1bscKLWeyuWt_5N5UglcmtuyfjizGE3h27UKIJ9f-UvOFv7mOsoM3POpYq_vSrAXwK_/pub?gid=1518708891&single=true&output=csv')
		  console.log("data loaded")
	})
</script>

<main>
	<h1>Our participants</h1>

	{#if inputData.length > 0}
		<Treemap data={inputData}/>
	{/if}
</main>

<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

	h1 {
		color: rgb(204, 108.22, 51);
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>