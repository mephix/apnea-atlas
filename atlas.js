 /* sequence of actions (implicit or explicit callbacks indented):
         body onLoad
         -> ready() message to backend
            -> onmessage receives data back from backend
                -> loadScript loads google maps script
                    -> initMap creates map & adds Navionics
                        -> addDataToMap
                -> addDataToMap
            
        ... after both calls to addDataToMap, it starts adding the data
      */

      console.log('started loading apnea_map.js script');
      
      // map is a Google Maps object containing the Atlas
      var map;
      
      // mapData is an array containing all the mapable items from our database
      var mapData;

      // infoWindow is the variable (re-) used to create an info window for any item that is clicked
      var infoWindow;
      
      // overlapping marker spiderifier
      var oms;
      
      /*******************************************************************************************
       *
       *                                  SITE INITIALIZATION
       *
       * ****************************************************************************************/
       
      // let the backend know when the body of the site has loaded
      function ready(){
        //console.log('body became ready and posted ready msg to $w')
        window.parent.postMessage({"type":"ready"}, "*");
      }
      
      /// define what to do when we receive the information from the backend
      var apiKeyDataAlreadyReceived = false, mapDataAlreadyReceived = false;
      window.onmessage = (event) => {
        if (event.data) {
          let someData = JSON.parse(event.data);
          
          // receive API key to initialize map
          if (typeof(someData)==='string') {
            //console.log('html1 received $w API KEY');
            //console.log(someData);
            if (!apiKeyDataAlreadyReceived) {
              const GOOGLE_API_KEY = someData;
              apiKeyDataAlreadyReceived = true;
              loadScript(GOOGLE_API_KEY);
            } else {
              //console.log(' but apiKey already received')
            }
          // otherwise this is map data so add the data to the map
          } else {
            //console.log('html1 received $w mapData')
            if (!mapDataAlreadyReceived) {
              mapData = someData;
              //console.log(mapData);
              mapDataAlreadyReceived = true;
              //console.log('data ready callback to addDataToMap')
              addDataToMap();
            } else {
              //console.log(' but mapData already received')
            }
          }
        }
      }
      
      // define how to load the google maps script once we have the API KEY
      function loadScript(key) {
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.async = true;
        script.defer = true;
        script.src = 'https://maps.googleapis.com/maps/api/js?' +
                     'libraries=places&callback=initMap&key=' + key;
        document.body.appendChild(script);
        //console.log(script);
      }

      /*******************************************************************************************
       *
       *                                  MAP
       *
       * ****************************************************************************************/
       
      function initMap() {
        //console.log('entering initMap');
        // map options
        // 'greedy' zooms the map once the cursor has scrolled onto it, vs. 'cooperative'
        mapOptions = {
          zoom: 2.15,
          center: {lat: 0, lng: 24},
          gestureHandling: 'cooperative',
          zoomControl: true,
          mapTypeControl: true,
          fullscreenControl: true,
          scaleControl: false,
          streetViewControl: false,
          rotateControl: false,
        };
        
        // create the map
        map = new google.maps.Map(document.getElementById('map'),mapOptions);

        // add diving depth
        //addNavionicsToMap();
        
        // callback: add the database data to the map
        //console.log('initMap callback to addDataToMap');
        addDataToMap();
      }

      // how to add the Navionics depth overlay to the map
      function addNavionicsToMap() {
        var divingDepthLayer = new JNC.Google.NavionicsOverlay({
          navKey:     "Navionics_webapi_03362",
          chartType:  JNC.Google.NavionicsOverlay.CHARTS.SONAR, //NAUTICAL,
          depthUnit:  JNC.DEPTH_UNIT.METERS,
          depthLevel: JNC.SAFETY_DEPTH_LEVEL.METERS_20,
        });
        //console.log('Adding the Navionics overlay to the map...');
        map.overlayMapTypes.insertAt(0,divingDepthLayer);
      }

      // how to add data to the map
      var nCallbacks = 0;
      async function addDataToMap() {
        // only addDataToMap once both the map and the mapData are ready
        // and have made the callback to addDataToMap
        if (++nCallbacks < 2) return;
        //console.log('starting addDataToMap, nCallbacks = ' + nCallbacks);

        // initialize a single infoWindow
        // re-using this window ensures only one will be open at a time
        infoWindow = new google.maps.InfoWindow();
        
        // close this window whenever the map is clicked
        google.maps.event.addListener(map, 'click', (e)=>{infoWindow.close();});
        //console.log(infoWindow);
        
        // initialize the markerSpiderfier
        oms = new OverlappingMarkerSpiderfier(map, {
          markersWontMove: true,
          markersWontHide: true,
          basicFormatEvents: false,
        });
        
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
          // display info when clicked
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
          });
          // add marker to markerSpiderifier and therefore the map
          oms.addMarker(marker);
        }
      }

      console.log('finished loading apnea_map.js script');
