import * as d3 from "d3";
import * as topojson from "topojson-client";

import legend from "./legend";

const us_map = async function(data_file) {
  const csv_text = await d3.text(data_file);
  const csv_data = d3.csvParse(csv_text, ({date, county, fips, cases}) => {
    if (county === 'New York City') fips = '36061';
    if (county === 'Kansas City') fips = '29095';
    return [date, fips, +cases];
  });

  // copy data for NYC to each NYC county
  const nyc_data = csv_data.filter(x => x[1] === "36061");
  nyc_data.forEach(x => {
    csv_data.push([x[0], '36005', x[2]]); // Bronx
    csv_data.push([x[0], '36047', x[2]]); // Kings
    csv_data.push([x[0], '36081', x[2]]); // Queens
    csv_data.push([x[0], '36085', x[2]]); // Richmond
  });
  const last_date = d3.max(csv_data, d => d[0]);

  const current_data = csv_data.filter(d => d[0] === last_date).map(d => [d[1], d[2]]);

  // sum case counts by fips
  const current_data_summed = d3.nest().
        key(d => d[0]).
        rollup(values => d3.sum(values, v => v[1])).
        entries(current_data).
        map(e => [e.key, e.value]);

  const date_parse = d3.timeParse("%Y-%m-%d");
  const data_date = date_parse(last_date);
  const date_format = d3.timeFormat("%e-%B-%Y");
  const data = Object.assign(new Map(current_data_summed), {title: "Confirmed US Covid-19 cases"});

  const us = await d3.json("data/counties-albers-10m.json");

  // change names of NYC counties to New York City
  const nyc_fips = ['36005', '36047', '36061', '36081', '36085'];
  us.objects.counties.geometries.filter(x => nyc_fips.includes(x.id)).forEach(x => x.properties.name = "New York City");

  const states = new Map(us.objects.states.geometries.map(d => [d.id, d.properties]));

  const format = d => `${d} cases`;
  const path = d3.geoPath();

  const color = d3.scaleSequentialLog([1, d3.max(Array.from(data.values()))], d3.interpolateBlues);

  d3.select('span#data-date')
    .text(`${date_format(data_date)}`);

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
