import * as d3 from "d3";
import * as topojson from "topojson-client";

import legend from "./legend";

const us_map = async function(data_file) {
  const us = await d3.json("data/counties-albers-10m.json");
  const csv_text = await d3.text(data_file);

  const states = new Map(us.objects.states.geometries.map(d => [d.id, d.properties]));

  const format = d => `${d} cases`;
  const path = d3.geoPath();
  const color = d3.scaleLog([1, 4], d3.schemeBlues[3]);

  const data = Object.assign(new Map(d3.csvParse(csv_text, ({fips, cases}) => [fips, +cases])), {title: "Covid-19 cases"});

  const svg = d3.select('div#map')
        .append("svg")
        .attr("viewBox", [0, 0, 975, 610]);

  svg.append("g")
    .attr("transform", "translate(610,20)")
    .append(() => legend({color, title: data.title, width: 260, tickFormat: '.0s'}));

  svg.append("g")
    .selectAll("path")
    .data(topojson.feature(us, us.objects.counties).features)
    .join("path")
    .attr("fill", d => color(data.get(d.id) | 0))
    .attr("d", path)
    .append("title")
    .text(d => `${d.properties.name}, ${states.get(d.id.slice(0, 2)).name} ${format(data.get(d.id) | 0)}`);

  svg.append("path")
    .datum(topojson.mesh(us, us.objects.states, (a, b) => a !== b))
    .attr("fill", "none")
    .attr("stroke", "white")
    .attr("stroke-linejoin", "round")
    .attr("d", path);
}

us_map("data/covid-19-20200331.csv");
