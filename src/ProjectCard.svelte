<script>
  import {settings as s} from './config.js'

  //TODO the participant is not reactive yet. Changing the participant in the treemap doesn't update the data here
  export let participant
  const imageExtension = '.png'
  console.log(participant)
  console.log(s)

  function participantHas(part, prop){
    console.log(part, part[prop])
    return part[prop] !== ''
  }
</script>

<article>
  <h1>Participant #{participant._id}</h1>
  <a href={participant._project_link} target="blank">Link to final work</a>
  {#if participantHas(participant, '_drawing_neighbourhood')}
    <img src="{s.imageFolder + '/resized/_drawing_neighbourhood' + participant._id + imageExtension}" alt="Drawing of the neighbourhood"/>
  {/if}
  {#if participantHas(participant, '_drawing_room')}
    <img src="{s.imageFolder + '/resized/_drawing_room' + participant._id + imageExtension}" alt="Drawing of the participant's room"/>
  {/if}
  {#if participantHas(participant, '_photo_breakfast')}
    <img src="{s.imageFolder + '/resized/_photo_breakfast' + participant._id + imageExtension}" alt="Photo of the participant's breakfast"/>
  {/if}
  {#if participantHas(participant, '_photo_window')}
    <img src="{s.imageFolder + '/resized/_photo_window' + participant._id + imageExtension}" alt="Photo out of the participant's window"/>
  {/if}
  <p>My main mode of transportation is: {participant._transportation} {participant._transportation_emoji}</p>
  <p>My favorite food is: {participant._favorite_food}</p>
  {#if participant._housemates.toLowerCase().includes('alone')}
    <p>I live by myself</p>
  {:else}
    <p>I live together with my {participant._housemates.toLowerCase().replace('my', '')} {participant._housemates_emoji}</p>
  {/if}
</article>

<style>
  article {
    margin: 0 auto;
    background-color: rgb(204, 178.29, 102);
    width: 70%;
  }
  img {
  }
</style> 