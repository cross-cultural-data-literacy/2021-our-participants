<script>
  import { createEventDispatcher } from 'svelte'
  import { settings } from './config.js'

  import Menu from './Menu.svelte'

  const dispatch = createEventDispatcher()

  export let answers
  export let currentQuestion
  export let currentParticipantId

  export let orderAnswers
  export let hideMissingAnswers

  $: filteredAnswers = answers.filter((answer) => answer.value)

  function handleKeydown (event) {
    if (event.key === 'ArrowLeft') {
      dispatch('setPreviousQuestion')
    } else if (event.key === 'ArrowRight') {
      dispatch('setNextQuestion')
    }
  }
</script>

<svelte:window on:keydown={handleKeydown}/>

<div class="container">
  <header>
    <h1>Our 2021 participants</h1>
    <h2>{currentQuestion.title}</h2>
    <Menu on:setPreviousQuestion on:setNextQuestion
      hasMissingAnwers={filteredAnswers.length !== answers.length}
      bind:orderAnswers={orderAnswers}
  		bind:hideMissingAnswers={hideMissingAnswers}
      currentQuestion={currentQuestion} />
  </header>
  {#if answers}
    <div class="grid"
      class:images="{currentQuestion.type === 'image'}">
      {#each (hideMissingAnswers ? filteredAnswers : answers) as answer, index}
        <div class="answer" on:click={() => currentParticipantId = answer.id}>
          {#if answer.value}
            {#if currentQuestion.type === 'emoji'}
              <span class="emoji">{answer.formatted}</span>
            {:else}
              <img alt="{`participant ${answer.id}'s ${'ddd'}`}"
                src="{`${settings.imageFolder}/small/${answer.formatted}${settings.imageExtension}`}" />
            {/if}
          {:else}
            <span class="emoji">🤷‍♀️</span>
          {/if}
          <div class="id">#{answer.id}</div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
.container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

header {
  display: grid;
  grid-template-columns: repeat(2, minmax(120px, 1fr));
  width: 100%;
  grid-gap: 10px;
  padding: 10px;
}

h1, h2 {
  margin: 0;
}

@media (max-width: 576px) {
  h1 {
    font-size: 125%;
  }

  h2 {
    font-size: 100%;
  }
}

h2 {
  font-weight: normal;
  align-self: end;
}

@media (max-width: 1150px) {
  .grid {
    grid-template-columns: repeat(auto-fit, minmax(50px, 1fr));
  }

  .grid.images {
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  }

  .grid .emoji {
    font-size: 50px;
  }
}

.grid {
  width: 100%;
  display: grid;
  /* grid-template-columns: repeat(12, 1fr); */
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  padding: 10px;
  grid-gap: 10px;
}

.grid.images {
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
}

.grid .answer {
  position: relative;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.grid .answer .id {
  position: absolute;
  bottom: calc(-0.5rem + 2px);
  right: calc(-0.5rem + 2px);
  padding: 2px;
  font-size: 50%;
  background-color: rgba(255, 255, 255, 0.55);
  border-radius: 2px;
}

.grid .answer img {
  width: 100%;
  object-fit: cover;
}

.grid .emoji {
  font-size: 80px;
}
</style>