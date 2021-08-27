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

<article on:click={handleClick}>
  <h1>Participant #{participant._id}</h1>
  <a href={participant._project_link} target="blank">Link to final work</a>
  {#if participantHas(participant, '_drawing_neighbourhood')}
    <img src="{s.imageFolder + '/small/_drawing_neighbourhood' + participant._id + s.imageExtension}" alt="Drawing of the neighbourhood"/>
  {/if}
  {#if participantHas(participant, '_drawing_room')}
    <img src="{s.imageFolder + '/small/_drawing_room' + participant._id + s.imageExtension}" alt="Drawing of the participant's room"/>
  {/if}
  {#if participantHas(participant, '_photo_breakfast')}
    <img src="{s.imageFolder + '/small/_photo_breakfast' + participant._id + s.imageExtension}" alt="Photo of the participant's breakfast"/>
  {/if}
  {#if participantHas(participant, '_photo_window')}
    <img src="{s.imageFolder + '/small/_photo_window' + participant._id + s.imageExtension}" alt="Photo out of the participant's window"/>
  {/if}
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
</article>

<style>
  article {
    margin: 0 auto;
    background-color: #f5efdf;
    width: 70%;
  }
  img {
    max-width: 30%;
  }
  .answer {
    font-size: large;
    font-style: italic;
    text-decoration: rgb(113.36, 198.98, 107.02) underline;
  }
</style> 