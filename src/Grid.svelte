<script>
  import * as nameMap from 'emoji-name-map'

  import Dropdown from './Dropdown.svelte'

  export let data
  // export let width
  // export let height

  let cells
  let columnCount
  let rowCount

  let paddingHorizontal
  let paddingVertical

  const imageFolder = 'assets/images/resized/'
  const imageExtension = '.png'

  const treemapData = [
    {
      name: "country",
      title: "In which country do you live?",
      data: formatData(data, "_cat_country"),
      type: "emoji"
    },
    {
      name: "transportation",
      title: "What is your main means of transportation?",
      data: formatData(data, "_transportation_emoji"),
      type: "emoji"
    },
    {
      name: "room drawing",
      title: "What does your room look like?",
      data: formatData(data, "_drawing_room"),
      type: "image"
    },
    {
      name: "neighbourhood drawing",
      title: "What does your neighbourhood look like?",
      data: formatData(data, "_drawing_neighbourhood"),
      type: "image"
    },
    {
      name: "window picture",
      title: "What do you see when you look out the window?",
      data: formatData(data, "_photo_window")
    },
    {
      name: "breakfast picture",
      title: "What does your breakfast look like?",
      data: formatData(data, "_photo_breakfast")
    },
  ]

  let title = "Select a question below"
  let currentQuestion = treemapData[0]
  updateGrid(currentQuestion)

  // Format data depending on chosen column
  function formatData (raw, column) {
    let values = raw
        .map((row) => row[column])

    if (column === "_cat_country") {
      values = values
        .filter((value) => value)
        .sort()
        .map((country) => {
          if(country === "united states") {
            return nameMap.get("us")

}
          if (!nameMap.get(country)) {
            console.log("Emoji not found for:", country)
          }

          return nameMap.get(country) ? nameMap.get(country) : ''
      })
    } else if (column === "_transportation_emoji") {
      values = values
        .filter((value) => value)
        .sort()
        .map((emoji) => [...emoji][0])
      // Note: Because emoji's consist of multiple chars a simple emoji[0] doesn't work here
    } else {
      // Use the index of the row to reference the right image
      // then filter out empty values
      values = values
        .map((value, i) => value === '' ? undefined : column + i)
        .filter((value) => value)
    }

    // console.log("formatted column data", values)
    return values
  }

  function changeColumn (event) {
    currentQuestion = treemapData.find((obj) => obj.name === event.detail.text)
    updateGrid(currentQuestion)
  }

  function updateGrid (question) {
    cells = question.data

    const gridRatio = window.innerWidth / window.innerHeight

    let columns = Math.sqrt(cells.length * gridRatio)
    let rows = columns / gridRatio

    columnCount = Math.ceil(columns)
    rowCount = Math.ceil(rows)

    const cellSize = Math.min(window.innerWidth / columnCount, window.innerHeight / rowCount)

    paddingHorizontal = (window.innerWidth - (cellSize * columnCount)) / 2
    paddingVertical = (window.innerHeight - (cellSize * rowCount)) / 2
  }
</script>

<svelte:window on:resize={updateGrid(currentQuestion)}/>

<h2>{title}</h2>
<Dropdown
  options={treemapData}
  on:selection={changeColumn}
/>
{#if cells}
  <div class="container" style="padding: {paddingVertical}px {paddingHorizontal}px;">
    <div class="grid" style="grid-template-columns: repeat({columnCount}, 1fr); grid-template-rows: repeat({rowCount}, 1fr);
    ">
      {#each cells as cell, index}
        {#if currentQuestion.type == "emoji"}
          <span>{cell}</span>
        {:else}
          <img src="{imageFolder + cell + imageExtension}" />
        {/if}
      {/each}
    </div>
  </div>
{/if}

<style>
.container {
  box-sizing: border-box;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.grid {
  box-sizing: border-box;
  width: 100%;
  height: 100%;

  display: grid;
  padding: 10px;
  grid-gap: 10px;
}

/* TODO: make emojis bigger! */
/* TODO: make sure images fit! */
/* TODO: center cell content */
.grid > * {
  place-self: center;
}

.grid img {
  object-fit: contain;
}
</style>