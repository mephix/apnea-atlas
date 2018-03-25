console.log('started loading atlas_tmp.js script');

// variables with global scope
var data, atlasParams, map

// cms records whether callbackMessages have been received 
var cms = {}
cms.centerAndAddMarkers = {
  data_ready: false,
  map_ready:  false,
  oms_ready:  false,
}
cms.addNavionicsToMap = {
  navionics_ready: false,
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
        // set the parameters for the atlas based on its type
		if (!data.atlasType) throw('wix must supply an atlas type');
        atlasParams = setAtlasParams({atlasType: data.atlasType});

		// load map from Google
		if (!data.googleKey) throw('wix must supply a google Api Key');
		//console.log(data.googleKey)
        loadAtlasScripts({
          src: 'https://maps.googleapis.com/maps/api/js?libraries=places&key=' + data.googleKey,
          callback: initializeMap,
        });

        // load depth layer from Navionics	
        // !! HAVENT ADDED IMAGES TO DATAROOT OF BODY
        // data-root="https://webapiv2.navionics.com/dist/webapi/images" 
		if (!data.navionicsKey) throw('wix must supply a Navionics Key');
		if (atlasParams.navionics) {
		  console.log('calling navionics script')
          loadAtlasScripts({
            src: 'https://webapiv2.navionics.com/dist/webapi/webapi.min.no-dep.js',
            callback: ()=>{addNavionicsToMap({message: 'navionics ready'});},
          });
          loadAtlasStylesheets({
            src: 'https://webapiv2.navionics.com/dist/webapi/webapi.min.css',
          });
		}

        // load overlapping marker spiderfier
        loadAtlasScripts({
          src: 'https://cdnjs.cloudflare.com/ajax/libs/OverlappingMarkerSpiderfier/1.0.3/oms.min.js',
          callback: ()=>{centerAndAddMarkers({callbackMessage: 'oms ready'});},
        });

		// subsequent messages will no longer be initialLoads
		initialLoad = false;       	      
      }

      // [callback]
      centerAndAddMarkers({callbackMessage: 'data ready'});
	}
  }
)

var oms, infoWindow;
function centerAndAddMarkers ({callbackMessage}) {
  // check prerequisites
  if (callbackMessage==='data ready') cms.centerAndAddMarkers.data_ready = true;
  if (callbackMessage==='map ready')  cms.centerAndAddMarkers.map_ready  = true;
  if (callbackMessage==='oms ready')  cms.centerAndAddMarkers.oms_ready  = true;
  if (!(cms.centerAndAddMarkers.data_ready && 
        cms.centerAndAddMarkers.map_ready && 
        cms.centerAndAddMarkers.oms_ready)) 
    return;

  // first type of map: markers are supplied and we are displaying them
  // eg atlas, divesite, pool, school, events
  if (atlasParams.markersSupplied) {

    if (!infoWindow) {
      // initialize a single infoWindow
      // re-using this window ensures only one will be open at a time
      infoWindow = new google.maps.InfoWindow();
      // close this window whenever the map is clicked
      google.maps.event.addListener(map, 'click', (e)=>{infoWindow.close();});
    }

    // if this is the first post of data, initialize a markerSpiderfier
    // otherwise, remove all the old markers from the last post
    if (!oms) {
      oms = new OverlappingMarkerSpiderfier(map, {
          markersWontMove: true,
          markersWontHide: true,
          basicFormatEvents: false,
      });
    } else {
      oms.removeAllMarkers;
    }

    // add all the markers to the map
    // using 'let' with i is important for async
    for (let i = 0; i < data.markers.length; i++) {
      // create new marker
      let marker = new google.maps.Marker({
          title: data.markers[i].name,
      });
      // set position and icon
      marker.setPosition({'lat': data.markers[i].lat, 'lng': data.markers[i].lng});
      marker.setIcon(data.markers[i].icon);

      // display info when clicked with 'spider_click'
      google.maps.event.addListener(marker, 'spider_click',
          function (e) {
              infoWindow.setContent(data.markers[i].info);
              infoWindow.open(map, marker);
          }
      );

      // add dot to icon when spiderfiable but not spiderfied
      google.maps.event.addListener(marker, 'spider_format', 
        function(status) {
          marker.setIcon({
              url: status == OverlappingMarkerSpiderfier.markerStatus.SPIDERFIABLE
                       ? data.markers[i].iconSpiderfiable
                       : data.markers[i].icon,
      })});

      // add marker to markerSpiderifier and therefore the map
      oms.addMarker(marker);
    }
  } else { // markers not supplied
  // second type of map: we are using the map to get input
  // eg +Add divesite, divesite parking, pool, etc 

    if (draggable) {
      // initialize a draggable marker
      draggableMarker = new google.maps.Marker({
          position: map.center,
          draggable: true,
      });
      draggableMarker.setMap(map);

      // listen to where the marker is dragged
      google.maps.event.addListener(draggableMarker, 'dragend', function(e) {
        window.parent.postMessage([e.latLng.lat(),e.latLng.lng()], "*");
        map.setCenter(draggableMarker.position);
      });

    } else {
        // !! have a placeId search box here !!	
    }
  }
}

