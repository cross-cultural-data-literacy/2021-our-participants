<script>
  import { createEventDispatcher } from 'svelte'
  import {settings as s} from './config.js'
  import {get as emojiGet} from 'emoji-name-map'

  //TODO the participant is not reactive yet. Changing the participant in the treemap doesn't update the data here
  export let participant
  const dispatch = createEventDispatcher();

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

<article class="cardContainer" on:click={handleClick}>
  <div class="titleAndProject">
  <h1>Participant #{participant._id}</h1>
  {#if participantHas(participant, '_project_link')}
    <a href={participant._project_link} target="blank">A link to my project</a>
  {/if}
  </div>

    {#if participantHas(participant, '_drawing_neighbourhood')}
      <figure>
        <img src="{s.imageFolder + '/small/_drawing_neighbourhood' + participant._id + s.imageExtension}" alt="Drawing of the neighbourhood"/>
        <figcaption>My neighbourhood.</figcaption>
      </figure>  
    {/if}
    {#if participantHas(participant, '_drawing_room')}
      <figure>
        <img src="{s.imageFolder + '/small/_drawing_room' + participant._id + s.imageExtension}" alt="Drawing of the participant's room"/>
        <figcaption>My room.</figcaption>
      </figure> 
    {/if}
    {#if participantHas(participant, '_photo_breakfast')}
      <figure>
        <img src="{s.imageFolder + '/small/_photo_breakfast' + participant._id + s.imageExtension}" alt="Photo of the participant's breakfast"/>
        <figcaption>My breakfast.</figcaption>
      </figure>
    {/if}
    {#if participantHas(participant, '_photo_window')}
      <figure>
        <img src="{s.imageFolder + '/small/_photo_window' + participant._id + s.imageExtension}" alt="Photo out of the participant's window"/>
        <figcaption>My view</figcaption>
      </figure>
    {/if}

  
  <div class="info">
    <p>I live in <span class=answer>{participant._city}</span></p>
    <p>My main mode of transportation is <span class=answer>{participant._transportation}</span> {participant._transportation_emoji}</p>
    <p>My favorite food is <span class=answer>{participant._favorite_food}</span></p>
    {#if participant._housemates.toLowerCase().includes('alone')}
      <p><span class=answer>I live by myself</span></p>
    {:else}
      <p>I live together with my <span class=answer>{participant._housemates.toLowerCase().replace('my', '')}</span> {participant._housemates_emoji}</p>
    {/if}
    {#if participantHas(participant, '_pet')}
      <p>I have a <span class=answer>{participant._pet}!</span> {emojiGet(participant._pet)}</p>
    {/if}
  </div>
</article>

<style>
  article {
    margin: 0 auto;
    background-color: #f5efdf;
    width: 70%;
  }
  figure {
    max-width: 30%;
  }
  img {
    /*max-width: 30%;*/
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 5px;
  }
  .answer {
    font-size: large;
    font-style: italic;
    text-decoration: rgb(113.36, 198.98, 107.02) underline;
  }

  .cardContainer {
    height: 100%;
    margin: 0;
    display: grid; 
    grid-template-columns: 1fr 1fr 1fr 1fr; 
    grid-template-rows: 1fr 1fr 1fr; 
    gap: 0px 0px; 
    grid-template-areas: 
      "titleAndProject titleAndProject titleAndProject titleAndProject"
      ". . . ."
      "info info info info"; 
  }
  .titleAndProject { grid-area: titleAndProject; }
  .info { grid-area: info; }


/*  html, body , .container {
    height: 100%;
    margin: 0;
  }*/
</style> 