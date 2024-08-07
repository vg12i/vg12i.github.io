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
    .text("Bronze Medals in the Summer Olympics Over the Years");

// Load the data
d3.csv("data.csv").then(data => {
    // Process the data
    data.forEach(d => {
        d.Year = +d.Year;
    });

    // Aggregate the number of Bronze medals per year and by country
    const aggregateBronzeMedals = (filteredData) => {
        const BronzeMedalsPerYear = d3.rollup(filteredData, v => d3.sum(v, d => d.Medal === "Bronze" ? 1 : 0), d => d.Year);
        return Array.from(BronzeMedalsPerYear, ([Year, BronzeMedals]) => ({ Year, BronzeMedals }));
    };

    const aggregateTotalBronzeMedals = (data) => {
        const totalBronzeMedalsPerYear = d3.rollup(data, v => d3.sum(v, d => d.Medal === "Bronze" ? 1 : 0), d => d.Year, d => d.City);
        return Array.from(totalBronzeMedalsPerYear, ([Year, cityMap]) => ({
            Year,
            BronzeMedals: Array.from(cityMap.values()).reduce((sum, value) => sum + value, 0),
            City: Array.from(cityMap.keys()).join(", ")
        }));
    };

    const totalBronzeMedalsData = aggregateTotalBronzeMedals(data);

    // Define the scales and axes
    const x = d3.scaleBand()
        .domain(totalBronzeMedalsData.map(d => d.Year))
        .range([0, width])
        .padding(0.1);

    const y = d3.scaleLinear()
        .domain([0, d3.max(totalBronzeMedalsData, d => d.BronzeMedals)])
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
        .text("Number of Medals Awarded");

    // Line generator
    const line = d3.line()
        .x(d => x(d.Year) + x.bandwidth() / 2)
        .y(d => y(d.BronzeMedals));

    // Add the line for the total data
    const totalPath = svg.append("path")
        .datum(totalBronzeMedalsData)
        .attr("fill", "none")
        .attr("stroke", "gray")
        .attr("stroke-width", 2)
        .attr("d", line);

    // Add points for total data
    const totalPoints = svg.selectAll(".totalPoint")
        .data(totalBronzeMedalsData)
      .enter().append("circle")
        .attr("class", "totalPoint")
        .attr("cx", d => x(d.Year) + x.bandwidth() / 2)
        .attr("cy", d => y(d.BronzeMedals))
        .attr("r", 4)
        .attr("fill", "gray");

    // Add text for total data (permanent display)
    svg.selectAll(".totalText")
        .data(totalBronzeMedalsData)
      .enter().append("text")
        .attr("class", "totalText")
        .attr("x", d => x(d.Year) + x.bandwidth() / 2)
        .attr("y", d => y(d.BronzeMedals) - 10)
        .attr("text-anchor", "middle")
        .attr("fill", "gray")
        .text(d => d.BronzeMedals);

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

    // Note on missing 1940 and 1944
    d3.select("body").append("div")
        .attr("class", "country-selection")
        .html("<p>Note that there were no Olympics held in 1940 and 1944 due to WWII and hence the jump from 1936 to 1948</p>")

    // Add explanatory text for country selection
    d3.select("body").append("div")
        .attr("class", "country-selection")
        .html("<p>Select another country to compare:</p>")
      .append("select")
        .attr("id", "countryDropdown")
        .on("change", updateCountry);

    // Add button for toggling USA line
    d3.select("body").append("div")
        .attr("class", "toggle-usa")
        .style("display", "inline-block")
        .html("<p>Add/Remove USA:</p>")
      .append("button")
        .attr("id", "toggleUSAButton")
        .text("Toggle USA")
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
        const filteredBronzeMedalsData = aggregateBronzeMedals(filteredData);

        // Update the selected country line
        svg.selectAll(".countryLine").remove();
        svg.selectAll(".countryPoint").remove();
        svg.selectAll(".countryText").remove();

        if (filteredBronzeMedalsData.length > 0) {
            svg.append("path")
                .datum(filteredBronzeMedalsData)
                .attr("class", "countryLine")
                .attr("fill", "none")
                .attr("stroke", "indianred")
                .attr("stroke-width", 2)
                .attr("d", line);

            const countryPoints = svg.selectAll(".countryPoint")
                .data(filteredBronzeMedalsData)
              .enter().append("circle")
                .attr("class", "countryPoint")
                .attr("cx", d => x(d.Year) + x.bandwidth() / 2)
                .attr("cy", d => y(d.BronzeMedals))
                .attr("r", 4)
                .attr("fill", "indianred");

            const countryText = svg.selectAll(".countryText")
                .data(filteredBronzeMedalsData)
              .enter().append("text")
                .attr("class", "countryText")
                .attr("x", d => x(d.Year) + x.bandwidth() / 2)
                .attr("y", d => y(d.BronzeMedals) - 10)
                .attr("text-anchor", "middle")
                .attr("fill", "indianred")
                .style("display", "none")
                .text(d => d.BronzeMedals);

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
            const usaBronzeMedalsData = aggregateBronzeMedals(usaData);

            svg.append("path")
                .datum(usaBronzeMedalsData)
                .attr("class", "usaLine")
                .attr("fill", "none")
                .attr("stroke", "steelblue")
                .attr("stroke-width", 2)
                .attr("d", line);

            const usaPoints = svg.selectAll(".usaPoint")
                .data(usaBronzeMedalsData)
              .enter().append("circle")
                .attr("class", "usaPoint")
                .attr("cx", d => x(d.Year) + x.bandwidth() / 2)
                .attr("cy", d => y(d.BronzeMedals))
                .attr("r", 4)
                .attr("fill", "steelblue");

            const usaText = svg.selectAll(".usaText")
                .data(usaBronzeMedalsData)
              .enter().append("text")
                .attr("class", "usaText")
                .attr("x", d => x(d.Year) + x.bandwidth() / 2)
                .attr("y", d => y(d.BronzeMedals) - 10)
                .attr("text-anchor", "middle")
                .attr("fill", "steelblue")
                .style("display", "none")
                .text(d => d.BronzeMedals);

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
        .attr("x", 20)
        .attr("y", 9)
        .attr("dy", ".35em")
        .text("Total Medals");

    legend.append("rect")
        .attr("x", 125)
        .attr("y", 0)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", "indianred");

    legend.append("text")
        .attr("x", 145)
        .attr("y", 9)
        .attr("dy", ".35em")
        .text("Selected Country");

    legend.append("rect")
        .attr("x", 280)
        .attr("y", 0)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", "steelblue");

    legend.append("text")
        .attr("x", 300)
        .attr("y", 9)
        .attr("dy", ".35em")
        .text("USA");

    // Initialize the graph with the first country in the dropdown
    updateCountry();
});
