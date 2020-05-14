import PalladioWebComponentAbstractBase from "./palladio-webcomponent-abstract.js";

window.customElements.define(
  "palladio-graph-component",
  class extends PalladioWebComponentAbstractBase {
    constructor() {
      super();
      this.stylesheets = [
        // TODO: this is a bit hacky -- could perhaps be done in the ABC, or maybe it's
        //       better just to bundle it anyway and then the problem goes away.
        new URL(import.meta.url).href.replace(/\.js$/, ".css"),
      ];
      this.scripts = ["https://d3js.org/d3.v5.min.js"];
    }

    drawGraph(graph, settings) {
      const {
        nodeSize, // whether to size the nodes or not
        highlightSource, // whether to "highlight" the source nodes
        highlightTarget, // whether to "highlight" the target nodes
      } = settings;

      const { height, width } = this.svg.getBoundingClientRect();

      const svg = d3.select(this.svg).call(
        d3
          .zoom()
          .scaleExtent([0.5, 40])
          .on("zoom", () => g.attr("transform", d3.event.transform)),
      );
      const g = svg.append("g");

      const sizeScale = d3.scaleSqrt().range([5, 20]);
      sizeScale.domain([
        d3.min(graph.nodes, (d) => d.count),
        d3.max(graph.nodes, (d) => d.count),
      ]);

      const simulation = d3
        .forceSimulation()
        .force(
          "link",
          d3
            .forceLink()
            .id((d) => d.id)
            .distance(50),
        )
        .force("charge", d3.forceManyBody().strength(-1000))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide().radius(60));

      const links = g
        .append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(graph.links)
        .enter()
        .append("line")
        .attr("stroke-width", 0.5);

      const nodes = g
        .append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(graph.nodes)
        .enter()
        .append("circle")
        .attr("r", (d) => (nodeSize ? sizeScale(d.count) : 5))
        .attr("class", (d) => d.class)
        .on("mouseover", function (d) {
          d3.select(labels.nodes()[d.index]).style("font-weight", "bold");
        })
        .on("mouseout", function (d) {
          d3.select(labels.nodes()[d.index]).style("font-weight", "normal");
        })
        .call(
          d3
            .drag()
            .on("start", (d) => {
              if (!d3.event.active) simulation.alphaTarget(0.3).restart();
              d.fx = d.x;
              d.fy = d.y;
            })
            .on("drag", (d) => {
              d.fx = d3.event.x;
              d.fy = d3.event.y;
            })
            .on("end", (d) => {
              if (!d3.event.active) simulation.alphaTarget(0);
              d.fx = d3.event.x;
              d.fy = d3.event.y;
            }),
        );

      const labels = g
        .append("g")
        .attr("class", "labels")
        .selectAll("text")
        .data(graph.nodes)
        .enter()
        .append("text")
        .text((d) => d.id);

      simulation.nodes(graph.nodes).on("tick", () => {
        links
          .attr("x1", (d) => d.source.x)
          .attr("y1", (d) => d.source.y)
          .attr("x2", (d) => d.target.x)
          .attr("y2", (d) => d.target.y);

        nodes.attr("cx", (d) => d.x).attr("cy", (d) => d.y);

        labels
          .attr("dx", (d) => d.x + (nodeSize ? sizeScale(d.count) + 5 : 10))
          .attr("dy", (d) => d.y + 5);
      });

      simulation.force("link").links(graph.links);

      if (highlightSource)
        svg.selectAll(".source").classed("highlighted", true);
      if (highlightTarget)
        svg.selectAll(".target").classed("highlighted", true);
    }

    buildNodesAndLinks(rows, settings) {
      const nodes = {};
      const sources = new Set();
      const targets = new Set();
      const links = [];
      const { sourceDimension, targetDimension } = settings;

      rows.forEach((datum) => {
        const source = datum[sourceDimension];
        const target = datum[targetDimension];
        nodes[source] = (nodes[source] || 0) + 1;
        nodes[target] = (nodes[target] || 0) + 1;
        sources.add(source);
        targets.add(target);
        if (
          links.findIndex((l) => l.source === source && l.target === target) ===
            -1 &&
          links.findIndex((l) => l.source === target && l.target === source) ===
            -1
        )
          links.push({ source, target });
      });
      return {
        nodes: Object.entries(nodes).map(([id, count]) => ({
          id,
          count,
          class: [sources.has(id) && "source", targets.has(id) && "target"]
            .filter(Boolean)
            .join(" "),
        })),
        links,
      };
    }

    render(data) {
      if (!data) {
        return this.renderError("No Data!");
      }

      const rows = this.getRows(data);
      if (!rows) {
        return this.renderError(`
        <details>
          <summary>Malformed project data!</summary>
          <pre>${JSON.stringify(data, null, 2)}</pre>
        </details>
        `);
      }

      const settings = this.getSettings(data, "graphView");
      if (!settings) {
        return this.renderError(`
        <details>
          <summary>Graph Visualization not available!</summary>
          <pre>${JSON.stringify(data, null, 2)}</pre>
        </details>
        `);
      }

      this.body.innerHTML = "";
      this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      this.svg.style.height = "100%";
      this.svg.style.width = "100%";
      this.body.appendChild(this.svg);
      const graph = this.buildNodesAndLinks(rows, settings);
      this.scriptsReady.then(() => {
        this.drawGraph(JSON.parse(JSON.stringify(graph)), settings);
      });
    }
  },
);
