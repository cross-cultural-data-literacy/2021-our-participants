<script>
	import { onMount } from 'svelte'

	import { csv } from 'd3-fetch'
	import * as nameMap from 'emoji-name-map'

	import Grid from './Grid.svelte'
	import ProjectCard from './ProjectCard.svelte'

	import { questions } from './questions.js'

	let participants = []
	let currentParticipantId
	$: currentParticipant = currentParticipantId ? participants[currentParticipantId] : undefined

	let orderQuestions = true
  let hideMissingCells = true

  let currentQuestionIndex = 0
  $: currentQuestion = questions[currentQuestionIndex]
  $: answers = extractAnswers(participants, currentQuestion.column, {
		orderQuestions,
		hideMissingCells
	})

  function setPreviousQuestion () {
    currentQuestionIndex = (currentQuestionIndex - 1 + questions.length) % questions.length
  }

  function setNextQuestion () {
    currentQuestionIndex = (currentQuestionIndex + 1) % questions.length
  }

	function formatValue (row, column) {
		const value = row[column]

 		if (column === '_cat_country') {
      if (value === 'united states') {
      	return 'us'
      }
      return nameMap.get(value) ? nameMap.get(value) : ''
    } else if (column === '_transportation_emoji') {
      // Note: because emoji's consist of multiple chars a simple emoji[0] doesn't work here
      return [...value][0]
    } else {
			return column + row._id
    }

		return value
	}

  function extractAnswers (participants, column, options) {
    let answers = [...participants]
      .map((row) => ({
        id: console.log(row._id) || row._id,
				value: row[column],
        formatted: formatValue(row, column)
      }))

		if (options.hideMissingCells) {
			answers = answers.filter((row) => row.value)
		}

		if (options.orderQuestions) {
			answers = answers.sort((rowA, rowB) => rowA.value.localeCompare(rowB.value))
		}

    return answers
  }

	// This functions flips a node by tweening its rotateY and opacity
	function flip (node, {
		delay = 0,
		duration = 250
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

	// Load the word data and set variables
	onMount (async () => {
		participants = await csv('assets/data/survey.csv')
	})
</script>

<div class="container">
	{#if !currentParticipantId}
		<div class="side" transition:flip>
			{#if participants.length > 0}
				<Grid
					answers={answers}
					currentQuestion={currentQuestion}

					on:setPreviousQuestion={setPreviousQuestion}
      		on:setNextQuestion={setNextQuestion}
					bind:currentParticipantId={currentParticipantId}

					bind:orderQuestions={orderQuestions}
  				bind:hideMissingCells={hideMissingCells}
				/>
			{/if}
		</div>
	{:else if currentParticipantId}
		<div class="side" transition:flip>
			{#if currentParticipantId}
				<ProjectCard
					participant={currentParticipant}
					on:flip={() => currentParticipantId = undefined}
				/>
			{/if}
		</div>
	{/if}
</div>


<style>
.container {
	position: relative;
	top: 0;
	width: 100%;
	height: 100%;
}

.side {
	top: 0;
	width: 100%;
	height: 100%;
	position: absolute;
}
</style>