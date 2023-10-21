const map = L.map('map', {
    minZoom: -3,
    layers: [
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        })
    ]
});

let year = parseInt(localStorage.getItem('year'));

const codesJSON = localStorage.getItem('codes');
const municipalityCodes = JSON.parse(codesJSON);
showMap();

async function getdata(municipalityCodes) {
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
                    "values": [
                        "11+12",
                        "11",
                    ]
                }
            },
            {
                "code": "Sukupuoli",
                "selection": {
                    "filter": "item",
                    "values": [
                        "SSS"
                    ]
                }
            },
            {
                "code": "Ikä",
                "selection": {
                    "filter": "item",
                    "values": [
                        "SSS"
                    ]
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

        for (let i = 0, j = 0; j < data.size[0]; i += 2, j++) {
            let municipalityName = Object.values(data.dimension.Alue.category.label)[j];

            const labourForce = totalValue.slice(i * 35, (i + 1) * 35);
            const employed = totalValue.slice((i + 1) * 35, (i + 2) * 35);

            const employmentRatio = labourForce.map((labourForce, index) => {
                return (employed[index] / labourForce) * 100;
            });

            dataset.push({
                municipalityName,
                labourForce,
                employed,
                employmentRatio
            });
        }
    } else {
        console.error('Failed to fetch data.');
    }

    return dataset;
}

function getColor(value) {
    let hue = value ** 3 * 900;
    return `hsl(${hue}, 75%, 50%) `;
}

async function showMap() {
    const dataset = await getdata(municipalityCodes);
    // console.log(dataset);

    const response = await fetch('https://geo.stat.fi/geoserver/wfs?service=WFS&version=2.0.0&request=GetFeature&typeName=tilastointialueet:kunta4500k&outputFormat=json&srsName=EPSG:4326');
    const mapData = await response.json();

    const geojsonLayer = L.geoJSON(mapData, {
        weight: 2,
        onEachFeature: function (feature, layer) {
            // console.log(dataset);
            const municipalityName = feature.properties.nimi;
            const municipality = dataset.find((data) => data.municipalityName === municipalityName);
            // console.log('Now', localStorage.getItem('municipalityName'));

            if (municipality) {
                layer.on('click', function () {
                    localStorage.setItem('municipalityName', municipalityName);
                    // console.log('Now', localStorage.getItem('municipalityName'));
                    let popupContent = setPopupContent(municipality);
                    layer.bindPopup(popupContent).openPopup();
                });
            }

            layer.bindTooltip(municipalityName, { permanent: false, direction: 'auto' });
        }
    }).addTo(map);

    function setPopupContent(municipality) {

        const index = year - 1987;
        const municipalityName = municipality.municipalityName;
        const labourForce = municipality.labourForce[index];
        const employed = municipality.employed[index];
        const employmentRatio = municipality.employmentRatio[index].toFixed(2);

        return `
                ${municipalityName}<br>
                labourForce: ${labourForce}<br>
                employed: ${employed}<br>
                employmentRatio: ${employmentRatio}%<br>
                <button onclick="window.location.href='./index.html'">Chart view for this municipality</button>
            `;
    }

    map.fitBounds(geojsonLayer.getBounds());

    const searchInput = document.getElementById('city-input');
    const searchButton = document.getElementById('submit-city');

    const yearInput = document.getElementById('year-input');
    const setYear = document.getElementById('set-year');

    let searchResultLayer = L.layerGroup();
    searchResultLayer.addTo(map);

    setYear.addEventListener('click', function (event) {
        event.preventDefault();
        year = parseInt(yearInput.value);

        if (year < 1987 || year > 2021) {
            alert("Please enter a valid year between 1987 and 2021.");
            return;
        }

        geojsonLayer.setStyle(function (feature) {
            const municipalityName = feature.properties.nimi;
            const municipality = dataset.find((municipality) => municipality.municipalityName === municipalityName);
            const index = year - 1987;
            let employmentRatio = 0.5;
            if (municipality) {
                employmentRatio = municipality.employmentRatio[index];
            }

            return {
                fillColor: getColor(employmentRatio),
                color: 'black',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.7
            };
        });

    });

    searchButton.addEventListener('click', function (event) {
        event.preventDefault();
        const searchTerm = searchInput.value;
        const matchingFeature = findMatchingFeature(searchTerm);

        searchResultLayer.clearLayers();

        if (matchingFeature) {
            const geometry = matchingFeature.geometry;
            const polygon = L.geoJSON(geometry);

            const municipalityName = matchingFeature.properties.nimi;
            localStorage.setItem('municipalityName', municipalityName);
            const municipality = dataset.find((data) => data.municipalityName === municipalityName);

            const popupContent = setPopupContent(municipality);

            searchResultLayer.addLayer(polygon);
            polygon.bindPopup(popupContent);
            polygon.openPopup();
            map.fitBounds(polygon.getBounds(), { maxZoom: 7 });
        } else {
            alert("The specified municipality was not found, please re-enter.");
            return;
        }
    });

    function findMatchingFeature(searchTerm) {
        for (const feature of mapData.features) {
            if (feature.properties.nimi.toLowerCase() === searchTerm.toLowerCase()) {
                return feature;
            }
        }
        return null;
    }
}

document.getElementById("to-index").addEventListener('click', function (event) {
    event.preventDefault();
    window.location.href = "./index.html";
});

// document.getElementById("to-map").addEventListener('click', function (event) {
//     event.preventDefault();
//     window.location.href = "./map.html";
// });