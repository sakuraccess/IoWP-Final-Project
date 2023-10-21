const chartContainer = document.getElementById('chart');

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

        return codes;
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

const savedMunicipalityName = localStorage.getItem('municipalityName');

const inputElement = document.getElementById('municipality-name');
if (inputElement) {
    inputElement.value = savedMunicipalityName;
    console.log("ok");
}

document.getElementById('select-data-form').addEventListener('submit', async function (event) {
    event.preventDefault();
    document.getElementById("chart-container").style.display = "block";

    const municipalityName = document.getElementById('municipality-name').value;
    const mainActivity = document.getElementById('main-activity').value;
    const sex = document.getElementById('sex').value;
    const age = document.getElementById('age').value;

    if (!municipalityName) {
        alert("Please enter the correct municipality name." +
            "If you want to see data for the whole country, enter 'whole country'");
        return;
    }

    const stratYear = parseInt(document.getElementById('startYearInput').value);
    const endYear = parseInt(document.getElementById('endYearInput').value);

    if (stratYear < 1987 || stratYear > 2021 || endYear < 1987 || endYear > 2021) {
        alert("Please enter a valid year between 1987 and 2021.");
        return;
    }

    if (stratYear > endYear) {
        alert("The start year is less than the end year, please re-enter.");
        return;
    }

    const yearRange = Array.from({ length: endYear - stratYear + 1 }, (_, index) => stratYear + index);

    const municipalityCodes = await fetchMunicipalityCode();
    const codesJSON = JSON.stringify(municipalityCodes);
    localStorage.setItem("codes", codesJSON);

    const dataset = await getdata(municipalityCodes, mainActivity, sex, age);
    const datasetJSON = JSON.stringify(dataset);
    localStorage.setItem('dataset', datasetJSON);

    const specificMunicipality = dataset.find((eachCity) => {
        return eachCity.municipalityName.toUpperCase() === municipalityName.toUpperCase();
    });

    if (!specificMunicipality) {
        alert("The specified municipality cannot be found, please re-enter the correct name.");
        return;
    }

    const rawData = specificMunicipality.values;
    const neededValues = rawData.slice(stratYear - 1987, endYear - 1987 + 1);

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
            xAxisMode: "tick",
            xIsSeries: true
        },
        lineOptions: {
            regionFill: 1,
            regionOpacity: 0.2,
            hideDots: false,
        },
    });

    document.getElementById("to-map").style.display = "block";

    document.getElementById('download-image').addEventListener('click', function (event) {
        event.preventDefault();
        chart.export();
    });
    
});

document.getElementById("to-map").addEventListener('click', function (event) {
    event.preventDefault();
    window.location.href = "./map.html";
});

document.getElementById("to-emp").addEventListener('click', function (event) {
    event.preventDefault();
    window.location.href = "./emp.html";
});

// 获取输入框和按钮元素
const municipalityInput = document.getElementById("municipality-name");
const fillWholeCountryButton = document.getElementById("fillWholeCountry");

// 添加按钮点击事件处理程序
fillWholeCountryButton.addEventListener("click", function () {
    // 自动填充输入框
    municipalityInput.value = "whole country";
});
