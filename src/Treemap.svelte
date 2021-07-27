<script>
  import { onMount } from 'svelte'
  import * as d3 from "d3"
  export let data

  console.log("loadedd", data)
  import * as nameMap from 'emoji-name-map'

  const columns = 8
  const width = 800
  const columnWidth = width / columns
  const height = 600

  let d3Treemap
  let cells

  const formattedData = formatData(data)
  drawViz(formattedData)

  function formatData(raw){
    const values = raw  
    .map((row) => row._cat_country)
    .filter((value) => value)
    .sort()
    .map((country) => {
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
    // width = treemap.x1
    // height = treemap.y1
    d3Treemap = treemap
    cells = treemap.children
    console.log(cells)
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
    <text x={cell.x0} y={cell.y0}
          style="--text-size: {columnWidth}px">{cell.data.name}
    </text>
  </g>
  {/each}
</svg>

<style>
  svg {
    fill: none;
  }
  text {
    fill: rgb(0, 0, 139);
    font-size: var(--text-size); 

  }
</style>

