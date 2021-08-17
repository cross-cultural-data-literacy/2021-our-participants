<script>
  import {settings as s} from './config.js'

  export let participant
  const imageExtension = '.png'
  console.log(participant)
  console.log(s)

  function participantHas(prop){
    return participant[prop] !== ''
  }
</script>

<h1>Participant #{participant._id}</h1>
<a href={participant._project_link} target="blank">Link to final work</a>
{#if participantHas('_drawing_neighbourhood')}
  <img src="{s.imageFolder + '/resized/_drawing_neighbourhood' + participant._id + imageExtension}" alt="Drawing of the neighbourhood"/>
{/if}
{#if participantHas('_drawing_room')}
  <img src="{s.imageFolder + '/resized/_drawing_room' + participant._id + imageExtension}" alt="Drawing of the participant's room"/>
{/if}
{#if participantHas('_photo_breakfast')}
  <img src="{s.imageFolder + '/resized/_photo_breakfast' + participant._id + imageExtension}" alt="Photo of the participant's breakfast"/>
{/if}
{#if participantHas('_photo_window')}
  <img src="{s.imageFolder + '/resized/_photo_window' + participant._id + imageExtension}" alt="Photo out of the participant's window"/>
{/if}
<p>My main mode of transportation is: {participant._transportation}</p>

<style>
  svg {
    fill: none;
    stroke: rgba(127.5, 127.5, 127.5, 0.83);
    stroke-width:  .05em;
  }
  text {
    fill: rgb(0, 0, 139);
  }
</style> 