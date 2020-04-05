import * as d3 from "d3";
import * as topojson from "topojson-client";

import legend from "./legend";

const us_map = async function(data_file) {
  const csv_text = await d3.text(data_file);
  const csv_data = d3.csvParse(csv_text, ({date, fips, cases}) => [date, fips, +cases]);
  const last_date = d3.max(csv_data, d => d[0]);
  const current_data = csv_data.filter(d => d[0] == last_date).map(d => [d[1], d[2]]);

  const date_parse = d3.timeParse("%Y-%m-%d");
  const data_date = date_parse(last_date);
  const date_format = d3.timeFormat("%e-%B-%Y");
  const data = Object.assign(new Map(current_data), {title: `US Covid-19 cases ${date_format(data_date)}`});

  const us = await d3.json("data/counties-albers-10m.json");
  const states = new Map(us.objects.states.geometries.map(d => [d.id, d.properties]));

  const format = d => `${d} cases`;
  const path = d3.geoPath();

  const color = d3.scaleSequentialLog([1, d3.max(Array.from(data.values()))], d3.interpolateBlues);

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

us_map("https://raw.githubusercontent.com/nytimes/covid-19-data/master/us-counties.csv");
