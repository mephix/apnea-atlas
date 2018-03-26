console.log('started loading atlas.js script');

// variables with global scope
var data, atlasParams, map, oms, infoWindow, autocomplete

// cms records whether callback messages have been received 
var cms = {}
cms.initializeMap = {
  google_ready: false,
  oms_ready:    false,  
}
cms.addNavionicsToMap = {
  navionics_ready: false,
  map_ready:  false,
}
cms.centerAndAddMarkers = {
  data_ready: false,
  map_ready:  false,
}

function ready(){
// let wix know when the map has loaded
	window.parent.postMessage({"type":"ready"}, "*");
}

var initialLoad = true;
window.addEventListener('message',
// receive information from wix
  (event) => {
	if (event.data) {
      /* data contains:
       * 	googleKey
       *	navionicsKey
       * 	mapType
       *	center
       *	markers
       */
      data = JSON.parse(event.data);

      if (initialLoad) {
        loadAtlasScriptsEtc();
        initialLoad = false;
      }

      // [callback]
      centerAndAddMarkers({callbackMessage: 'data ready'});
	}
  }
)

function centerAndAddMarkers ({callbackMessage}) {
  // check prerequisites
  if (callbackMessage==='data ready') cms.centerAndAddMarkers.data_ready = true;
  if (callbackMessage==='map ready')  cms.centerAndAddMarkers.map_ready  = true;
  if (!(cms.centerAndAddMarkers.data_ready && 
        cms.centerAndAddMarkers.map_ready)) 
    return;

  // remove any old markers
  oms.removeAllMarkers();

  // set the map center if it has been supplied
  if (data.center) {
    map.setCenter({lat: data.center.lat, lng: data.center.lng});
    console.log({lat: data.center.lat, lng: data.center.lng});
  }

  // if this is an input map (eg +Add page of the site), 
  // create an initial marker that can be dragged or moved by searching
  // for a place
  if (atlasParams.mode === 'input') {
    data.markers[0] = {
      lat: map.center.lat(),
      lng: map.center.lng(),
    }
  }

  // add new markers
  addMarkers();
}

function addMarkers() {
// add all the markers to the map
  var bounds = new google.maps.LatLngBounds();

  for (let i = 0; i < data.markers.length; i++) {
  // using 'let' with i is important for async

    // create new marker
    let marker = new google.maps.Marker({
        title: data.markers[i].name,
    });

    // set position
    marker.setPosition({'lat': data.markers[i].lat, 'lng': data.markers[i].lng});

    // set icon and add dot when spiderfiable but not spiderfied
    if (data.markers[i].icon) {
      marker.setIcon(data.markers[i].icon);
      google.maps.event.addListener(marker, 'spider_format', 
        function(status) {
          marker.setIcon({
              url: status == OverlappingMarkerSpiderfier.markerStatus.SPIDERFIABLE
                       ? data.markers[i].iconSpiderfiable
                       : data.markers[i].icon,
      })});    
    }

    // display info when clicked with 'spider_click'
    if (data.markers[i].info) {
      google.maps.event.addListener(marker, 'spider_click',
          function (e) {
              infoWindow.setContent(data.markers[i].info);
              infoWindow.open(map, marker);
          }
      );
    }
    
    if (atlasParams.mode === 'input') {
      // in input mode, listen to where the marker is dragged
      marker.setDraggable(true);
      google.maps.event.addListener(marker, 'dragend', function(e) {
        window.parent.postMessage([e.latLng.lat(),e.latLng.lng()], "*");
        map.setCenter(marker.position);
      });

      // in input mode, listen to what place is selected in the search box
      autocomplete.addListener('place_changed', function() {
        infoWindow.close();
        var place = autocomplete.getPlace();
        if (!place.geometry) {
          return;
        }

        if (place.geometry.viewport) {
          map.fitBounds(place.geometry.viewport);
        } else {
          map.setCenter(place.geometry.location);
          map.setZoom(14);
        }

        // move the marker to the selected place and show its info
        marker.setPosition(place.geometry.location);
        marker.setVisible(true);
        infoWindow.setContent('<div>' + place.name + '</div>');
        infoWindow.open(map, marker);

        // post the place to wix
        var placeId = place.place_id;
        var address = place.formatted_address;
        var lat = place.geometry.location.lat();
        var lng = place.geometry.location.lng();
        console.log('posting info from html to $w')
        console.log([placeId, address, lat,lng])
        window.parent.postMessage([placeId, address, lat,lng], "*");
      });
    }

    // add marker to markerSpiderifier and therefore the map
    oms.addMarker(marker);

    // add marker to the map's bounds
    bounds.extend(marker.getPosition());
  }

  // if zoom is specified, such as for 'add divesite' (dont zoom in on the marker)
  // or 'add divesite parking' (do zoom in on the marker), set the zoom, otherwise fit the
  // map around the markers displayed
  if (atlasParams.zoom) {
    map.setZoom(atlasParams.zoom);
  } else {
    // fit the map to the markers
    map.fitBounds(bounds);  
  }
}

