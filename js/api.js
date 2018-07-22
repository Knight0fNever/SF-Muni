let mainMap = {};
let geoJSON = {
  type: 'FeatureCollection',
  features: []
};
let markers = [];

let intervalID = 0;

$(document).ready(function() {
  mapboxgl.accessToken =
    'pk.eyJ1Ijoia25pZ2h0MGZuZXZlciIsImEiOiJjajVobTNvaGsxN2k3MzBvMTZ5cTh4aXhwIn0.np6Q8JVkSTbNAboyr4VseA';

  mainMap = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v9',
    center: [-122.43, 37.755],
    zoom: 12
  });

  mainMap.on('load', function() {
    mainMap.addSource('muniPoints', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      }
    });

    mainMap.addLayer({
      id: 'points',
      type: 'circle',
      source: 'muniPoints',
      paint: {
        'circle-color': [
          'case',
          ['==', ['get', 'shortDirection'], 'Inbound'],
          '#0000ff',
          ['==', ['get', 'shortDirection'], 'Outbound'],
          '#ff0000',
          '#D3D3D3'
        ],
        'circle-radius': 5
      }
    });

    mainMap.on('click', function(e) {
      var features = mainMap.queryRenderedFeatures(e.point, {
        layers: ['points']
      });

      // if the features have no info, return nothing
      if (!features.length) {
        return;
      }

      var feature = features[0];

      // Populate the popup and set its coordinates
      // based on the feature found
      var popup = new mapboxgl.Popup()
        .setLngLat(feature.geometry.coordinates)
        .setHTML(
          '<div class="popup-text"><h3>' +
            'Route: ' +
            feature.properties['route'] +
            '</h3><p>' +
            'Bus ID: ' +
            feature.properties['route'] +
            feature.properties['busId'] +
            '</p>' +
            '<p>Speed: ' +
            feature.properties['speed'] +
            '</p>' +
            '<p>Direction: ' +
            feature.properties['directionId'] +
            '</p></div>'
        )
        .addTo(mainMap);
    });

    // Use the same approach as above to indicate that the symbols are clickable
    // by changing the cursor style to 'pointer'
    mainMap.on('mousemove', function(e) {
      var features = mainMap.queryRenderedFeatures(e.point, {
        layers: ['points']
      });
      mainMap.getCanvas().style.cursor = features.length ? 'pointer' : '';
    });

    mainMap.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true
      })
    );
  });
});

function getVehiclesStart() {
  clearInterval(intervalID);
  getVehicles();
  intervalID = setInterval(getVehicles, 10000);
}

function getVehicles() {
  // console.log('Clicked');
  let selectedRoute = $('#route').val();
  const url = `http://restbus.info/api/agencies/sf-muni/routes/${selectedRoute}`;
  fetch(url).then(function(response) {
    if (response.status !== 200) {
      console.warn(
        'Looks like there was a problem. Status Code: ' + response.status
      );
      return;
    }
    response.json().then(data => {
      // console.log(data);

      const vehiclesUri = `http://restbus.info/api/agencies/sf-muni/routes/${selectedRoute}/vehicles`;
      let directions = [];
      directions.push(data.directions[0]);
      directions.push(data.directions[1]);

      fetch(vehiclesUri).then(vehicleData => {
        if (vehicleData.status !== 200) {
          console.warn(
            'Looks like there was a problem. Status Code: ' + vehicleData.status
          );
          return;
        }

        vehicleData.json().then(response => {
          geoJSON = toGeoJSON(response, directions);
          mainMap.getSource('muniPoints').setData(geoJSON);
          console.log(`Updated - Route: ${selectedRoute}`);
        });
      });
    });
  });
}

function toGeoJSON(data, directions) {
  let geoJSON = {
    type: 'FeatureCollection',
    features: []
  };
  data.forEach(vehicle => {
    let direction = '';
    let shortDirection = '';
    // console.log(vehicle.directionId);
    if (vehicle.directionId != null) {
      if (vehicle.directionId.charAt(vehicle.directionId.length - 5) == 'I') {
        direction = directions[0].title;
        shortDirection = directions[0].shortTitle;
      } else {
        direction = directions[1].title;
        shortDirection = directions[1].shortTitle;
      }
    } else {
      direction = 'None';
      shortDirection = 'N/A';
    }

    geoJSON.features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [vehicle.lon, vehicle.lat]
      },
      properties: {
        icon: 'bus',
        busId: vehicle.id,
        route: vehicle.routeId,
        speed: (vehicle.kph * 0.6214).toFixed(0) + ' MPH',
        directionId: direction,
        shortDirection: shortDirection
      }
    });
  });
  return geoJSON;
}

function getRoutes() {
  let dropdown = $('#route');

  dropdown.empty();

  dropdown.append('<option selected="true" disabled>Choose Route</option>');
  dropdown.prop('selectedIndex', 0);

  const url = 'http://restbus.info/api/agencies/sf-muni/routes';

  // Populate dropdown with list of routes
  $.getJSON(url, function(data) {
    $.each(data, function(key, entry) {
      dropdown.append(
        $('<option></option>')
          .attr('value', entry.id)
          .text(entry.title)
      );
    });
  });
}

function removeDots() {
  clearInterval(intervalID);
  geoJSON = { type: 'FeatureCollection', features: [] };
  mainMap.getSource('muniPoints').setData(geoJSON);
}
