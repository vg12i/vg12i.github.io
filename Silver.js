// Define the dimensions of the SVG container
const margin = { top: 50, right: 30, bottom: 70, left: 60 };
const width = 960 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

// Create an SVG element
const svg = d3.select("#visualization").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// Add a title to the graph
svg.append("text")
    .attr("x", width / 2)
    .attr("y", -20)
    .attr("text-anchor", "middle")
    .attr("font-size", "24px")
    .attr("fill", "black")
    .text("Silver Medals in the Olympics Over the Years");

// Load the data
d3.csv("data.csv").then(data => {
    // Process the data
    data.forEach(d => {
        d.Year = +d.Year;
    });

    // Aggregate the number of Silver medals per year and by country
    const aggregateSilverMedals = (filteredData) => {
        const SilverMedalsPerYear = d3.rollup(filteredData, v => d3.sum(v, d => d.Medal === "Silver" ? 1 : 0), d => d.Year);
        return Array.from(SilverMedalsPerYear, ([Year, SilverMedals]) => ({ Year, SilverMedals }));
    };

    const aggregateTotalSilverMedals = (data) => {
        const totalSilverMedalsPerYear = d3.rollup(data, v => d3.sum(v, d => d.Medal === "Silver" ? 1 : 0), d => d.Year, d => d.City);
        return Array.from(totalSilverMedalsPerYear, ([Year, cityMap]) => ({
            Year,
            SilverMedals: Array.from(cityMap.values()).reduce((sum, value) => sum + value, 0),
            City: Array.from(cityMap.keys()).join(", ")
        }));
    };

    const totalSilverMedalsData = aggregateTotalSilverMedals(data);

    // Define the scales and axes
    const x = d3.scaleBand()
        .domain(totalSilverMedalsData.map(d => d.Year))
        .range([0, width])
        .padding(0.1);

    const y = d3.scaleLinear()
        .domain([0, d3.max(totalSilverMedalsData, d => d.SilverMedals)])
        .nice()
        .range([height, 0]);

    const xAxis = d3.axisBottom(x).tickFormat(d3.format("d"));
    const yAxis = d3.axisLeft(y);

    // Add the axes
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis)
      .append("text")
        .attr("x", width / 2)
        .attr("y", margin.bottom - 10)
        .attr("text-anchor", "middle")
        .attr("fill", "black")
        .text("Year");

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
      .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -margin.left + 10)
        .attr("text-anchor", "middle")
        .attr("fill", "black")
        .text("Number of Medals");

    // Line generator
    const line = d3.line()
        .x(d => x(d.Year) + x.bandwidth() / 2)
        .y(d => y(d.SilverMedals));

    // Add the line for the total data
    const totalPath = svg.append("path")
        .datum(totalSilverMedalsData)
        .attr("fill", "none")
        .attr("stroke", "gray")
        .attr("stroke-width", 2)
        .attr("d", line);

    // Add points for total data
    const totalPoints = svg.selectAll(".totalPoint")
        .data(totalSilverMedalsData)
      .enter().append("circle")
        .attr("class", "totalPoint")
        .attr("cx", d => x(d.Year) + x.bandwidth() / 2)
        .attr("cy", d => y(d.SilverMedals))
        .attr("r", 4)
        .attr("fill", "gray");

    // Add text for total data (permanent display)
    svg.selectAll(".totalText")
        .data(totalSilverMedalsData)
      .enter().append("text")
        .attr("class", "totalText")
        .attr("x", d => x(d.Year) + x.bandwidth() / 2)
        .attr("y", d => y(d.SilverMedals) - 10)
        .attr("text-anchor", "middle")
        .attr("fill", "gray")
        .text(d => d.SilverMedals);

    // Add tooltips for total data
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    totalPoints.on("mouseover", function(event, d) {
        tooltip.transition()
            .duration(200)
            .style("opacity", .9);
        tooltip.html("Year: " + d.Year + "<br/>" + "Venue: " + d.City)
            .style("left", (event.pageX + 5) + "px")
            .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function(event, d) {
        tooltip.transition()
            .duration(500)
            .style("opacity", 0);
    });

    // Add explanatory text for country selection
    d3.select("body").append("div")
        .attr("class", "country-selection")
        .html("<p>Select another country to compare:</p>")
      .append("select")
        .attr("id", "countryDropdown")
        .style("margin-right", "10px") // Add margin to right
        .on("change", updateCountry);

    // Add button for toggling USA line
    d3.select("body").append("div")
        .attr("class", "toggle-usa")
        .style("display", "inline-block")
        .html("<p>Add/Remove USA:</p>")
      .append("button")
        .attr("id", "toggleUSAButton")
        .text("Toggle USA")
        .style("margin-left", "10px") // Add margin to left
        .on("click", toggleUSA);

    // Style the dropdown and button
    d3.select("#countryDropdown")
        .style("padding", "5px")
        .style("border-radius", "5px")
        .style("border", "1px solid #ccc");

    d3.select("#toggleUSAButton")
        .style("padding", "5px 10px")
        .style("border-radius", "5px")
        .style("border", "1px solid #ccc")
        .style("background-color", "#f0f0f0");

    // Align dropdown and button in parallel
    d3.select(".country-selection")
        .style("display", "inline-block");

    const countries = Array.from(new Set(data.map(d => d.Country)));
    d3.select("#countryDropdown").selectAll("option")
        .data(countries)
      .enter().append("option")
        .text(d => d)
        .attr("value", d => d);

    let usaLineVisible = false;

    function toggleUSA() {
        usaLineVisible = !usaLineVisible;
        updateCountry();
    }

    function updateCountry() {
        const selectedCountry = d3.select("#countryDropdown").property("value");

        const filteredData = selectedCountry ? data.filter(d => d.Country === selectedCountry) : [];
        const filteredSilverMedalsData = aggregateSilverMedals(filteredData);

        // Update the selected country line
        svg.selectAll(".countryLine").remove();
        svg.selectAll(".countryPoint").remove();
        svg.selectAll(".countryText").remove();

        if (filteredSilverMedalsData.length > 0) {
            svg.append("path")
                .datum(filteredSilverMedalsData)
                .attr("class", "countryLine")
                .attr("fill", "none")
                .attr("stroke", "indianred")
                .attr("stroke-width", 2)
                .attr("d", line);

            const countryPoints = svg.selectAll(".countryPoint")
                .data(filteredSilverMedalsData)
              .enter().append("circle")
                .attr("class", "countryPoint")
                .attr("cx", d => x(d.Year) + x.bandwidth() / 2)
                .attr("cy", d => y(d.SilverMedals))
                .attr("r", 4)
                .attr("fill", "indianred");

            const countryText = svg.selectAll(".countryText")
                .data(filteredSilverMedalsData)
              .enter().append("text")
                .attr("class", "countryText")
                .attr("x", d => x(d.Year) + x.bandwidth() / 2)
                .attr("y", d => y(d.SilverMedals) - 10)
                .attr("text-anchor", "middle")
                .attr("fill", "indianred")
                .style("display", "none")
                .text(d => d.SilverMedals);

            countryPoints.on("mouseover", function(event, d) {
                d3.select(this).attr("r", 6); // Enlarge the point on hover
                countryText.filter(t => t.Year === d.Year).style("display", "block"); // Show the text
            })
            .on("mouseout", function(event, d) {
                d3.select(this).attr("r", 4); // Reset the point size
                countryText.filter(t => t.Year === d.Year).style("display", "none"); // Hide the text
            });
        }

        // Update the USA line
        svg.selectAll(".usaLine").remove();
        svg.selectAll(".usaPoint").remove();
        svg.selectAll(".usaText").remove();

        if (usaLineVisible) {
            const usaData = data.filter(d => d.Country === "USA");
            const usaSilverMedalsData = aggregateSilverMedals(usaData);

            svg.append("path")
                .datum(usaSilverMedalsData)
                .attr("class", "usaLine")
                .attr("fill", "none")
                .attr("stroke", "steelblue")
                .attr("stroke-width", 2)
                .attr("d", line);

            const usaPoints = svg.selectAll(".usaPoint")
                .data(usaSilverMedalsData)
              .enter().append("circle")
                .attr("class", "usaPoint")
                .attr("cx", d => x(d.Year) + x.bandwidth() / 2)
                .attr("cy", d => y(d.SilverMedals))
                .attr("r", 4)
                .attr("fill", "steelblue");

            const usaText = svg.selectAll(".usaText")
                .data(usaSilverMedalsData)
              .enter().append("text")
                .attr("class", "usaText")
                .attr("x", d => x(d.Year) + x.bandwidth() / 2)
                .attr("y", d => y(d.SilverMedals) - 10)
                .attr("text-anchor", "middle")
                .attr("fill", "steelblue")
                .style("display", "none")
                .text(d => d.SilverMedals);

            usaPoints.on("mouseover", function(event, d) {
                d3.select(this).attr("r", 6); // Enlarge the point on hover
                usaText.filter(t => t.Year === d.Year).style("display", "block"); // Show the text
            })
            .on("mouseout", function(event, d) {
                d3.select(this).attr("r", 4); // Reset the point size
                usaText.filter(t => t.Year === d.Year).style("display", "none"); // Hide the text
            });
        }
    }

    // Add legend
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", "translate(0," + (height + 40) + ")");

    legend.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", "gray");

    legend.append("text")
        .attr("x", 24)
        .attr("y", 9)
        .attr("dy", ".35em")
        .text("Total Medals");

    legend.append("rect")
        .attr("x", 120)
        .attr("y", 0)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", "steelblue");

    legend.append("text")
        .attr("x", 144)
        .attr("y", 9)
        .attr("dy", ".35em")
        .text("USA");

    legend.append("rect")
        .attr("x", 220)
        .attr("y", 0)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", "indianred");

    legend.append("text")
        .attr("x", 244)
        .attr("y", 9)
        .attr("dy", ".35em")
        .text("Selected Country");

    // Initialize the graph with the first country in the dropdown
    updateCountry();
});
