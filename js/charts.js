
export function drawProgressBar(done, received,) {
    const margin = { top: 20, right: 20, bottom: 30, left: 80 }; // Increased left margin for labels
    const svgWidth = 350; 
    const barHeight = 30; 
    const barSpacing = 15; 
    const textHeight = 20; 

    // Calculate total SVG height needed for two bars + labels 
    const svgHeight = margin.top + (barHeight * 2) + barSpacing + textHeight + margin.bottom;

    d3.select('#auditPie').html(''); // Clear previous content

    const svg = d3.select('#auditPie')
        .attr('width', svgWidth)
        .attr('height', svgHeight)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const chartWidth = svgWidth - margin.left - margin.right;

    // Determine the maximum value for the x-axis 
    const maxValue = Math.max(done, received);

    // X scale for the bar lengths
    const xScale = d3.scaleLinear()
        .domain([0, maxValue * 1.1]) // Add a little padding to the max value
        .range([0, chartWidth]);

    // --- Draw "Done" bar and label ---
    const doneBarY = 0; // Y-position for the 'Done' bar

    // Label for "Done" bar
    svg.append('text')
        .attr('x', -10) // Position to the left of the chart area (within the left margin)
        .attr('y', doneBarY + barHeight / 2)
        .attr('dy', '.35em')
        .attr('text-anchor', 'end') // Align text to the end (right side) of its x-position
        .style('font-size', '14px')
        .style('fill', 'var(--font--heading-primary)')
        .text('Done:');

    // Rectangle for "Done" bar
    svg.append('rect')
        .attr('x', 0) // Start from the beginning of the chart area
        .attr('y', doneBarY)
        .attr('width', 0) // Start with 0 width for animation
        .attr('height', barHeight)
        .attr('fill', '#1cb39b') // Emerald green
        .attr('rx', 5) // Rounded corners
        .attr('ry', 5)
        .transition()
        .duration(1000)
        .attr('width', xScale(done)); // Animate to the calculated width based on 'done' value

    // --- Draw "Received" bar and label ---
    const receivedBarY = doneBarY + barHeight + barSpacing; // Position below 'Done' bar

    // Label for "Received" bar
    svg.append('text')
        .attr('x', -10) // Position to the left of the chart area
        .attr('y', receivedBarY + barHeight / 2)
        .attr('dy', '.35em')
        .attr('text-anchor', 'end') // Align text to the end
        .style('font-size', '14px')
        .style('fill', 'var(--font--heading-primary)')
        .text('Received:');

    // Rectangle for "Received" bar
    svg.append('rect')
        .attr('x', 0)
        .attr('y', receivedBarY)
        .attr('width', 0) // Start with 0 width for animation
        .attr('height', barHeight)
        .attr('fill', '#F44336') // Red
        .attr('rx', 5)
        .attr('ry', 5)
        .transition()
        .duration(1000)
        .attr('width', xScale(received)); // Animate to the calculated width based on 'received' value

    // --- Display Audit Ratio ---
    // Calculate the y-position to center the text vertically in the space below the bars
    const yEndOfBarsContent = (barHeight * 2) + barSpacing; // Total height occupied by bars and their spacing
    const availableSpaceBelowBars = (svgHeight - margin.top - margin.bottom) - yEndOfBarsContent;
    const ratioTextY = yEndOfBarsContent + (availableSpaceBelowBars / 2);

    svg.append('text')
        .attr('x', chartWidth / 2) // Center horizontally
        .attr('y', ratioTextY) // Vertically centered below bars
        .attr('text-anchor', 'middle')
        .style('font-size', '16px')
        .style('font-weight', 'bold')
        .style('fill', 'var(--font--heading-primary)')
        ;
}



