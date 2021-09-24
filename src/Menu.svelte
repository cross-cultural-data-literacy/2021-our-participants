<script>
  import { createEventDispatcher } from 'svelte'
  export let currentQuestion

  export let orderAnswers
  export let hideMissingAnswers

  export let hasMissingAnwers

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

  <div>
	  <input id="order-answers"
      type=checkbox disabled={currentQuestion.type === 'image'}
      bind:checked={orderAnswers} />
    <label for="order-answers">Group answers</label>
  </div>

  <div>
	  <input id="hide-missing-cells"
     type=checkbox disabled={!hasMissingAnwers}
      bind:checked={hideMissingAnswers} />
    <label for="hide-missing-cells">Hide missing answers</label>
  </div>
</div>

<style>
</style>