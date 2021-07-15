<script>
	export let participants;
</script>

<main>
	<h1>Our participants</h1>
	<ul>
		{#each participants as participant}
			<li>{participant}</li>
		{/each}
	<ul>
</main>

<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

	h1 {
		color: #ff3e00;
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