export function drawSkills(skills) {
    skills = skills
        .filter(skill => {
            const type = skill.type.toLowerCase();
            return !type.includes("quest") && !type.includes("checkpoint") && !type.includes("piscine-js") && !type.includes("div-");
        });

    if (skills.length === 0) {
        d3.select('#skillsGraph').html('<text x="50%" y="50%" text-anchor="middle" fill="#aaa">No relevant skill data to display.</text>');
        return;
    }

    // Make width and height dynamic based on the container size
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const containerWidth = document.getElementById('skillsGraph').clientWidth;
    const containerHeight = document.getElementById('skillsGraph').clientHeight;

    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    const radius = Math.min(width, height) / 2;

    d3.select('#skillsGraph').html('');

    const svg = d3.select('#skillsGraph')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${width / 2 + margin.left},${height / 2 + margin.top})`);

    const totalXP = d3.sum(skills, d => d.amount);

    const emeraldColors = [
        "#004d40",
        "#00695c",
        "#00897b",
        "#00a88e",
        "#00c8a8",
        "#4dc2a8",
        "#80d8c0",
    ];

    const color = d3.scaleOrdinal()
        .domain(skills.map(d => d.type))
        .range(emeraldColors);

    const pie = d3.pie()
        .value(d => d.amount)
        .sort(null);

    const arc = d3.arc()
        .innerRadius(radius * 0.6)
        .outerRadius(radius * 0.9);

    const outerArc = d3.arc()
        .innerRadius(radius * 0.95)
        .outerRadius(radius * 0.95);

    const tooltip = d3.select('#tooltip');

    svg.selectAll('path')
        .data(pie(skills))
        .enter()
        .append('path')
        .attr('d', arc)
        .attr('fill', d => color(d.data.type))
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .each(function(d) { this._current = d; })
        .on('mouseover', function (event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('stroke', '#333')
                .attr('stroke-width', 2);
            tooltip.style('opacity', 0.9)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 25) + 'px')
                .html(`<strong>${d.data.type}</strong><br>${d.data.amount.toFixed(2)} %`);
        })
        .on('mouseout', function () {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('stroke', '#fff')
                .attr('stroke-width', 1);
            tooltip.style('opacity', 0);
        })
        .transition()
        .duration(1000)
        .attrTween('d', function(d) {
            const i = d3.interpolate(this._current, d);
            this._current = i(0);
            return function(t) {
                return arc(i(t));
            };
        });

    svg.selectAll('text.label')
        .data(pie(skills))
        .enter()
        .append('text')
        .attr('class', 'label')
        .attr('transform', d => `translate(${outerArc.centroid(d)})`)
        .attr('dy', '0.35em')
        .attr('text-anchor', d => (midAngle(d)) < Math.PI ? 'start' : 'end')
        .style('font-size', '12px')
        .style('fill', 'var(--font--paragraph)')
        .text(d => `${d.data.type} `)
        .style('opacity', 0)
        .transition()
        .duration(1500)
        .delay(1000)
        .style('opacity', 1)
        .each(function(d) {
            const textElement = d3.select(this);
            let text = `${d.data.type} (${d.data.amount.toFixed(2)} kB)`;
            const maxWidth = radius * 0.7; // Max width proportional to radius
            while (textElement.node().getComputedTextLength() > maxWidth && text.length > 0) {
                text = text.slice(0, -1);
                textElement.text(text + '...');
            }
            if (text.length === 0 && d.type.length > 0) {
                textElement.text('');
            }
        });

    function midAngle(d) {
        return d.startAngle + (d.endAngle - d.startAngle) / 2;
    }

    svg.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '-0.35em')
        .style('font-size', '16px')
        .style('font-weight', 'bold')
        .style('fill', 'var(--font--heading-primary)')
        .text('Skills');


}

export function drawXPByProject(xpData) {
    d3.select('#xpByProjectGraph').html(''); 

    // Filter out projects with less than 5 KB (5000 bytes)
    xpData = xpData.filter(d => d.amount >= 5000);

    if (!xpData || xpData.length === 0) {
        d3.select('#xpByProjectGraph').html('<text x="50%" y="50%" text-anchor="middle" fill="#aaa">No XP data to display.</text>');
        return;
    }

    // Sort data in descending order of amount
    xpData.sort((a, b) => b.amount - a.amount);

    // Set up dimensions and margins
    const margin = { top: 20, right: 30, bottom: 120, left: 90 };
    const containerWidth = document.getElementById('xpByProjectGraph').clientWidth;
    const containerHeight = document.getElementById('xpByProjectGraph').clientHeight;

    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    const svg = d3.select('#xpByProjectGraph')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
        .range([0, width])
        .domain(xpData.map(d => d.project))
        .padding(0.2);

    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .attr('transform', 'translate(-10,0)rotate(-45)')
        .style('text-anchor', 'end')
        .style('font-size', '12px')
        .style('fill', 'var(--font--paragraph)');

    const y = d3.scaleLinear()
        .domain([0, d3.max(xpData, d => d.amount) * 1.1])
        .range([height, 0]);

    svg.append('g')
        .call(d3.axisLeft(y).tickFormat(d => `${(d / 1000).toFixed(0)} kB`))
        .style('font-size', '12px')
        .style('fill', 'var(--font--paragraph)')
        .selectAll('text')
        .style('fill', 'var(--font--paragraph)');

    const tooltip = d3.select('#tooltip');

    svg.selectAll('mybar')
        .data(xpData)
        .enter()
        .append('rect')
        .attr('x', d => x(d.project))
        .attr('y', height)
        .attr('width', x.bandwidth())
        .attr('height', 0)
        .attr('fill', '#1cb39b')
        .on('mouseover', function(event, d) {
            d3.select(this).attr('fill', '#148f7f');

            // Inline rounding logic
            const kb = d.amount / 1000;
            const decimal = kb % 0.10;
            const roundedKB = decimal >= 0.025
                ? (Math.ceil(kb * 10) / 10).toFixed(2)
                : kb.toFixed(2);

            tooltip.style('opacity', 0.9)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 25) + 'px')
                .html(`<strong>${d.project}</strong><br>${roundedKB} kB`);
        })
        .on('mouseout', function() {
            d3.select(this).attr('fill', '#1cb39b');
            tooltip.style('opacity', 0);
        })
        .transition()
        .duration(800)
        .attr('y', d => y(d.amount))
        .attr('height', d => height - y(d.amount));
}