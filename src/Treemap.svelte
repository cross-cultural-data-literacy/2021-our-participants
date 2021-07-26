<script>
  import { onMount } from 'svelte'
  import * as d3 from "d3"
  export let data

  console.log("loaded", data)
  // import {get} from 'emoji-name-map'

  const columns = 8
  const width = 400
  const columWidth = width / columns
  const height = width


  const formattedData = formatData(data)
  drawViz(formattedData)

  function formatData(raw){
    const values = raw  
    .map((row) => row._cat_country)
    .filter((value) => value)
    .sort()
    // .map((country) => get(`:${country}:`))
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
    
    draw(treemap)
    function draw (treemap) {
      const drawNode = (node) => htl.svg`
        <rect class="node" x="${node.x0}" y="${node.y0}" width="${node.x1 - node.x0}" height="${node.y1 - node.y0}" />
        ${node.data.name ? htl.svg`<text x="${node.x0}" y="${node.y0}">${node.data.name}</text>` : '' }
        <g>
          ${node.children ? node.children.map(drawNode) : '' }
        </g>`

        return htl.svg`<svg width="${treemap.x1}" height="${treemap.y1}" viewbox="0 0 ${treemap.x1} ${treemap.y1}">
          ${drawNode(treemap)}
        </svg>`
    }
  }
</script>

<div></div>

<style>
  
</style>

