<script>
  import { onMount } from 'svelte'
  import * as d3 from "d3"
  import * as nameMap from 'emoji-name-map'

  export let data
  export let width
  export let height

  let d3Treemap
  let cells
  let column = "_cat_country"

  const formattedData = formatData(data)
  drawViz(formattedData)

  function formatData(raw){
    const values = raw  
    .map((row) => row[column])
    .filter((value) => value)
    .sort()
    .map((country) => {
      if (nameMap.get(country) == undefined) {
        console.log("Emoji not found for", country)
      }
      //TODO: write nicer exception pattern here
      if(country == "united states") return nameMap.get("us")
      return nameMap.get(country) ? nameMap.get(country) : ''
    })
    .map(country => country)
    return values
  }
  
  function drawViz(data){
    console.log("drawing viz")
    const hierarchy = {
      name: 'values',
      children: data.map((value) => ({
        name: value,
        value: 10,
        children: []
      }))
    }
    const treemap = d3.treemap()
        .tile(d3.treemapResquarify.ratio(1))
        .size([width, height])
        .padding(1)
        .round(true)
      (d3.hierarchy(hierarchy)
          .sum((d) => d.value)
          .sort((a, b) => b.value - a.value))
    //Setting these variables triggers svelte to rerender the relevant elements
    d3Treemap = treemap
    cells = treemap.children
    // console.log(cells)
  }

</script>

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
    <text x={cell.x0} y={cell.y0 + (cell.y1 - cell.y0)}
          style="--text-size: {d3.min([cell.x1 - cell.x0, cell.y1 - cell.y0])}px">
          {cell.data.name}
    </text>
  </g>
  {/each}
</svg>

<style>
  svg {
    fill: none;
    stroke: rgba(127.5, 127.5, 127.5, 0.83);
    stroke-width:  .05em;
  }
  text {
    fill: rgb(0, 0, 139);
    font-size: var(--text-size); 
  }
</style>