function initializeMap() {
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

  // [callback]
  if (atlasParams.navionics) addNavionicsToMap({callbackMessage:'map ready'});
	
  // [callback]
  centerAndAddMarkers({callbackMessage: 'map ready'});
}

function addNavionicsToMap({callbackMessage}) {
  // check prerequisites
  if (callbackMessage==='navionics ready')  {cms.addNavionicsToMap.navionics_ready = true;
console.log('addNavionicsToMapreceived navionics_ready')}
  if (callbackMessage==='map ready')        {cms.addNavionicsToMap.map_ready  = true;
console.log('addNavionicsToMapreceived map_ready')}

  if (!(cms.addNavionicsToMap.navionics_ready && 
        cms.addNavionicsToMap.map_ready)) 
    return;
  if (!data.navionicsKey) throw('wix must supply a Navionics key');

console.log('entering addNavionicsToMap')

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

function loadAtlasScripts({src,callback}) {
  var script = document.createElement('script');
  script.type = 'text/javascript';
  script.async = true;
  script.defer = true;
  script.src = src;
  script.onload = callback;
  document.body.appendChild(script);
}

function loadAtlasStylesheets({src}) {
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
  switch (atlasType) {
    case 'atlas':
      atlasParams.maptype = 'satellite';
      atlasParams.zoom = DEFAULT_ZOOM;
      atlasParams.navionics = false;
      atlasParams.markersSupplied = true;
      atlasParams.draggable = false;
      break;

    case 'show divesite':
      atlasParams.maptype = 'satellite';
      atlasParams.zoom = 13;
      atlasParams.navionics = true;
      atlasParams.markersSupplied = true;
      atlasParams.draggable = false;
      break;

    case 'show place':
      atlasParams.maptype = 'roadmap';
      atlasParams.zoom = 13;
      atlasParams.navionics = false;
      atlasParams.markersSupplied = true;
      atlasParams.draggable = false;
      break;

    case 'add place':
      atlasParams.maptype = 'roadmap';
      atlasParams.zoom = DEFAULT_ZOOM;
      atlasParams.navionics = false;
      atlasParams.markersSupplied = false;
      atlasParams.draggable = false;
      break;

    case 'add divesite':
      atlasParams.maptype = 'satellite';
      atlasParams.zoom = DEFAULT_ZOOM;
      atlasParams.navionics = true;
      atlasParams.markersSupplied = false;
      atlasParams.draggable = true;
      break;

    case 'add divesite parking':
      atlasParams.maptype = 'roadmap';
      atlasParams.zoom = 14;
      atlasParams.navionics = false;
      atlasParams.markersSupplied = false;
      atlasParams.draggable = true;
      break;

      default:
          throw('the atlasType ' + atlasType + ' supplied by wix is not valid');
  }
  atlasParams.center = DEFAULT_CENTER;
  return atlasParams;
}