<script>
  import { createEventDispatcher } from 'svelte'
  export let options
  export let selected = ''

  const dispatch = createEventDispatcher()

  function makeSelection(){
    dispatch('selection', {
      text: selected
    })
  }
</script>

<div>
  <!-- svelte-ignore a11y-no-onchange -->
  <select bind:value={selected} on:change={makeSelection}>
    {#each options as option}
      <option value={option.name}>{option.title}
    {/each}
  </select>
</div>

<style>
  select {
    padding: 0;
    border: none;
    font-size: larger;
    border-bottom: 1px solid rgb(204, 108.22, 51);
    text-align-last: center;
  }
</style>