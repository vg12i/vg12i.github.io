// script.js

// Define the dimensions of the SVG container
const margin = { top: 20, right: 30, bottom: 40, left: 60 }; // Adjusted left margin for more space
const width = 960 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

// Create an SVG element
const svg = d3.select("#visualization").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// Load the data
d3.csv("data.csv").then(data => {
    // Process the data
    data.forEach(d => {
        d.Year = +d.Year;
    });

    // Aggregate the number of gold medals per year and by country
    const aggregateGoldMedals = (filteredData) => {
        const goldMedalsPerYear = d3.rollup(filteredData, v => d3.sum(v, d => d.Medal === "Gold" ? 1 : 0), d => d.Year);
        return Array.from(goldMedalsPerYear, ([Year, GoldMedals]) => ({ Year, GoldMedals }));
    };

    const aggregateTotalGoldMedals = (data) => {
        const totalGoldMedalsPerYear = d3.rollup(data, v => d3.sum(v, d => d.Medal === "Gold" ? 1 : 0), d => d.Year, d => d.City);
        return Array.from(totalGoldMedalsPerYear, ([Year, cityMap]) => ({
            Year,
            GoldMedals: Array.from(cityMap.values()).reduce((sum, value) => sum + value, 0),
            City: Array.from(cityMap.keys()).join(", ")
        }));
    };

    const totalGoldMedalsData = aggregateTotalGoldMedals(data);

    // Define the scales and axes
    const x = d3.scaleBand()
        .domain(totalGoldMedalsData.map(d => d.Year))
        .range([0, width])
        .padding(0.1);

    const y = d3.scaleLinear()
        .domain([0, d3.max(totalGoldMedalsData, d => d.GoldMedals)])
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
        .attr("y", margin.bottom - 5)
        .attr("text-anchor", "middle")
        .attr("fill", "black")
        .text("Year");

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
      .append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -margin.left + 40) // Adjusted position for more space
        .attr("text-anchor", "middle")
        .attr("fill", "black")
        .text("Number of Medals");

    // Line generator
    const line = d3.line()
        .x(d => x(d.Year) + x.bandwidth() / 2)
        .y(d => y(d.GoldMedals));

    // Add the line for the total data
    const totalPath = svg.append("path")
        .datum(totalGoldMedalsData)
        .attr("fill", "none")
        .attr("stroke", "gray")
        .attr("stroke-width", 2)
        .attr("d", line);

    // Add points for total data
    const totalPoints = svg.selectAll(".totalPoint")
        .data(totalGoldMedalsData)
      .enter().append("circle")
        .attr("class", "totalPoint")
        .attr("cx", d => x(d.Year) + x.bandwidth() / 2)
        .attr("cy", d => y(d.GoldMedals))
        .attr("r", 4)
        .attr("fill", "gray");

    // Add tooltips for total data
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    totalPoints.on("mouseover", function(event, d) {
        tooltip.transition()
            .duration(200)
            .style("opacity", .9);
        tooltip.html("Year: " + d.Year + "<br/>" + "Gold Medals: " + d.GoldMedals)
            .style("left", (event.pageX + 5) + "px")
            .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function(event, d) {
        tooltip.transition()
            .duration(500)
            .style("opacity", 0);
    });

    // Add dropdown for country selection
    const countryDropdown = d3.select("body").append("select")
        .attr("id", "countryDropdown")
        .on("change", updateCountry);

    const countries = Array.from(new Set(data.map(d => d.Country)));
    countryDropdown.selectAll("option")
        .data(countries)
      .enter().append("option")
        .text(d => d)
        .attr("value", d => d);

    // Add button for toggling USA line
    const toggleButton = d3.select("body").append("button")
        .attr("id", "toggleUSAButton")
        .text("Add/Remove USA")
        .on("click", toggleUSA);

    let usaLineVisible = false;

    function toggleUSA() {
        usaLineVisible = !usaLineVisible;
        updateCountry();
    }

    function updateCountry() {
        const selectedCountry = d3.select("#countryDropdown").property("value");

        const filteredData = selectedCountry ? data.filter(d => d.Country === selectedCountry) : [];
        const filteredGoldMedalsData = aggregateGoldMedals(filteredData);

        // Update the selected country line
        svg.selectAll(".countryLine").remove();
        svg.selectAll(".countryPoint").remove();
        svg.selectAll(".countryText").remove();

        if (filteredGoldMedalsData.length > 0) {
            svg.append("path")
                .datum(filteredGoldMedalsData)
                .attr("class", "countryLine")
                .attr("fill", "none")
                .attr("stroke", "steelblue")
                .attr("stroke-width", 2)
                .attr("d", line);

            const countryPoints = svg.selectAll(".countryPoint")
                .data(filteredGoldMedalsData)
              .enter().append("circle")
                .attr("class", "countryPoint")
                .attr("cx", d => x(d.Year) + x.bandwidth() / 2)
                .attr("cy", d => y(d.GoldMedals))
                .attr("r", 4)
                .attr("fill", "steelblue");

            const countryText = svg.selectAll(".countryText")
                .data(filteredGoldMedalsData)
              .enter().append("text")
                .attr("class", "countryText")
                .attr("x", d => x(d.Year) + x.bandwidth() / 2)
                .attr("y", d => y(d.GoldMedals) - 10)
                .attr("text-anchor", "middle")
                .attr("fill", "steelblue")
                .style("display", "none")
                .text(d => d.GoldMedals);

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
            const usaGoldMedalsData = aggregateGoldMedals(usaData);

            svg.append("path")
                .datum(usaGoldMedalsData)
                .attr("class", "usaLine")
                .attr("fill", "none")
                .attr("stroke", "red")
                .attr("stroke-width", 2)
                .attr("d", line);

            const usaPoints = svg.selectAll(".usaPoint")
                .data(usaGoldMedalsData)
              .enter().append("circle")
                .attr("class", "usaPoint")
                .attr("cx", d => x(d.Year) + x.bandwidth() / 2)
                .attr("cy", d => y(d.GoldMedals))
                .attr("r", 4)
                .attr("fill", "red");

            const usaText = svg.selectAll(".usaText")
                .data(usaGoldMedalsData)
              .enter().append("text")
                .attr("class", "usaText")
                .attr("x", d => x(d.Year) + x.bandwidth() / 2)
                .attr("y", d => y(d.GoldMedals) - 10)
                .attr("text-anchor", "middle")
                .attr("fill", "red")
                .style("display", "none")
                .text(d => d.GoldMedals);

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

    // Initialize the graph with the first country in the dropdown
    updateCountry();
    // Create scenes for the martini glass structure
    createScenes();
});

function createScenes() {
    // Define the scenes
    const scenes = [
        {
            title: "Overview of Olympic Medals",
            description: "This chart shows the distribution of Olympic medals over the years."
        },
        {
            title: "Gold Medals by Year",
            description: "Here we focus on the gold medals won each year."
        },
        {
            title: "Explore by Country",
            description: "Use the dropdown to explore medals by country."
        }
    ];

    // Add scene elements
    const sceneContainer = d3.select("#visualization")
        .append("div")
        .attr("class", "scenes");

    scenes.forEach((scene, index) => {
        const sceneDiv = sceneContainer.append("div")
            .attr("class", "scene")
            .attr("id", "scene-" + index);

        sceneDiv.append("h2")
            .text(scene.title);

        sceneDiv.append("p")
            .text(scene.description);
    });

    // Create a new container for the legend
    const legendContainer = d3.select("#visualization").append("div")
        .attr("class", "legend-container");

    // Define the legend data
    const legendData = [
        { name: "Total Gold Medals", color: "gray" },
        { name: "Selected Country", color: "steelblue" },
        { name: "USA", color: "red" }
    ];

    // Create a legend group
    const legend = legendContainer.selectAll(".legend")
        .data(legendData)
      .enter().append("div")
        .attr("class", "legend-item");

    // Add colored rectangles for each legend item
    legend.append("div")
        .style("display", "inline-block")
        .style("width", "18px")
        .style("height", "18px")
        .style("background-color", d => d.color);

    // Add text for each legend item
    legend.append("div")
        .style("display", "inline-block")
        .style("padding-left", "5px")
        .text(d => d.name);

}
