    const signinEndpoint = 'https://learn.reboot01.com/api/auth/signin';
    const gqlEndpoint = 'https://learn.reboot01.com/api/graphql-engine/v1/graphql';
    const logoutEndpoint = 'https://learn.reboot01.com/api/auth/logout'; 


    let jwtToken = null;
    let progressData = [];
    let currentProgressIndex = 0;


    async function login(username, password) {
      const authHeader = 'Basic ' + btoa(`${username}:${password}`);
      const response = await fetch(signinEndpoint, {
        method: 'POST',
        headers: { Authorization: authHeader }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Login failed with status:', response.status, 'Response:', errorText);
        throw new Error('Invalid login');
      }
      jwtToken = await response.json(); 
      console.log('Successfully logged in. JWT Token received ');
    }

    async function fetchGraphQL(query, variables = {}) {
      const response = await fetch(gqlEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query, variables })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('GraphQL query failed with status:', response.status, 'Response:', errorText);
        throw new Error(`GraphQL query failed: ${errorText}`);
      }
      const responseJson = await response.json();
      console.log('GraphQL Response data:', responseJson.data);
      if (responseJson.errors) {
        console.error('GraphQL Errors from server:', responseJson.errors);
        throw new Error('GraphQL returned errors: ' + JSON.stringify(responseJson.errors));
      }
      return responseJson.data;
    }

    async function loadUserInfo() {
      const query = `{
        user {
          id
          login
          attrs
        }
      }`;
      try {
        const data = await fetchGraphQL(query);
        const user = data.user[0];
        document.getElementById('username').textContent = user.login;
        document.getElementById('firstName').textContent = user.attrs.firstName || 'N/A';
        document.getElementById('lastName').textContent = user.attrs.lastName || 'N/A';
        document.getElementById('email').textContent = user.attrs.email || 'N/A';
        console.log('User info loaded:', user.login);
      } catch (error) {
        console.error('Error loading user info:', error);
        document.getElementById('userInfo').innerHTML = '<p>Error loading user information.</p>';
      }
    }

    //audit
    async function loadAuditData() {
      const query = `{
        transaction(where: {type: {_in: ["up", "down"]}}) {
          type
          amount
        }
      }`;
      try {
        const data = await fetchGraphQL(query);
        console.log('Audit data received:', data.transaction);
        let done = 0;
        let received = 0;

        data.transaction.forEach(tx => {
          if (tx.type === 'up') done += tx.amount;
          else if (tx.type === 'down') received += tx.amount;
        });

        const ratio = received > 0
          ? (Math.round((done / received) * 10) / 10).toFixed(1)
          : done > 0
          ? '∞'
          : '0.0';

        const doneMB = (done / 1_000_000).toFixed(2);
        const receivedMB = (received / 1_000_000).toFixed(2);

        drawPie(done, received);
        document.getElementById('auditText').innerHTML =
          `Done: <strong>${doneMB} MB</strong><br>
          Received: <strong>${receivedMB} MB</strong><br>
          Ratio: <strong>${ratio}</strong> ${ratio >= 1.5 ? 'Almost perfect!' : ''}`;
        console.log('Audit data displayed.');
      } catch (error) {
        console.error('Error loading audit data:', error);
        document.getElementById('auditSection').innerHTML = '<p>Error loading audit data.</p>';
      }
    }

    async function loadSkillsAndXPData() {
      const query = `{
        transaction(where: { type: { _eq: "xp" } }) {
          amount
          path
          createdAt
        }
      }`;

      try {
        const data = await fetchGraphQL(query);
        const xpByProject = {};
        const xpByDate = {};

        data.transaction.forEach(tx => {
          const pathParts = tx.path.split('/');
          let project = pathParts[2] || 'unknown'; 
          if (pathParts[3] && pathParts[3].trim() !== '') { 
              project = pathParts[3];
          } else if (pathParts[2] && pathParts[2].trim() !== '') {
              project = pathParts[2];
          }

          const date = tx.createdAt.split('T')[0]; 

          xpByProject[project] = (xpByProject[project] || 0) + tx.amount;
          xpByDate[date] = (xpByDate[date] || 0) + tx.amount;
        });

        const skillsArray = Object.entries(xpByProject).map(([key, val]) => ({
          type: key,
          amount: val / 1000
        }));

        const xpOverTimeArray = Object.entries(xpByDate)
          .sort(([a], [b]) => a.localeCompare(b)) 
          .map(([key, val]) => ({
            date: key,
            amount: val / 1000
          }));

        drawSkills(skillsArray);
        drawXPOverTime(xpOverTimeArray);
      } catch (error) {
          console.error('Error loading skills and XP data:', error);
          document.getElementById('skillsSection').innerHTML = '<p>Error loading skills data.</p>';
          document.getElementById('xpOverTimeSection').innerHTML = '<p>Error loading XP over time data.</p>';
      }
    }

    function showProgress(index) {
      console.log('Attempting to show progress for index:', index);
      const progressCard = document.getElementById('progressCard');
      if (!progressCard) {
        console.error('progressCard element not found!');
        return;
      }

      if (progressData.length === 0) {
        progressCard.innerHTML = '<p>No graded progress found.</p>';
        document.getElementById('prevButton').disabled = true;
        document.getElementById('nextButton').disabled = true;
        console.log('showProgress: progressData is empty, disabling buttons.');
        return;
      }

      const item = progressData[index];
      if (item) {
        console.log('Displaying progress item:', item);
        progressCard.innerHTML = `
          <p><strong>Path:</strong> ${item.path}</p>
          <p><strong>Created At:</strong> ${new Date(item.createdAt).toLocaleString()}</p>
          <p><strong>Updated At:</strong> ${new Date(item.updatedAt).toLocaleString()}</p>
        `;
      } else {
        progressCard.innerHTML = '<p>Progress item not found at this index.</p>';
        console.warn('showProgress: Item not found at index', index);
      }

      const prevBtn = document.getElementById('prevButton');
      const nextBtn = document.getElementById('nextButton');
      if (prevBtn) prevBtn.disabled = index === 0;
      if (nextBtn) nextBtn.disabled = index === progressData.length - 1;
      console.log(`Progress nav buttons: Prev disabled = ${prevBtn?.disabled}, Next disabled = ${nextBtn?.disabled}`);
    }

    function bindProgressNavButtons() {
      const nextBtn = document.getElementById('nextButton');
      const prevBtn = document.getElementById('prevButton');

      if (!nextBtn || !prevBtn) {
        console.warn('Progress navigation buttons not found.');
        return;
      }

      nextBtn.addEventListener('click', () => {
        console.log('Next button clicked. Current index:', currentProgressIndex);
        if (currentProgressIndex < progressData.length - 1) {
          currentProgressIndex++;
          showProgress(currentProgressIndex);
        }
      });

      prevBtn.addEventListener('click', () => {
        console.log('Previous button clicked. Current index:', currentProgressIndex);
        if (currentProgressIndex > 0) {
          currentProgressIndex--;
          showProgress(currentProgressIndex);
        }
      });
      console.log('Progress');
    }

    async function fetchProgress() {
      console.log('Starting fetchProgress...');
      const query = `{
        progress {
          path
          grade
          createdAt
          updatedAt
        }
      }`;

      try {
        const data = await fetchGraphQL(query);
        console.log('Raw progress data from GraphQL response:', data.progress);

        let filteredProgress = data.progress.filter(p => p.grade !== null);

        progressData = filteredProgress.sort((a, b) => {
          return new Date(b.createdAt) - new Date(a.createdAt); // b - a for descending order
        });

        console.log('Filtered and sorted progressData (newest date first):', progressData);

        if (progressData.length === 0) {
          document.getElementById('progressCard').innerHTML = '<p>No graded progress found.</p>';
          document.getElementById('prevButton').disabled = true;
          document.getElementById('nextButton').disabled = true;
          return;
        }

        currentProgressIndex = 0;

        console.log('Current progress index after fetch, filter, sort, and adjustment:', currentProgressIndex);
        showProgress(currentProgressIndex);
        console.log('fetchProgress completed successfully.');
      } catch (error) {
        console.error('Error fetching progress data:', error);
        document.getElementById('progressCard').innerHTML = `<p>Error loading progress: ${error.message}</p>`;
        document.getElementById('prevButton').disabled = true;
        document.getElementById('nextButton').disabled = true;
      }
    }

    document.addEventListener('DOMContentLoaded', () => {
      bindProgressNavButtons();
    });

    async function loadDashboardData() {
      console.log('Loading all dashboard data...');
      await loadUserInfo();
      await loadAuditData();
      await loadSkillsAndXPData(); 
      await fetchProgress(); 
      console.log('All dashboard data loaded.');
    }

    document.getElementById('loginButton').addEventListener('click', async () => {
      const username = document.getElementById('loginUsername').value;
      const password = document.getElementById('loginPassword').value;

      if (!username || !password) {
        document.getElementById('loginError').textContent = 'Please enter both username and password';
        document.getElementById('loginError').style.display = 'block';
        return;
      }

      try {
        document.getElementById('loader').style.display = 'block';
        document.getElementById('loginButton').disabled = true;
        document.getElementById('loginButton').textContent = 'Logging in...';
        document.getElementById('loginError').style.display = 'none';

        await login(username, password); // This sets jwtToken globally
        document.getElementById('loginBox').style.display = 'none';
        document.getElementById('dashboardContent').style.display = 'block';
        document.querySelector('.dashboard-header').style.display = 'flex';
        document.querySelector('.dashboard').style.display = 'block';

        await loadDashboardData(); 
      } catch (e) {
        document.getElementById('loginError').textContent = e.message || 'Login failed. Please check your credentials.';
        document.getElementById('loginError').style.display = 'block';
      } finally {
        document.getElementById('loader').style.display = 'none';
        document.getElementById('loginButton').disabled = false;
        document.getElementById('loginButton').textContent = 'Login to Dashboard';
      }
    });

    // Enter key to login
    document.getElementById('loginPassword').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('loginButton').click();
      }
    });

    document.getElementById('logoutButton').addEventListener('click', async () => {
      try {
        if (jwtToken) {
          console.log('Attempting to log out via API...');
          const response = await fetch(logoutEndpoint, {
            method: 'POST', 
            headers: {
              'Authorization': `Bearer ${jwtToken}`, // Send the JWT token
              'Content-Type': 'application/json' //  for POST requests
            }
          });

          if (!response.ok) {
            console.error('Logout API call failed:', response.status, await response.text());
          } else {
            console.log('Successfully logged out from API.');
          }
        } else {
          console.log('No JWT token found, performing local logout only.');
        }
      } catch (error) {
        console.error('Error during logout API call:', error);
      } finally {
        jwtToken = null; // JWT token
        progressData = []; // progress data
        currentProgressIndex = 0; // Reset progress index

        document.getElementById('loginBox').style.display = 'block';
        document.getElementById('dashboardContent').style.display = 'none';

        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
        document.getElementById('loginError').style.display = 'none'; // Hide error message

        console.log('User logged out. Local state cleared.');
      }
    });

    // Pie Chart (Audit)
    function drawPie(done, received) {
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
            .html(`${d.data.label}: ${(d.data.value / 1_000_000).toFixed(2)} MB`);
        })
        .on('mouseout', function() {
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

    function drawXPOverTime(data) {
        console.log('drawXPOverTime called with data:', data);

        if (!data || data.length === 0) {
            d3.select('#xpOverTimeGraph').html('<text x="50%" y="50%" text-anchor="middle" fill="#aaa">No XP data over time to display.</text>');
            console.log('No XP over time data to draw.');
            return;
        }

        const margin = { top: 20, right: 30, bottom: 80, left: 60 }; 
        const width = document.getElementById('xpOverTimeGraph').clientWidth - margin.left - margin.right;
        const height = 350 - margin.top - margin.bottom;

        d3.select('#xpOverTimeGraph').html(''); 

        const svg = d3.select('#xpOverTimeGraph')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Parse dates
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

        // X scale (Time)
        const x = d3.scaleTime()
            .domain(d3.extent(data, d => d.date))
            .range([0, width]);

        // Y scale (XP Amount)
        const y = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.amount) * 1.1]) // Add some padding to max
            .range([height, 0]);

        // X axis
        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x).ticks(d3.timeMonth.every(1)).tickFormat(d3.timeFormat('%b %Y'))) // Format for Month Year
            .selectAll('text')
                .style('fill', 'var(--font--paragraph)')
                .style('font-size', '12px')
                .attr('transform', 'rotate(-45)')
                .style('text-anchor', 'end');

        // Y axis
        svg.append('g')
            .call(d3.axisLeft(y).ticks(5))
            .selectAll('text')
                .style('fill', 'var(--font--paragraph)')
                .style('font-size', '12px');

        // Y axis label
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

        // Add the path
        svg.append('path')
            .datum(data)
            .attr('fill', 'none')
            .attr('stroke', '#1cb39b') 
            .attr('stroke-width', 3)
            .attr('d', line)
            .attr('stroke-dasharray', function() {
                const length = this.getTotalLength();
                return `${length} ${length}`;
            })
            .attr('stroke-dashoffset', function() {
                return this.getTotalLength();
            })
            .transition()
            .duration(2000)
            .ease(d3.easeLinear)
            .attr('stroke-dashoffset', 0);


        const tooltip = d3.select('#tooltip');

        // Create a group for each data point to hold the circle and text label
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

        // Add text labels to each group
        dataPoints.append('text')
            .attr('class', 'dot-label')
            .attr('x', 5) 
            .attr('y', -8) 
            .attr('text-anchor', 'start') 
            .style('fill', 'var(--font--heading-primary)')
            .style('font-size', '12px')
            .style('opacity', 0) // Keep initially hidden
            .text(d => formatXPAmount(d.amount) + ' kB');

        dataPoints.on('mouseover', function(event, d) {
            d3.select(this).select('.dot')
                .transition().duration(100).attr('r', 7).attr('fill', '#20d0b5'); 
            d3.select(this).select('.dot-label')
                .transition().duration(100).style('opacity', 1); // Show the label

            // Show tooltip
            tooltip.style('opacity', 0.9)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 25) + 'px')
                .html(`Date: ${d3.timeFormat('%Y-%m-%d')(d.date)}<br>XP: ${formatXPAmount(d.amount)} kB`);
        })
        .on('mouseout', function() {
            d3.select(this).select('.dot')
                .transition().duration(100).attr('r', 5).attr('fill', '#1cb39b'); 
            d3.select(this).select('.dot-label')
                .transition().duration(100).style('opacity', 0); 

            tooltip.style('opacity', 0);
        });
    }

    // Background animation setup
    function createLines() {
      const container = document.getElementById('lines-container');
      const lineCount = window.innerWidth < 768 ? 8 : 15;
      
      container.innerHTML = ''; 

      for (let i = 0; i < lineCount; i++) {
        const line = document.createElement('div');
        line.classList.add('line');
        
        // Random positioning and styling
        const width = Math.random() * 100 + 50;
        const top = Math.random() * 100; 
        const delay = Math.random() * 5; 
        const duration = 5 + Math.random() * 5; 
        line.style.width = `${width}px`;
        line.style.top = `${top}%`;
        line.style.opacity = '0';
        line.style.animationDelay = `${delay}s`;
        line.style.animationDuration = `${duration}s`;
        
        container.appendChild(line);
      }
    }
    
    createLines();
    
    window.addEventListener('resize', () => {
      createLines(); 
    });

    // Typing animation effect (currently unused in HTML but good to keep)
    function typeWriter(element, text, speed = 50) {
      let i = 0;
      element.textContent = '';
      
      function type() {
        if (i < text.length) {
          element.textContent += text.charAt(i);
          i++;
          setTimeout(type, speed);
        }
      }
      
      type();
    }


    function drawSkills(skills) {
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
            console.log('No skills data to draw.');
            return;
        }


      const margin = { top: 20, right: 30, bottom: 40, left: 50 };
      const width = document.getElementById('skillsGraph').clientWidth - margin.left - margin.right;
      const height = 300 - margin.top - margin.bottom; // Adjusted height for skills graph

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
            .html(`<strong>${d.type}</strong><br>${d.amount.toFixed(2)} kB`);
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
