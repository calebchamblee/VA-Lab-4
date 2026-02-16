// initialize chart dimensions and attributes
margin = {top: 30, right: 30, bottom: 70, left: 80},
    width = 1400 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

chart = d3.select("#plot-container")
  .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .attr("id", "plot")
  .append("g")
    .attr("transform",
          "translate(" + margin.left + "," + margin.top + ")");

const xScale = d3.scaleBand().range([0, width]).padding(0.4);
const yScale = d3.scaleLinear().range([height, 0]);

const xAxis = chart.append("g")
                    .attr("transform", `translate(0, ${height})`)
                    .call(d3.axisBottom(xScale));
                    
const yAxis = chart.append("g")
                    .call(d3.axisLeft(yScale));

let xName = "Country/Region";
let yName = "Quantity";
let aggName = "sum";

let autoCountry = false;
let autoRegion = false;
let autoState = false;

const xLabel = chart
    .append("text")
    .style("font-size", "17px")
    .style("font-family", "sans-serif")
    .style("font-weight", "bold")
    .attr("text-anchor", "middle")
    .attr("x", width / 2)
    .attr("y", height + 65);

const yLabel = chart
    .append("text")
    .attr("text-anchor", "middle")
    .style("font-size", "17px")
    .style("font-family", "sans-serif")
    .style("font-weight", "bold")
    .attr("transform", "rotate(-90)")
    .attr("y", -50)
    .attr("x", -height / 2);

// update bars based on current x, y, and agg
function draw_bar(y_column, x_column, xName, yName, aggName) {
        xScale.domain(x_column);

        const yMax = d3.max(y_column);
        yScale.domain([0, 1.1 * yMax]);
            
        xAxis.transition().duration(1000).call(d3.axisBottom(xScale));
        // so text does not overlap
        if (xName == "State/Province") {
            xAxis
                .selectAll("text")
                .attr("transform", "rotate(-40)")
                .style("text-anchor", "end")
                .style("font-size", "7px");
        }
        yAxis.transition().duration(1000).call(d3.axisLeft(yScale).ticks(11));
    
        chart
            .selectAll(".bar")
            .data(x_column)
            .join("rect")
            .attr("class", "bar")
            .attr("x", (d) => xScale(d))
            .attr("width", () => xScale.bandwidth())
            .attr("y", (d, i) => yScale(y_column[i]))
            .attr("height", (d, i) => height - yScale(y_column[i]))
            .attr("fill", "blue");
        
        xLabel
            .text(xName);
        
        yLabel
            .text(yName + " " + aggName);
}

// update other possible filter options based on current filters
function update_filter_options(group_filters, is_reset){
    for (const [key, valid__values] of Object.entries(group_filters)) {
        let dropdown = document.getElementById(`${key}-filter`);
        let prevSelection = dropdown.value;
        // reset to only All for now, then add each possible other option
        dropdown.innerHTML = '<option value="All">All</option>'
        valid__values.forEach((val) => {
            let option = document.createElement("option");
            option.value = val;
            option.text = val;
            dropdown.add(option);
        })
        // reset all filters
        if (is_reset) {
            autoCountry = false;
            autoRegion = false;
            autoState = false;

            dropdown.value = "All";
        }
        // if one possible option, select it
        else if (valid__values.length == 1) {
            dropdown.value = valid__values[0];
            // note that these are autoselected for later
            if (key == "Country/Region") autoCountry = true;
            if (key == "Region") autoRegion = true;
            if (key == "State/Province") autoState = true;
        } // reset to All whenever last selection was automatic
        else if (valid__values.includes(prevSelection)) {
            if (key == "Country/Region" && autoCountry) {
                dropdown.value = "All";
                autoCountry = false;
            }
            else if (key == "State/Province" && autoState) {
                dropdown.value = "All";
                autoState = false;
            }
            else if (key == "Region" && autoRegion) {
                dropdown.value = "All";
                autoRegion = false;
            }
            else { // previous filter is still available and was selected by user
                dropdown.value = prevSelection;
            }
        }
        else { // otherwise, default to All
            dropdown.value = "All";
        }
    }
}

// change the data being plotted and reset all filters
function update_aggregate(value, key) {
    // so labels can be updated
    if (key == "grouper") xName = value;
    if (key == "value") yName = value;
    if (key == "agg") aggName = value;

    fetch('/update_aggregate', {
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({value: value, key: key}),
        cache: 'no-cache',
        headers: new Headers({
            'content-type': 'application/json'
        })
    }).then(async function(response){
        // wait for response to be parsed
        let results = await response.json();
        update_filter_options(results['group_filters'], true);
        draw_bar(results['y_column'], results['x_column'], xName, yName, aggName);
    })
}

// key = group name, value = specific value within that group
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
        let results = await response.json();
        let latest_group_filters = results['group_filters'];
        update_filter_options(latest_group_filters, false);
        draw_bar(results['y_column'], results['x_column'], xName, yName, aggName);
    })
}

// intialize chart (bars)
update_aggregate(null, null);