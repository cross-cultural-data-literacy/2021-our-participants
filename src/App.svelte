<script>
	import { onMount } from 'svelte'

	import { csv } from 'd3-fetch'
	import * as nameMap from 'emoji-name-map'

	import Grid from './Grid.svelte'
	import ProjectCard from './ProjectCard.svelte'

	import { questions } from './questions.js'

	let participants = []
	let currentParticipantId = null
	$: currentParticipant = currentParticipantId !== null ? participants[currentParticipantId] : undefined

	let orderAnswers = true
  let hideMissingAnswers = true

  let currentQuestionIndex = 0
  $: currentQuestion = questions[currentQuestionIndex]
  $: answers = extractAnswers(participants, currentQuestion.column, {
		orderAnswers,
		currentQuestionType: currentQuestion.type
	})

  function setPreviousQuestion () {
    currentQuestionIndex = (currentQuestionIndex - 1 + questions.length) % questions.length
  }

  function setNextQuestion () {
    currentQuestionIndex = (currentQuestionIndex + 1) % questions.length
  }

	function formatValue (row, column) {
		let value = row[column]

 		if (column === '_cat_country') {
      if (value === 'united states') {
      	value = 'us'
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
        id: parseInt(row._id),
				value: row[column],
        formatted: formatValue(row, column)
      }))

		if (options.orderAnswers && options.currentQuestionType !== 'image') {
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
	{#if currentParticipantId == null}
		<div class="side" transition:flip>
			{#if participants.length > 0}
				<Grid
					answers={answers}
					currentQuestion={currentQuestion}

					on:setPreviousQuestion={setPreviousQuestion}
      		on:setNextQuestion={setNextQuestion}
					bind:currentParticipantId={currentParticipantId}

					bind:orderAnswers={orderAnswers}
  				bind:hideMissingAnswers={hideMissingAnswers}
				/>
			{/if}
		</div>
	{:else}
		<div class="side" transition:flip>
			{#if currentParticipant}
				<ProjectCard
					participant={currentParticipant}
					on:flip={() => currentParticipantId = null}
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