<script>
	import { onMount } from 'svelte'

	import { csv } from 'd3-fetch'

	import Grid from './Grid.svelte'

	let inputData = []

	// Load the word data and set variables
	onMount(async () => {
		inputData = await csv('https://docs.google.com/spreadsheets/d/e/2PACX-1vTpHsrDU_GQb1bscKLWeyuWt_5N5UglcmtuyfjizGE3h27UKIJ9f-UvOFv7mOsoM3POpYq_vSrAXwK_/pub?gid=1518708891&single=true&output=csv')
	})
</script>

<main>
	<h1>Our participants</h1>

	{#if inputData.length > 0}
		<Grid data={inputData} />
	{/if}
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

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>