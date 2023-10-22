let datasetArray = [];

getDatasetArray();
// console.log(datasetArray);

if (datasetArray.length != 0) {
    document.getElementById("data-list-container").style.display = "block";
}

function getDatasetArray() {

    const urlParams = new URLSearchParams(window.location.search);
    const source = urlParams.get("source");

    if (source == "map" || source == "emp") {
        const datasetArrayJSON = localStorage.getItem('datasetArray');
        const datasetArrayReload = JSON.parse(datasetArrayJSON);
        datasetArray = datasetArrayReload;
        updataContents(datasetArrayReload);

    }

}

const clearListButton = document.getElementById("clear-list");
clearListButton.addEventListener("click", function () {
    localStorage.clear();
    window.location.href = "./index.html";
});

async function getdata(municipalityCodes, mainActivity, sex, age) {
    let dataset = [];

    const jsonQuery = {
        "query": [
            {
                "code": "Alue",
                "selection": {
                    "filter": "item",
                    "values": municipalityCodes
                }
            },
            {
                "code": "Pääasiallinen toiminta",
                "selection": {
                    "filter": "item",
                    "values": [mainActivity]
                }
            },
            {
                "code": "Sukupuoli",
                "selection": {
                    "filter": "item",
                    "values": [sex]
                }
            },
            {
                "code": "Ikä",
                "selection": {
                    "filter": "item",
                    "values": [age]
                }
            }
        ],
        "response": {
            "format": "json-stat2"
        }
    }

    const response = await fetch('https://statfin.stat.fi:443/PxWeb/api/v1/en/StatFin/tyokay/statfin_tyokay_pxt_115b.px', {
        method: 'POST',
        headers: {
            'content-type': 'application/json'
        },
        body: JSON.stringify(jsonQuery)
    });

    if (response.status === 200) {
        const data = await response.json();
        const totalValue = data.value;
        for (let i = 0; i < data.size[0]; i++) {
            const municipalityName = Object.values(data.dimension.Alue.category.label)[i];
            const municipalityCode = municipalityCodes[i];
            let values = totalValue.slice(i * 35, (i + 1) * 35);
            let eachMunicipality = {
                municipalityName,
                municipalityCode,
                mainActivity,
                sex,
                age,
                values
            }
            dataset.push(eachMunicipality);
        }
    } else {
        console.error('Failed to fetch data.');
    }

    return dataset;
}

