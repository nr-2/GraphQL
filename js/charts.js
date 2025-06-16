export function drawPie(done, received) {
    const width = 200;
    const height = 200;
    const radius = Math.min(width, height) / 2;

    d3.select('#auditPie').html('');

    const svg = d3.select('#auditPie')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${width / 2},${height / 2})`);

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
        const i = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
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
        .on('mouseover', function (event, d) {
            d3.select(this).transition().duration(300).style('opacity', 1).attr('transform', 'scale(1.05)');
            tooltip.style('opacity', 0.9)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 25) + 'px')
                .html(`${d.data.label}: ${(d.data.value / 1_000_000).toFixed(2)} MB`);
        })
        .on('mouseout', function () {
            d3.select(this).transition().duration(300).style('opacity', 0.9).attr('transform', 'scale(1)');
            tooltip.style('opacity', 0);
        });

    paths.transition()
        .duration(1000)
        .attrTween('d', arcTween);

    const ratio = received > 0 ? (Math.round((done / received) * 10) / 10).toFixed(1) : (done > 0 ? '∞' : '0.0');

    svg.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '.35em')
        .style('font-size', '16px')
        .style('font-weight', '600')
        .style('fill', '#fff')
        .style('opacity', 0)
        .text(`Ratio: ${ratio}`)
        .transition()
        .duration(800)
        .style('opacity', 1);
}

export function drawXPOverTime(data) {
    if (!data || data.length === 0) {
        d3.select('#xpOverTimeGraph').html('<text x="50%" y="50%" text-anchor="middle" fill="#aaa">No XP data over time to display.</text>');
        return;
    }

    const margin = { top: 20, right: 30, bottom: 60, left: 60 };
    const width = document.getElementById('xpOverTimeGraph').clientWidth - margin.left - margin.right;
    const height = 350 - margin.top - margin.bottom;

    d3.select('#xpOverTimeGraph').html('');

    const svg = d3.select('#xpOverTimeGraph')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const parseDate = d3.timeParse('%Y-%m-%d');
    data.forEach(d => {
        d.date = parseDate(d.date);
        d.amount = +d.amount;
    });

    function formatXPAmount(amount) {
        const valueStr = amount.toFixed(2);
        if (valueStr.endsWith('5')) {
            return (Math.ceil(amount * 10) / 10).toFixed(2);
        } else {
            return amount.toFixed(2);
        }
    }

    const x = d3.scaleTime()
        .domain(d3.extent(data, d => d.date))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.amount) * 1.1])
        .range([height, 0]);

    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(d3.timeMonth.every(1)).tickFormat(d3.timeFormat('%b %Y')))
        .selectAll('text')
        .style('fill', 'var(--font--paragraph)')
        .style('font-size', '12px')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end');

    svg.append('g')
        .call(d3.axisLeft(y).ticks(5))
        .selectAll('text')
        .style('fill', 'var(--font--paragraph)')
        .style('font-size', '12px');

    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -margin.left + 15)
        .attr('x', -height / 2)
        .attr('text-anchor', 'middle')
        .style('fill', 'var(--font--paragraph)')
        .text('XP (kB)');

    const line = d3.line()
        .x(d => x(d.date))
        .y(d => y(d.amount))
        .curve(d3.curveMonotoneX);

    svg.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', '#1cb39b')
        .attr('stroke-width', 3)
        .attr('d', line)
        .attr('stroke-dasharray', function () {
            const length = this.getTotalLength();
            return `${length} ${length}`;
        })
        .attr('stroke-dashoffset', function () {
            return this.getTotalLength();
        })
        .transition()
        .duration(2000)
        .ease(d3.easeLinear)
        .attr('stroke-dashoffset', 0);

    const tooltip = d3.select('#tooltip');

    const dataPoints = svg.selectAll('.data-point')
        .data(data)
        .enter()
        .append('g')
        .attr('class', 'data-point')
        .attr('transform', d => `translate(${x(d.date)},${y(d.amount)})`);

    dataPoints.append('circle')
        .attr('class', 'dot')
        .attr('r', 5)
        .attr('fill', '#1cb39b')
        .attr('stroke', 'var(--background-secondary)')
        .attr('stroke-width', 2)
        .style('opacity', 0)
        .transition()
        .delay((_, i) => i * 50 + 2000)
        .duration(500)
        .style('opacity', 1);

    dataPoints.append('text')
        .attr('class', 'dot-label')
        .attr('x', 5)
        .attr('y', -8)
        .attr('text-anchor', 'start')
        .style('fill', 'var(--font--heading-primary)')
        .style('font-size', '12px')
        .style('opacity', 0)
        .text(d => formatXPAmount(d.amount) + ' kB');

    dataPoints.on('mouseover', function (event, d) {
        d3.select(this).select('.dot')
            .transition().duration(100).attr('r', 7).attr('fill', '#20d0b5');
        d3.select(this).select('.dot-label')
            .transition().duration(100).style('opacity', 1);

        tooltip.style('opacity', 0.9)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 25) + 'px')
            .html(`Date: ${d3.timeFormat('%Y-%m-%d')(d.date)}<br>XP: ${formatXPAmount(d.amount)} kB`);
    })
        .on('mouseout', function () {
            d3.select(this).select('.dot')
                .transition().duration(100).attr('r', 5).attr('fill', '#1cb39b');
            d3.select(this).select('.dot-label')
                .transition().duration(100).style('opacity', 0);

            tooltip.style('opacity', 0);
        });
}

export function drawSkills(skills) {
    function roundToNextTenth(value) {
        return Math.ceil(value * 10) / 10;
    }

    skills = skills
        .filter(skill => {
            const type = skill.type.toLowerCase();
            return !type.includes("quest") && !type.includes("checkpoint") && !type.includes("piscine-js") && !type.includes("div-");
        })
        .map(skill => ({
            ...skill,
            amount: roundToNextTenth(skill.amount)
        }));

    if (skills.length === 0) {
        d3.select('#skillsGraph').html('<text x="50%" y="50%" text-anchor="middle" fill="#aaa">No relevant skill data to display.</text>');
        return;
    }

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
        .on('mouseover', function (event, d) {
            d3.select(this)
                .transition()
                .duration(300)
                .attr('fill', '#20d0b5');

            tooltip.style('opacity', 0.9)
                .style('left', `${event.pageX + 10}px`)
                .style('top', `${event.pageY - 25}px`)
                .html(`<strong>${d.type}</strong><br>${d.amount.toFixed(2)} kB`);
        })
        .on('mouseout', function (event, d) {
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
}