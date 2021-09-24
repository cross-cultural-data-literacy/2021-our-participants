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

<div class="checkboxes">
  <div class="checkbox">
	  <input id="order-answers"
      type=checkbox disabled={currentQuestion.type === 'image'}
      bind:checked={orderAnswers} />
    <label for="order-answers">Group answers</label>
  </div>

  <div class="checkbox">
	  <input id="hide-missing-cells"
      type=checkbox disabled={!hasMissingAnwers}
      bind:checked={hideMissingAnswers} />
    <label for="hide-missing-cells">Hide missing</label>
  </div>
</div>

<div class="buttons">
  <button on:click={setPreviousQuestion}><span>Previous</span> ←</button>
  <button on:click={setNextQuestion}><span>Next</span> →</button>
</div>

<style>
button, .checkbox {
  padding-bottom: 0.25rem;
  text-underline-offset: 0.1em;
  font-weight: 200;
}

button {
  display: block;
}

button span, label {
  text-decoration: underline;
}
</style>