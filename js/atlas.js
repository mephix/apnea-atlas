console.log('started loading atlas.js script');

// map is a Google Maps object containing the Atlas
var map;
const DEFAULT_ZOOM = 2.15;
const DEFAULT_CENTER = {lat: 0, lng: 24};

// mapData is an array containing all the mappable items from our database
var mapData;

// infoWindow is the variable (re-) used to create an info window for any item that is clicked
var infoWindow;

// overlapping marker spiderifier
var oms;

// avoid re-loading map & its layers when data is updated
var googleMapAlreadyLoaded = false, navionicsAlreadyLoaded = false;
// for initMap:
var maptype, zoom, center, navionics, navionicsKey;
// for addMarkersToMap:
var markersSupplied, draggable, spiderfy;

function setMapInitParams({mapType,center}) {
	switch (mapType) {
		case 'atlas':
			maptype = 'SATELLITE';
			zoom = DEFAULT_ZOOM;
			navionics = false;
			markersSupplied = true;
			draggable = false;
			spiderfy = true;
			break;

		case 'add divesite':
			maptype = 'SATELLITE';
			zoom = DEFAULT_ZOOM;
			navionics = true;
			markersSupplied = false;
			draggable = true;
			spiderfy = false;
			break;

		case 'add divesite parking':
			maptype = 'ROADMAP';
			navionics = false;
			markersSupplied = false;
			draggable = true;
			spiderfy = false;
			zoom = 14;
			break;

		case 'show divesite':
			maptype = 'SATELLITE';
			navionics = true;
			markersSupplied = true;
			draggable = false;
			spiderfy = false;
			zoom = 13;
			break;

		case 'add place':
		// divesite, pool or school by placeId: no navionics, roadmap, marker not supplied, not draggable, not spiderfy
			maptype = 'ROADMAP';
			zoom = DEFAULT_ZOOM;
			navionics = false;
			markersSupplied = false;
			draggable = false;
			spiderfy = false;
			break;

		case 'show place':
		// divesite, pool or school by placeId: no navionics, roadmap, marker supplied, not draggable, not spiderfy
			maptype = 'ROADMAP';
			navionics = false;
			markersSupplied = true;
			draggable = false;
			spiderfy = false;
			zoom = 13;
			break;

		default:
			throw('the mapType ' + mapType + ' supplied by wix is not valid');
	}
	return; // this function only sets global variables
}

function ready(){
// let wix know when the map has loaded
	//console.log('map became ready and posted ready msg to wix')
	window.parent.postMessage({"type":"ready"}, "*");
}

window.onmessage = (event) => {
// receive information from wix
	if (event.data) {
		/* data contains:
		 * 	googleKey
		 *	navionicsKey
		 * 	mapType
		 *	center
		 *	mapData
		 */
		let data = JSON.parse(event.data);	
		// !! TEMP !!
		data.navionicsKey = 'Navionics_webapi_03362';
		
		// check for required params
		if (!googleMapAlreadyLoaded && !data.googleKey) throw('wix must supply a google Api Key');
		if (!navionicsAlreadyLoaded && !data.navionicsKey) throw('wix must supply a Navionics Key');
		navionicsKey = data.navionicsKey;
		
		// choose the parameters with which to initialize the map based on its type
		setMapInitParams({'mapType': data.mapType,});
		
		// if the map does not exist yet, record where its center should be
		// if it does exist, (re-) center it
		center = data.center ? data.center : DEFAULT_CENTER;
		if (map) map.setCenter(center);
								 			
		// load the map from Google (but only once)
		if (!googleMapAlreadyLoaded) {
			googleMapAlreadyLoaded = true;
			loadScript({'src': 'https://maps.googleapis.com/maps/api/js?libraries=places&key=' + data.googleKey,
									'callback': initMap,
								 });
		}
		
		// load Navionics (but only once)
		if (!navionicsAlreadyLoaded) {
			navionicsAlreadyLoaded = true;
			loadScript({'src': 'https://webapiv2.navionics.com/dist/webapi/webapi.min.no-dep.js',
									'callback': ()=>{addNavionicsToMap({message: 'navionics ready'});},
								 });
		}
		
		// set or update the mapData
		mapData = data.markers;
		addMarkersToMap({message:'markers ready'});
	}
}

function loadScript({src,callback}) {
	var script = document.createElement('script');
	script.type = 'text/javascript';
	script.async = true;
	script.defer = true;
	script.src = src;
	script.onload = callback;
	document.body.appendChild(script);
}

