import { fetchGraphQL } from '../api/graphql.js';

export async function loadSkillsAndXPData() {
  const query = `{ transaction(where: { type: { _eq: "xp" } }) { amount path createdAt } }`;
  const data = await fetchGraphQL(query);

  const xpByProject = {}, xpByDate = {};
  data.transaction.forEach(tx => {
    const project = tx.path.split('/')[3] || 'unknown';
    const date = tx.createdAt.split('T')[0];

    xpByProject[project] = (xpByProject[project] || 0) + tx.amount;
    xpByDate[date] = (xpByDate[date] || 0) + tx.amount;
  });

  const skills = Object.entries(xpByProject).map(([type, amount]) => ({ type, amount: amount / 1000 }));
  const xpOverTime = Object.entries(xpByDate).map(([date, amount]) => ({ date, amount: amount / 1000 }));

  drawSkills(skills);
  drawXPOverTime(xpOverTime);
}

export function drawSkills(skills) {
  // Round up to nearest .10 if not already .x0
  function roundToNextTenth(value) {
    return Math.ceil(value * 10) / 10;
  }

  // Filter and format skill values
  skills = skills
    .filter(skill => {
      const type = skill.type.toLowerCase();
      return !type.includes("quest") && !type.includes("checkpoint") && !type.includes("piscine-js");
    })
    .map(skill => ({
      ...skill,
      amount: roundToNextTenth(skill.amount)
    }));

  const margin = { top: 20, right: 30, bottom: 40, left: 50 };
  const width = document.getElementById('skillsGraph').clientWidth - margin.left - margin.right;
  const height = 300 - margin.top - margin.bottom;

  d3.select('#skillsGraph').html('');

  const svg = d3.select('#skillsGraph')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const x = d3.scaleBand()
    .range([0, width])
    .padding(0.2)
    .domain(skills.map(d => d.type));

  const maxKB = d3.max(skills, d => d.amount);
  const y = d3.scaleLinear()
    .range([height, 0])
    .domain([0, maxKB + maxKB * 0.2]);

  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(''))
    .selectAll('text').remove();

  svg.append('g')
    .call(d3.axisLeft(y).ticks(5))
    .selectAll('text')
    .style('fill', 'var(--font--paragraph)')
    .style('font-size', '12px');

  svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('y', -margin.left + 20)
    .attr('x', -height / 2)
    .attr('text-anchor', 'middle')
    .style('fill', 'var(--font--paragraph)')
    .text('kB');

  svg.append('text')
    .attr('y', height + margin.bottom - 5)
    .attr('x', width / 2)
    .attr('text-anchor', 'middle')
    .style('fill', 'var(--font--paragraph)')
    .text('Skills');

  const tooltip = d3.select('#tooltip');

  svg.selectAll('.bar')
    .data(skills)
    .enter().append('rect')
    .attr('class', 'bar')
    .attr('x', d => x(d.type))
    .attr('width', x.bandwidth())
    .attr('y', height)
    .attr('height', 0)
    .attr('fill', d => d3.interpolateRgb('#189985', '#1cb39b')(d.amount / maxKB))
    .attr('rx', 4)
    .attr('ry', 4)
    .on('mouseover', function(event, d) {
      d3.select(this)
        .transition()
        .duration(300)
        .attr('fill', '#20d0b5');

      tooltip.style('opacity', 0.9)
        .style('left', `${event.pageX + 10}px`)
        .style('top', `${event.pageY - 25}px`)
        .html(`${d.type}: ${d.amount.toFixed(2)} kB`);
    })
    .on('mouseout', function(event, d) {
      d3.select(this)
        .transition()
        .duration(300)
        .attr('fill', d3.interpolateRgb('#189985', '#1cb39b')(d.amount / maxKB));

      tooltip.style('opacity', 0);
    })
    .transition()
    .duration(800)
    .delay((_, i) => i * 150)
    .attr('y', d => y(d.amount))
    .attr('height', d => height - y(d.amount));

  svg.selectAll('.value-label')
    .data(skills)
    .enter()
    .append('text')
    .attr('class', 'value-label')
    .attr('x', d => x(d.type) + x.bandwidth() / 2)
    .attr('y', d => y(d.amount) - 5)
    .attr('text-anchor', 'middle')
    .style('fill', 'var(--font--heading-primary)')
    .style('font-size', '12px')
    .style('opacity', 0)
    .text(d => `${d.amount.toFixed(2)} kB`)
    .transition()
    .duration(800)
    .delay((_, i) => i * 150 + 400)
    .style('opacity', 1);
}

export function drawXPOverTime(data) {
    console.log('drawXPOverTime called with data:', data);
    // This function needs to be fully implemented if you want to display XP over time.
    // If not, you can remove the call to it in loadSkillsAndXPData.
}

