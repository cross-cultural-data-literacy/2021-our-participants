<script>
  import { createEventDispatcher } from 'svelte'
  import {settings as s} from './config.js'
  import {get as emojiGet} from 'emoji-name-map'

  export let participant
  const dispatch = createEventDispatcher()

  function participantHas(part, prop){
    // console.log(part, part[prop])
    return part[prop] !== ''
  }
  function handleClick(){
    dispatch('flip', {
      id: participant._id
    })
  }
</script>

<article class="card-container" on:click={handleClick}>
  <section>
  <h1>Participant #{participant._id}</h1>
  {#if participantHas(participant, '_project_link')}
    <a href={participant._project_link} target="blank">A link to my project</a>
  {/if}
  </section>
  <section class="images">
    {#if participantHas(participant, '_drawing_neighbourhood')}
      <figure class="column">
        <img src="{s.imageFolder + '/small/_drawing_neighbourhood' + participant._id + s.imageExtension}" alt="Drawing of the neighbourhood"/>
        <figcaption>My neighbourhood.</figcaption>
      </figure>
    {/if}
    {#if participantHas(participant, '_drawing_room')}
      <figure class="column">
        <img src="{s.imageFolder + '/small/_drawing_room' + participant._id + s.imageExtension}" alt="Drawing of the participant's room"/>
        <figcaption>My room.</figcaption>
      </figure>
    {/if}
    {#if participantHas(participant, '_photo_breakfast')}
      <figure class="column">
        <img src="{s.imageFolder + '/small/_photo_breakfast' + participant._id + s.imageExtension}" alt="Photo of the participant's breakfast"/>
        <figcaption>My breakfast.</figcaption>
      </figure>
    {/if}
    {#if participantHas(participant, '_photo_window')}
      <figure class="column">
        <img src="{s.imageFolder + '/small/_photo_window' + participant._id + s.imageExtension}" alt="Photo out of the participant's window"/>
        <figcaption>My view</figcaption>
      </figure>
    {/if}
  </section>

  <section class="info">
    <p>I live in <span class=answer>{participant._city}.</span></p>
    <p>My main mode of transportation is <span class=answer>{participant._transportation}.</span> {participant._transportation_emoji}</p>
    <p>My favorite food is <span class=answer>{participant._favorite_food}.</span></p>
    {#if participant._housemates.toLowerCase().includes('alone')}
      <p><span class=answer>I live by myself.</span></p>
    {:else}
      <p>I live together with my <span class=answer>{participant._housemates.toLowerCase().replace('my', '')}</span> {participant._housemates_emoji}.</p>
    {/if}
    {#if participantHas(participant, '_pet')}
      <p>I have a <span class=answer>{participant._pet}!</span> {emojiGet(participant._pet)}.</p>
    {/if}
  </section>
</article>

<style>
  article {
    overflow-y: auto;
    background-color: #f5efdf;
    width: 100%;
    height: 100%;
    padding: 10px;
  }

  img {
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 5px;
  }

  .answer {
    font-size: large;
    font-style: italic;
    text-decoration: rgb(113.36, 198.98, 107.02) underline;
  }

  .images {
    display: flex;
    flex-direction: column;
  }

  .column {
    flex: 100%;
    max-width: 100%;
    margin: auto;
    padding: 1em;
  }

  .column img {
    vertical-align: middle;
    width: 100%;
  }
</style>