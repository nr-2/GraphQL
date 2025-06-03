import { fetchGraphQL } from '../api/graphql.js';

export async function loadAuditData() {
  const query = `{ transaction(where: {type: {_in: ["up", "down"]}}) { type amount } }`;
  const data = await fetchGraphQL(query);

  let done = 0, received = 0;
  data.transaction.forEach(tx => {
    tx.type === 'up' ? done += tx.amount : received += tx.amount;
  });

  drawPie(done, received);

  const doneMB = (done / 1_000_000).toFixed(2);
  const receivedMB = (received / 1_000_000).toFixed(2);
  const ratio = received > 0 ? (done / received).toFixed(1) : '∞';

  document.getElementById('auditText').innerHTML =
    `Done: <strong>${doneMB} MB</strong><br>
     Received: <strong>${receivedMB} MB</strong><br>
     Ratio: <strong>${ratio}</strong>`;
}

export function drawPie(done, received) {
    const width = 200;
  const height = 200;
  const radius = Math.min(width, height) / 2;

  d3.select('#auditPie').html('');

  const svg = d3.select('#auditPie')
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .attr('transform', `translate(${width/2},${height/2})`);

  const data = [
    { label: 'Done', value: done },
    { label: 'Received', value: received }
    ];

  const color = d3.scaleOrdinal()
    .domain(data.map(d => d.label))
    .range(['#1cb39b', '#F44336']);

  const pie = d3.pie()
    .value(d => d.value)
    .sort(null);

  const arc = d3.arc()
    .innerRadius(radius * 0.6)
    .outerRadius(radius);

  const arcTween = d => {
    const i = d3.interpolate({startAngle: 0, endAngle: 0}, d);
    return t => arc(i(t));
  };

  const tooltip = d3.select('#tooltip');

  const paths = svg.selectAll('path')
    .data(pie(data))
    .enter()
    .append('path')
    .attr('d', arc)
    .attr('fill', d => color(d.data.label))
    .attr('stroke', '#333')
    .attr('stroke-width', 2)
    .style('opacity', 0.9)
    .on('mouseover', function(event, d) {
      d3.select(this).transition().duration(300).style('opacity', 1).attr('transform', 'scale(1.05)');
      tooltip.style('opacity', 0.9)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 25) + 'px')
        .html(`${d.data.label}: ${d.data.value} MB`);
    })
    .on('mouseout', function() {
      d3.select(this).transition().duration(300).style('opacity', 0.9).attr('transform', 'scale(1)');
      tooltip.style('opacity', 0);
    });

  paths.transition()
    .duration(1000)
    .attrTween('d', arcTween);

  const ratio = Math.round((done / received) * 10) / 10;

  svg.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '.35em') // perfect vertical centering
    .style('font-size', '16px')
    .style('font-weight', '600')
    .style('fill', '#fff')
    .style('opacity', 0)
    .text(`Ratio: ${ratio}`)
    .transition()
    .duration(800)
    .style('opacity', 1);
}


