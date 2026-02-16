// TODO: write the function to update all filter options
function update_filter_options(group_filters, is_reset = false){
    console.log('inside update_filter_options');
    for (const [key, valid__values] of Object.entries(group_filters)) {
        let dropdown = document.getElementById(`${key}-filter`);
        let prevSelection = is_reset ? 'All' : dropdown.value;
        console.log('prevSelection:', prevSelection);
        dropdown.innerHTML = '<option value="All">All</option>'
        valid__values.forEach((val) => {
            let option = document.createElement("option");
            option.value = val;
            option.text = val;
            dropdown.add(option);
        })
        dropdown.value = prevSelection || 'All';
    }
}

const margin = {top: 30, right: 30, bottom: 70, left: 60},
width = 500 - margin.left - margin.right,
height = 500 - margin.top - margin.bottom;

const chart = d3.select("#plot-container")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .style("background", "white")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

const xScale = d3.scaleBand().range([margin.left, width - margin.right]).padding(0.4);
const yScale = d3.scaleLinear().range([height, 0]);

const xAxis = chart.append("g")
                    .attr("transform", `translate(0, ${height})`)
                    .call(d3.axisBottom(xScale));
                    
const yAxis = chart.append("g")
                    .attr("transform", `translate(${margin.left}, 0)`)
                    .call(d3.axisLeft(yScale));

function draw_bar(data, x_column, y_column = []) {
        console.log('x_column', x_column);
        xScale.domain(x_column);

        const yMax = d3.max(data);
        yScale.domain([0, yMax]);
            
        xAxis.transition().duration(1000).call(d3.axisBottom(xScale));
        yAxis.transition().duration(1000).call(d3.axisLeft(yScale));
    
        const bars = chart
            .selectAll(".bar")
            .data(x_column)
            .join("rect")
            .attr("class", "bar")
            .attr("x", (d) => xScale(d))
            .attr("width", () => xScale.bandwidth())
            .attr("y", (d, i) => yScale(data[i]))
            .attr("height", (d, i) => height - yScale(data[i]))
            .attr("fill", "blue");
}

function update_aggregate(value, key) { 
    fetch('/update_aggregate', {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({value: value, key: key}),
        cache: 'no-cache',
        headers: new Headers({
            'content-type': 'application/json'
        })
    }).then(async function(response){
        var results = JSON.parse(JSON.stringify((await response.json())))
        // extracts the necessary data from the results and re-draw the bars
        var cleared_filters = results['group_filters'];
        update_filter_options(cleared_filters, true);
        var x_column_val = results['x_column'];
        var y_column_val = results['data'];
        draw_bar(y_column_val, x_column_val);
    })
}

/* key = group name, value = specific value within that group */
function update_filter(value, key){
    fetch('/update_filter', {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({value: value, key: key}),
        cache: 'no-cache',
        headers: new Headers({
            'content-type': 'application/json'
        })
    }).then(async function(response){
        var results = JSON.parse(JSON.stringify((await response.json())))
        // TODO: extract the necessary data from the results, re-draw the bars, and update the filters
        var latest_group_filters = results['group_filters'];
        update_filter_options(latest_group_filters);
        var x_col = results['x_column'], y_col = results['y_column'];
        draw_bar(results['data'][y_col], results['data'][x_col]);
    })
}

update_aggregate(null, null)