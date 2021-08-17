<script>
  import {treemap, hierarchy, treemapResquarify} from "d3-hierarchy"
  import * as nameMap from 'emoji-name-map'

  import Dropdown from './ui_components/Dropdown.svelte'
  import ProjectCard from './ProjectCard.svelte'

  export let data
  export let width
  export let height
  //template data
  const imageFolder = 'assets/images/resized/'
  const imageExtension = '.png'
  let d3Treemap
  let cells
  let currentParticipant = data[1]

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
  
  //Trigger the drawing of an initial treemap
  drawViz(currentQuestion)

  //Format data depending on chosen column
  function formatData(raw, column){
    let values = raw  
        .map((row) => row[column])
    
    if (column === "_cat_country"){
      values = values
        .filter((value) => value)
        .sort()
        .map((country) => {
          if(country == "united states") return nameMap.get("us")
          if (nameMap.get(country) == undefined) {
            console.log("Emoji not found for:", country)
          }
          return nameMap.get(country) ? nameMap.get(country) : ''
      })
    }
    else if (column === "_transportation_emoji"){
      values = values
        .filter((value) => value)
        .sort()
        .map(emoji => [...emoji][0])
      //note: Because emoji's consist of multiple chars a simple emoji[0] doesn't work here
    }
    else{
      //Use the index of the row to reference the right image
      // then filter out empty values
      values = values
        .map((value, i) => value == ''? null : column+i)
        .filter(value => value !== null)
    }
    console.log("formatted column data", values)
    return values
  }
  
  //Have d3 calculate the treemap setup and trigger a svelte rerender
  function drawViz(input){
    console.log("Rendering treemap for column:", input.name)
    const newHierarchy = {
      name: 'values',
      children: input.data.map((value) => ({
        name: value,
        value: 10,
        children: []
      }))
    }
    const newTreemap = treemap()
        .tile(treemapResquarify.ratio(1))
        .size([width, height])
        .padding(1)
        .round(true)
      (hierarchy(newHierarchy)
          .sum((d) => d.value)
          .sort((a, b) => b.value - a.value))
    //Setting these variables triggers svelte to rerender the relevant elements
    d3Treemap = newTreemap
    cells = newTreemap.children
  }

  function changeColumn(e){
    currentQuestion = treemapData.find(obj => obj.name == e.detail.text)
    drawViz(currentQuestion)
  }
</script>
<h2>{title}</h2>
<Dropdown
  options={treemapData}
  on:selection={changeColumn}
/>
<svg width={width} height={height} viewbox="0 0 {width} {height}">
  <g>
    <rect class="node" x={d3Treemap.x0} y={d3Treemap.y0} width={d3Treemap.x1 - d3Treemap.x0} height={d3Treemap.y1 - d3Treemap.y0}/>
    <text x={d3Treemap.x0} y={d3Treemap.y0}>{d3Treemap.data.name}</text>
  </g>
  {#each cells as cell}
  <g>
    <rect class="node" x={cell.x0} y={cell.y0} 
          width={cell.x1 - cell.x0} height={cell.y1 - cell.y0}
    />
    {#if currentQuestion.type == "emoji"}
    <text x={cell.x0} y={cell.y0 + (cell.y1 - cell.y0)}
          style="font-size: {Math.min(cell.x1 - cell.x0, cell.y1 - cell.y0)}px;">
          {cell.data.name}
    </text>
    {:else}
    <image class=""
         xlink:href={imageFolder + cell.data.name + imageExtension}
         x={cell.x0} y={cell.y0}
         width={cell.x1 - cell.x0} height={cell.y1 - cell.y0}
         alt="Room Drawing"/>
    {/if}
  </g>
  {/each}
</svg>
<ProjectCard participant={currentParticipant}/>

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