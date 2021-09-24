<script>
  import { createEventDispatcher } from 'svelte'
  export let currentQuestion

  export let orderQuestions
  export let hideMissingCells

  const dispatch = createEventDispatcher()

  function setPreviousQuestion () {
    dispatch('setPreviousQuestion')
  }

  function setNextQuestion () {
    dispatch('setNextQuestion')
  }

</script>

<div>
  <span>{currentQuestion.title}</span>
  <button on:click={setPreviousQuestion}>←</button>
  <button on:click={setNextQuestion}>→</button>

  <label>
	  <input type=checkbox bind:checked={orderQuestions} />
	  Order questions
  </label>

  <label>
	  <input type=checkbox bind:checked={hideMissingCells} />
	  Hide missing answers
  </label>
</div>

<style>
</style>