function initializeMap({callbackMessage}) {
  if (callbackMessage==='google ready') cms.initializeMap.google_ready  = true;
  if (callbackMessage==='oms ready')    cms.initializeMap.oms_ready     = true;
  if (!(cms.initializeMap.google_ready && cms.initializeMap.oms_ready)) return;

  var mapOptions = {
    mapTypeId: atlasParams.maptype,
    zoom: atlasParams.zoom,
    center: atlasParams.center,
    gestureHandling: 'cooperative',
    zoomControl: true,
    mapTypeControl: true,
    fullscreenControl: true,
    scaleControl: false,
    streetViewControl: false,
    rotateControl: false,
  };

  // create the map
  map = new google.maps.Map(document.getElementById('atlas'),mapOptions);

  // initialize the input window
  var input = document.getElementById('pac-input');
  autocomplete = new google.maps.places.Autocomplete(input);
  autocomplete.bindTo('bounds', map);
  map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

  // initialize a single infoWindow
  // re-using this window ensures only one will be open at a time
  // close it whenever the map is clicked
  infoWindow = new google.maps.InfoWindow();
  google.maps.event.addListener(map, 'click', (e)=>{infoWindow.close();});

  // initialize a markerSpiderfier
  oms = new OverlappingMarkerSpiderfier(map, {
      markersWontMove: true,
      markersWontHide: true,
      basicFormatEvents: false,
  });

  // [callbacks]
  if (atlasParams.navionics) addNavionicsToMap({callbackMessage:'map ready'});
  centerAndAddMarkers({callbackMessage: 'map ready'});
}

function addNavionicsToMap({callbackMessage}) {
  // check prerequisites
  if (callbackMessage==='navionics ready')  cms.addNavionicsToMap.navionics_ready = true;
  if (callbackMessage==='map ready')        cms.addNavionicsToMap.map_ready  = true;
  if (!(cms.addNavionicsToMap.navionics_ready && 
        cms.addNavionicsToMap.map_ready)) 
    return;
  if (!data.navionicsKey) throw('wix must supply a Navionics key');

  // add the Navionics depth overlay
  var divingDepthLayer = new JNC.Google.NavionicsOverlay({
      navKey:     data.navionicsKey,
      chartType:  JNC.Google.NavionicsOverlay.CHARTS.SONAR, //NAUTICAL,
      depthUnit:  JNC.DEPTH_UNIT.METERS,
      depthLevel: JNC.SAFETY_DEPTH_LEVEL.METERS_20,
  });
  console.log('Adding the Navionics overlay to the map...');
  map.overlayMapTypes.insertAt(0,divingDepthLayer);
}

function loadAtlasScriptsEtc () {
  // set the parameters for the atlas based on its type
  if (!data.atlasType) throw('wix must supply an atlas type');
  atlasParams = setAtlasParams({atlasType: data.atlasType});

  // load map from Google
  if (!data.googleKey) throw('wix must supply a google Api Key');
  //console.log(data.googleKey)
  loadAtlasScript({
    src: 'https://maps.googleapis.com/maps/api/js?libraries=places&key=' + data.googleKey,
    callback: ()=>{initializeMap({callbackMessage: 'google ready'});},
  });

  // load depth layer from Navionics	
  // !! HAVENT ADDED IMAGES TO DATAROOT OF BODY
  // data-root="https://webapiv2.navionics.com/dist/webapi/images" 
  if (!data.navionicsKey) throw('wix must supply a Navionics Key');
  if (atlasParams.navionics) {
    console.log('calling navionics script')
    loadAtlasScript({
      src: 'https://webapiv2.navionics.com/dist/webapi/webapi.min.no-dep.js',
      callback: ()=>{addNavionicsToMap({callbackMessage: 'navionics ready'});},
    });
    loadAtlasStylesheet({
      src: 'https://webapiv2.navionics.com/dist/webapi/webapi.min.css',
    });
  }

  // load overlapping marker spiderfier
  loadAtlasScript({
    src: 'https://cdnjs.cloudflare.com/ajax/libs/OverlappingMarkerSpiderfier/1.0.3/oms.min.js',
    callback: ()=>{initializeMap({callbackMessage: 'oms ready'});},
  });
}

function loadAtlasScript({src,callback,async=true,defer=true}) {
  var script = document.createElement('script');
  script.type = 'text/javascript';
  script.async = async;
  script.defer = defer;
  script.src = src;
  script.onload = callback;
  document.body.appendChild(script);
}

function loadAtlasStylesheet({src}) {
  var link  = document.createElement('link');
  link.rel  = 'stylesheet';
  link.type = 'text/css';
  link.href = src;
  document.head.appendChild(link);
}

function setAtlasParams({atlasType}) {
  atlasParams = {};
  const DEFAULT_ZOOM = 2.15;
  const DEFAULT_CENTER = {lat: 0, lng: 24};
  atlasParams.center = DEFAULT_CENTER;
  switch (atlasType) {
    case 'atlas':
      atlasParams.maptype = 'satellite';
      //atlasParams.zoom = DEFAULT_ZOOM;
      atlasParams.navionics = false;
      atlasParams.mode = 'display';
      break;

    case 'show divesite':
      atlasParams.maptype = 'satellite';
      //atlasParams.zoom = 13;
      atlasParams.navionics = true;
      atlasParams.mode = 'display';
      break;

    case 'show place':
      atlasParams.maptype = 'roadmap';
      //atlasParams.zoom = 13;
      atlasParams.navionics = false;
      atlasParams.mode = 'display';
      break;

    case 'add place':
      atlasParams.maptype = 'roadmap';
      atlasParams.zoom = DEFAULT_ZOOM;
      atlasParams.navionics = false;
      atlasParams.mode = 'input';
      break;

    case 'add divesite':
      atlasParams.maptype = 'satellite';
      atlasParams.zoom = DEFAULT_ZOOM;
      atlasParams.navionics = true;
      atlasParams.mode = 'input';
      break;

    case 'add divesite parking':
      atlasParams.maptype = 'roadmap';
      atlasParams.zoom = 14;
      atlasParams.navionics = false;
      atlasParams.mode = 'input';
      break;

      default:
          throw('the atlasType ' + atlasType + ' supplied by wix is not valid');
  }
  return atlasParams;
}