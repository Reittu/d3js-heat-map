const MARGIN = { top: 30, right: 10, bottom: 150, left: 120 };
const OUTER_WIDTH = 1200,
  OUTER_HEIGHT = 550,
  INNER_WIDTH = OUTER_WIDTH - MARGIN.left - MARGIN.right,
  INNER_HEIGHT = OUTER_HEIGHT - MARGIN.top - MARGIN.bottom;

const TOOLTIP = { width: 180, offset: 30 };
TOOLTIP.offsetLeft = -(TOOLTIP.width + TOOLTIP.offset);
TOOLTIP.threshold = OUTER_WIDTH - TOOLTIP.width - TOOLTIP.offset;
const getTooltipOffset = e => (e.offsetX > TOOLTIP.threshold) ? TOOLTIP.offsetLeft : TOOLTIP.offset;

const xScale = d3.scaleBand().range([0, INNER_WIDTH]).paddingOuter(.05);
const yScale = d3.scaleBand().range([0, INNER_HEIGHT]).domain([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);

const yAxis = d3.axisLeft(yScale)
  .tickSizeOuter(0)
  .tickFormat(month => d3.timeFormat('%B')(new Date(0, month)));

const xAxis = d3.axisBottom(xScale)
  .tickSizeOuter(0)
  .tickSizeInner(10, 1)
  .tickFormat(year => d3.timeFormat('%Y')(new Date(year, 0)));

const wrapper = d3.select('.d3-wrapper');

const tooltip = wrapper.append('div')
  .attr('class', 'tooltip')
  .attr('id', 'tooltip')
  .style('opacity', 0)
  .style('width', TOOLTIP.width + 'px');

const header = wrapper.append('header');
const title = header.append('h1')
  .attr('id', 'title')
  .text('Monthly Global Land-Surface Temperature');
const description = header.append('h3')
  .attr('id', 'description');

const svg = wrapper.append('svg')
  .attr('width', OUTER_WIDTH)
  .attr('height', OUTER_HEIGHT)
  .append('g')
  .attr('transform', `translate(${MARGIN.left}, ${MARGIN.top})`);

d3.json('https://raw.githubusercontent.com/FreeCodeCamp/ProjectReferenceData/master/global-temperature.json')
  .then((data) => {
    data.monthlyVariance.forEach(val => val.month -= 1); // From 1-12 to 0-11 for javascript
    xScale.domain(data.monthlyVariance.map(val => val.year));
    xAxis.tickValues(xScale.domain().filter(year => year % 10 === 0)) // Ticks every even 10 years

    description.html(data.monthlyVariance[0].year + ' - '
      + data.monthlyVariance[data.monthlyVariance.length - 1].year
      + ': base temperature ' + data.baseTemperature + '&#8451;');

    svg.append('g')
      .attr('id', 'y-axis')
      .call(yAxis)
      .append('text')
      .attr('transform', `translate(-90, ${INNER_HEIGHT / 2}), rotate(-90)`)
      .attr('class', 'axis-label')
      .style('text-anchor', 'middle')
      .text('Months');

    svg.append('g')
      .attr('id', 'x-axis')
      .attr('transform', `translate(0, ${INNER_HEIGHT})`)
      .call(xAxis)
      .append('text')
      .attr('transform', `translate(${INNER_WIDTH / 2}, 50)`)
      .attr('class', 'axis-label')
      .style('text-anchor', 'middle')
      .text('Years');

    const legendColors = d3.schemeRdYlBu[11].reverse();
    const legendWidth = 400;
    const legendHeight = 300 / legendColors.length;

    const variance = data.monthlyVariance.map(val => val.variance);
    const minTemp = data.baseTemperature + Math.min.apply(null, variance); // Same as Math.min(...variance)
    const maxTemp = data.baseTemperature + Math.max.apply(null, variance);

    const legendThreshold = d3.scaleThreshold() // Temperature -> color
      .domain((function (min, max, count) {
        const array = [];
        const step = (max - min) / count;
        const base = min;
        for (var i = 1; i < count; i++) {
          array.push(base + i * step);
        }
        return array;
      })(minTemp, maxTemp, legendColors.length))
      .range(legendColors);

    const legendScale = d3.scaleLinear() // Temperature -> position
      .domain([minTemp, maxTemp])
      .range([0, legendWidth]);

    const legendXAxis = d3.axisBottom(legendScale)
      .tickSizeOuter(0)
      .tickValues(legendThreshold.domain())
      .tickFormat(d3.format('.1f'));

    const legend = svg.append('g')
      .attr('class', 'legend')
      .attr('id', 'legend')
      .attr('transform', `translate(0, ${INNER_HEIGHT + 70})`)

    legend.append('g')
      .selectAll('rect')
      .data(legendThreshold.range().map(function (color) {
        const d = legendThreshold.invertExtent(color); // Color -> min and max positions on legendScale
        if (d[0] == null) d[0] = minTemp;
        if (d[1] == null) d[1] = maxTemp;
        return d;
      }))
      .enter().append('rect')
      .attr('x', (d) => legendScale(d[0])) // Position at min
      .attr('y', 0)
      .attr('width', (d) => legendScale(d[1]) - legendScale(d[0])) // Position at max - position at min
      .attr('height', legendHeight)
      .style('fill', (d) => legendThreshold(d[0]));

    legend.append('g')
      .attr('transform', `translate(0, ${legendHeight})`)
      .call(legendXAxis);

    svg.append('g')
      .classed('map', true)
      .selectAll('rect')
      .data(data.monthlyVariance)
      .enter().append('rect')
      .attr('class', 'cell')
      .attr('data-month', (d) => d.month)
      .attr('data-year', (d) => d.year)
      .attr('data-temp', (d) => data.baseTemperature + d.variance)
      .attr('x', (d) => xScale(d.year))
      .attr('y', (d) => yScale(d.month))
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('fill', (d) => legendThreshold(data.baseTemperature + d.variance))
      .on('mousemove', (d) => {
        const str = d3.timeFormat('%Y - %B')(new Date(d.year, d.month)) + '<br>'
          + d3.format('.1f')(data.baseTemperature + d.variance) + '&#8451;' + '<br>'
          + d3.format('+.1f')(d.variance) + '&#8451;';
        tooltip
          .attr('data-year', d.year)
          .style('opacity', .9)
          .style('left', (d3.event.offsetX) + getTooltipOffset(d3.event) + 'px')
          .style('top', (d3.event.offsetY + 50) + 'px')
          .html(str);
      })
      .on('mouseout', () => tooltip.style('opacity', 0));
  }).catch(err => console.log(err))