function initMap() {
// initialize the map and add depth if required
	//console.log('entering initMap');
	mapOptions = {
		zoom: zoom,
		center: center,
		mapTypeId: maptype,
		gestureHandling: 'cooperative',
		zoomControl: true,
		mapTypeControl: true,
		fullscreenControl: true,
		scaleControl: false,
		streetViewControl: false,
		rotateControl: false,
	};
	// 'greedy' zooms the map once the cursor has scrolled onto it, vs. 'cooperative'

	// create the map
	map = new google.maps.Map(document.getElementById('map'),mapOptions);

	// callback
	if (navionics) addNavionicsToMap({message:'map ready'});
	
	// callback
	addMarkersToMap({message:'map ready'});
}

var callback_to_addNavionicsToMap_navionicsReady = false;
var callback_to_addNavionicsToMap_mapReady = false;
function addNavionicsToMap({message}) {

	if (message=='navionics ready') callback_to_addNavionicsToMap_navionicsReady=true;
	if (message=='map ready') callback_to_addNavionicsToMap_mapReady=true;
	if !(callback_to_addNavionicsToMap_navionicsReady && callback_to_addNavionicsToMap_mapReady) return;
	if (!navionicsKey) throw('wix must supply a Navionics key');

	// add the Navionics depth overlay to the map
	var divingDepthLayer = new JNC.Google.NavionicsOverlay({
		navKey:     navionicsKey,
		chartType:  JNC.Google.NavionicsOverlay.CHARTS.SONAR, //NAUTICAL,
		depthUnit:  JNC.DEPTH_UNIT.METERS,
		depthLevel: JNC.SAFETY_DEPTH_LEVEL.METERS_20,
	});
	//console.log('Adding the Navionics overlay to the map...');
	map.overlayMapTypes.insertAt(0,divingDepthLayer);
}

var callback_to_addMarkersToMap_markersReady = false;
var callback_to_addMarkersToMap_mapReady = false;
async function addMarkersToMap({message}) {
	
	if (message=='markers ready') callback_to_addMarkersToMap_markersReady=true;
	if (message=='map ready') callback_to_addMarkersToMap_mapReady=true;
	if !(callback_to_addMarkersToMap_markersReady && callback_to_addMarkersToMap_mapReady) return;

	// initialize a single infoWindow
	// re-using this window ensures only one will be open at a time
	if (markersSupplied) {
		infoWindow = new google.maps.InfoWindow();
		// close this window whenever the map is clicked
		google.maps.event.addListener(map, 'click', (e)=>{infoWindow.close();});
	
		// initialize the markerSpiderfier
		if (spiderfy) {
			oms = new OverlappingMarkerSpiderfier(map, {
				markersWontMove: true,
				markersWontHide: true,
				basicFormatEvents: false,
			});
		}
	
		// add all the markers to the map
		// using 'let' with i is important for async
		for (let i = 0; i < mapData.length; i++) {
			// create new marker
			let marker = new google.maps.Marker({
				title: mapData[i].name,
			});
			// set position and icon
			marker.setPosition({'lat': mapData[i].lat, 'lng': mapData[i].lng});
			marker.setIcon(mapData[i].icon);
			
			if (spiderfy) {
				// display info when clicked with 'spider_click'
				google.maps.event.addListener(marker, 'spider_click',
					function (e) {
						infoWindow.setContent(mapData[i].info);
						infoWindow.open(map, marker);
					}
				);
				
				// add dot to icon when spiderfiable but not spiderfied
				google.maps.event.addListener(marker, 'spider_format', function(status) {
					marker.setIcon({
						url: status == OverlappingMarkerSpiderfier.markerStatus.SPIDERFIABLE
								 ? mapData[i].iconSpiderfiable
								 : mapData[i].icon,
					});
					
				// add marker to markerSpiderifier and therefore the map
				oms.addMarker(marker);

				} else { // do not spiderfy
					// display info when clicked
					google.maps.event.addListener(marker, 'click',
						function (e) {
							infoWindow.setContent(mapData[i].info);
							infoWindow.open(map, marker);
						}
					);
				
					// add marker to the map
					marker.setMap(map);
				}
			});
		}
	} else { // markers not supplied
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
			});

			map.setCenter(draggableMarker.position);
		} else {
			// !! have a placeId search box here !!	
		}
	}
}

console.log('finished loading apnea_map.js script');
