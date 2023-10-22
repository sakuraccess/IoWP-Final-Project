const map = L.map('map', {
    minZoom: -3,
    layers: [
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        })
    ]
});

const dataset = getDataset();
let ifPressSetYear = false;

function getDataset() {
    const datasetJSON = localStorage.getItem('dataset');
    return JSON.parse(datasetJSON);
}

showMap(dataset);

async function showMap(dataset) {
    const response = await fetch('https://geo.stat.fi/geoserver/wfs?service=WFS&version=2.0.0&request=GetFeature&typeName=tilastointialueet:kunta4500k&outputFormat=json&srsName=EPSG:4326');
    const mapData = await response.json();
    let yearIndex;

    const geojsonLayer = L.geoJSON(mapData, {
        weight: 2,
        onEachFeature: function (feature, layer) {
            const municipalityName = feature.properties.nimi;
            const municipality = dataset.find((data) => data.municipalityName === municipalityName);

            if (municipality) {
                layer.on('click', function () {
                    localStorage.setItem('municipalityName', municipalityName);
                    let popupContent = setPopupContent(municipality);
                    layer.bindPopup(popupContent).openPopup();
                });
            }

            layer.bindTooltip(municipalityName, { permanent: false, direction: 'auto' });
        }
    }).addTo(map);

    map.fitBounds(geojsonLayer.getBounds());


    const yearInput = document.getElementById('year-input');
    const setYear = document.getElementById('set-year');

    const municipalityInput = document.getElementById('city-input');
    const searchMunicipality = document.getElementById('submit-city');

    const searchResultLayer = L.layerGroup();
    searchResultLayer.addTo(map);

    setYear.addEventListener('click', function (event) {
        event.preventDefault();
        const year = parseInt(yearInput.value);

        if (year < 1987 || year > 2021) {
            alert("Please enter a valid year between 1987 and 2021.");
            return;
        }

        yearIndex = year - 1987;
        localStorage.setItem('year', year);

        geojsonLayer.setStyle(function (feature) {
            const municipalityName = feature.properties.nimi;
            const municipalityIndex = dataset.findIndex((municipality) => municipality.municipalityName === municipalityName);

            return {
                fillColor: getColor(municipalityIndex, yearIndex),
                weight: 2,
                opacity: 1,
                color: 'white',
                dashArray: '3',
                fillOpacity: 0.7
            };
        });

        ifPressSetYear = true;
    });

    searchMunicipality.addEventListener('click', function (event) {
        event.preventDefault();
        if (ifPressSetYear == false) {
            alert("Please first select the year you want to view the data distribution.");
            return;
        }

        const municipalitySearchTerm = municipalityInput.value;

        const matchingFeature = findMatchingFeature(municipalitySearchTerm);

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

    function findMatchingFeature(municipalitySearchTerm) {
        for (const feature of mapData.features) {
            if (feature.properties.nimi.toLowerCase() === municipalitySearchTerm.toLowerCase()) {
                return feature;
            }
        }
        return null;
    }

    function setPopupContent(municipality) {
        if (!yearIndex) {
            const popupContent = `
                ${municipality.municipalityName}<br>
            `;
            return popupContent;
        }

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

        const activity = activityMap[municipality.mainActivity];
        const gender = genderMap[municipality.sex];
        const age = ageMap[municipality.age];

        return `
                ${municipality.municipalityName}<br>
                Gender: ${gender}<br>
                Age group: ${age}<br>
                Activity: ${activity}<br>
                Specified number of people: ${municipality.values[yearIndex]}<br>
            `;

    }

    function getColor(municipalityIndex, yearIndex) {
        if (municipalityIndex == -1) {
            return `hsl(0, 75%, 50%) `;
        }

        const datasetWithoutFirstValue = dataset.slice(1);

        const selectYearValue = datasetWithoutFirstValue.map(function (item) {
            return item.values[yearIndex];
        });

        const mean = selectYearValue.reduce((acc, val) => acc + val, 0) / selectYearValue.length;
        const standardDeviation = Math.sqrt(selectYearValue.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / selectYearValue.length);

        const zScoreData = selectYearValue.map(x => (x - mean) / standardDeviation);

        const zMin = Math.min(...zScoreData);
        const zMax = Math.max(...zScoreData);

        const normalizedData = zScoreData.map(z => (z - zMin) / (zMax - zMin));

        const frequency = 4;
        const amplitude = 200;
        const hue = 120 + amplitude * Math.sin(2 * Math.PI * frequency * normalizedData[municipalityIndex]);
        return `hsl(${hue}, 50%, 50%) `;
    }


    document.getElementById("to-index").addEventListener('click', function (event) {
        event.preventDefault();
        window.location.href = "./index.html?source=map";
    });

}