async function fetchMunicipalityCode() {
    try {
        const response = await fetch('https://statfin.stat.fi/PxWeb/api/v1/en/StatFin/synt/statfin_synt_pxt_12dy.px');
        if (!response.ok) {
            console.error('Failed to fetch data.');
            return;
        }

        const data = await response.json();
        const codes = data.variables[1].values;
        const names = data.variables[1].valueTexts;

        return [codes, names];
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

const savedMunicipalityName = localStorage.getItem('municipalityName');

const inputElement = document.getElementById('municipality-name');
if (inputElement) {
    inputElement.value = savedMunicipalityName;
}

document.getElementById('select-data-form').addEventListener('submit', async function (event) {
    event.preventDefault();

    const municipalityName = document.getElementById('municipality-name').value;
    const mainActivity = document.getElementById('main-activity').value;
    const sex = document.getElementById('sex').value;
    const age = document.getElementById('age').value;
    const municipalityNames = (await fetchMunicipalityCode())[1];

    //check if the municipality name is correct
    if (!municipalityName || findMunicipality(municipalityName, municipalityNames) === false) {
        alert("Please enter the correct municipality name." +
            "If you want to see data for the whole country, enter 'whole country'");
        return;
    }

    const stratYear = parseInt(document.getElementById('startYearInput').value);
    const endYear = parseInt(document.getElementById('endYearInput').value);

    //check the year input
    if (stratYear < 1987 || stratYear > 2021 || endYear < 1987 || endYear > 2021) {
        alert("Please enter a valid year between 1987 and 2021.");
        return;
    } else if (stratYear > endYear) {
        alert("The start year is less than the end year, please re-enter.");
        return;
    }
    //define the year range
    const yearRange = Array.from({ length: endYear - stratYear + 1 }, (_, index) => stratYear + index);

    const municipalityCodes = (await fetchMunicipalityCode())[0];

    const codesJSON = JSON.stringify(municipalityCodes);
    localStorage.setItem("codes", codesJSON);

    const dataset = await getdata(municipalityCodes, mainActivity, sex, age);
    // const datasetJSON = JSON.stringify(dataset);
    // localStorage.setItem('dataset', datasetJSON);
    console.log('2', datasetArray);

    addToDataList(dataset, municipalityName, yearRange);

    if (datasetArray.length != 0) {
        document.getElementById("data-list-container").style.display = "block";
    }

    // document.getElementById("to-map").style.display = "block";
});



function findMunicipality(municipalityName, municipalityNames) {
    const index = municipalityNames.findIndex((name) => {
        return name.toUpperCase() === municipalityName.toUpperCase();
    });

    if (index === -1) {
        return false;
    } else {
        return true;
    }
}

function addToDataList(dataset, municipalityName, yearRange) {
    let currentID = datasetArray.length;

    const newItem = {
        ID: currentID,
        dataset,
        municipalityName,
        yearRange
    };

    datasetArray.push(newItem);

    const dataListContainer = document.getElementById("data-list-container");

    const dataItem = document.createElement("div");

    const content = setPopupContent(dataset[0], currentID, municipalityName, yearRange);
    dataItem.textContent = content;

    dataItem.setAttribute("draggable", true);

    dataListContainer.appendChild(dataItem);

    dataItem.addEventListener("dragstart", function (event) {
        const datasetID = event.target.textContent.split("\n")[0].slice(4) - 1;
        event.dataTransfer.setData("ID", datasetID);
    });

}

function setPopupContent(city, currentID, municipalityName, yearRange) {

    const activityMap = {
        'SSS': 'Total population',
        '11+12': 'Labour force',
        '11': 'Employed',
        '12': 'Unemployed',
        '21-99': 'Persons outside the labour force',
        '21': '0-14 years old',
        '22': 'Students, pupils',
        '25': 'Conscripts, persons in non-military service',
        '24+29': 'Pensioners',
        '99': 'Other persons outside the labour force'
    };

    const genderMap = {
        'SSS': 'All genders',
        '1': 'Males',
        '2': 'Females'
    };

    const ageMap = {
        'SSS': 'All ages',
        '0-17': '0 - 17',
        '18-64': '18 - 64',
        '65-': '65 -'
    };

    const activity = activityMap[city.mainActivity];
    const gender = genderMap[city.sex];
    const age = ageMap[city.age];

    return `Data${currentID + 1}
            ${municipalityName}
            (${yearRange[0]}-${yearRange[yearRange.length - 1]}),
            ${activity},
            ${gender},
            ${age}
            `;
}

function updataContents(datasetArray) {
    const dataListContainer = document.getElementById("data-list-container");

    while (dataListContainer.firstChild) {
        dataListContainer.removeChild(dataListContainer.firstChild);
    }

    const labelElement = document.createElement("label");

    labelElement.id = "clear-list-label";
    labelElement.setAttribute("for", "clear-list");
    labelElement.textContent = "Obtained data list";

    const button = document.createElement("button");
    button.id = "clear-list";
    button.textContent = "Clear list";

    dataListContainer.appendChild(labelElement);
    dataListContainer.appendChild(button);

    for (let i = 0; i < datasetArray.length; i++) {
        const dataItem = document.createElement("div");
        const item = datasetArray[i];

        const yearRange = item.yearRange;

        dataItem.textContent = setPopupContent(item.dataset[0], i, item.municipalityName, yearRange);
        dataItem.setAttribute("draggable", true);
        dataListContainer.appendChild(dataItem);

        dataItem.addEventListener("dragstart", function (event) {
            const datasetID = event.target.textContent.split("\n")[0].slice(4) - 1;
            event.dataTransfer.setData("ID", datasetID);
        });
    }
}

function allowDrop(event) {
    event.preventDefault();
}

function handleDropChart(event) {
    event.preventDefault();

    const ID = event.dataTransfer.getData("ID");
    const targetDataset = datasetArray.find((eachDataset) => {
        return eachDataset.ID === parseInt(ID);
    });

    const municipalityName = targetDataset.municipalityName;
    const yearRange = targetDataset.yearRange;
    const dataset = targetDataset.dataset;

    applyChartView(dataset, municipalityName, yearRange);
}

function handleDropMap(event) {
    event.preventDefault();

    const ID = event.dataTransfer.getData("ID");
    const targetDataset = datasetArray.find((eachDataset) => {
        return eachDataset.ID === parseInt(ID);
    });

    const municipalityName = targetDataset.municipalityName;
    const yearRange = targetDataset.yearRange;
    const dataset = targetDataset.dataset;

    applyMapView(dataset, municipalityName, yearRange);
}


function applyChartView(dataset, municipalityName, yearRange) {
    document.getElementById("chart-view").style.display = "block";

    const specificMunicipality = dataset.find((eachCity) => {
        return eachCity.municipalityName.toUpperCase() === municipalityName.toUpperCase();
    });

    if (!specificMunicipality) {
        alert("The specified municipality cannot be found, please re-enter the correct name.");
        return;
    }

    const rawData = specificMunicipality.values;
    const neededValues = rawData.slice(yearRange[0] - 1987, yearRange[yearRange.length - 1] - 1987 + 1);
    // console.log(yearRange);
    const chartContainer = document.getElementById('chart');

    const chart = new frappe.Chart(chartContainer, {
        data: {
            labels: yearRange,
            datasets: [
                {
                    values: neededValues,
                    chartType: 'line',
                },
            ]
        },
        colors: ['#8552a1'],
        title: 'Population data for your specified area',
        height: 450,
        axisOptions: {
            x: {
                type: "category",
                label: "Month",
                tickLabel: {
                    color: "red",
                }
            },
            y: {
                label: "Value",
                tickLabel: {
                    color: "blue",
                }
            },
        },
        lineOptions: {
            regionFill: 1,
            regionOpacity: 0.2,
            hideDots: false,
        },
    });

    document.getElementById('download-image').addEventListener('click', function (event) {
        event.preventDefault();
        chart.export();
    });
}

function applyMapView(dataset, municipalityName) {
    const datasetJSON = JSON.stringify(dataset);
    localStorage.setItem('dataset', datasetJSON);

    localStorage.setItem('municipalityName', municipalityName);

    localStorage.setItem('datasetArray', JSON.stringify(datasetArray));

    window.location.href = "./map.html";
}



document.getElementById("to-emp").addEventListener('click', function (event) {
    event.preventDefault();
    localStorage.setItem('datasetArray', JSON.stringify(datasetArray));

    window.location.href = "./emp.html";
});

//auto fill the input box with "whole country"
const municipalityInput = document.getElementById("municipality-name");
const fillWholeCountryButton = document.getElementById("fillWholeCountry");

fillWholeCountryButton.addEventListener("click", function () {
    municipalityInput.value = "whole country";
});
