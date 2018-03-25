// createInfoDisplay provides a different information window display for each type of item
// (school, dive site, etc)
// with defaults for any missing fields

function createInfoDisplay(mapData_i) {
	var name = mapData_i.name ? mapData_i.name : '';
	var name_with_link = mapData_i.dynamic_page
                        ? ('<a href="https://www.apneaatlas.com' + mapData_i.dynamic_page + '" target = "_blank">' + name + '</a><br>')
                        : (name + '<br>');
	var lat = mapData_i.lat ? mapData_i.lat : 0;
	var lng = mapData_i.lng ? mapData_i.lng : 33;

	var open_in_maps = '<br><a href="https://www.google.com/maps/search/?api=1&query='
						+ lat + '%2C' + lng + '" target = "_blank">Open in Maps</a><br>';
  /*
  var open_in_maps = '<br><a href="https://www.google.com/maps/place/'
                      + ((mapData_i.position.lat>0) ? (mapData_i.position.lat + 'N') : (-mapData_i.position.lat + 'S'))
                      + '+'
                      + ((mapData_i.position.lng>0) ? (mapData_i.position.lng + 'E') : (-mapData_i.position.lng + 'W'))
                      + '/">Open in Maps</a><br>';
  */

  var content;
  switch (mapData_i.type) {
    case 'school':
      content =  '<div>'
                  + name_with_link
                  + (mapData_i.place ? (mapData_i.place.international_phone_number + '<br>') : '')
                  + (mapData_i.place ? ('Reviewer Rating: ' + mapData_i.place.rating + ' stars' + '<br>') : '')
                  + open_in_maps
                  + '</div>';
      break;
      
    case 'pool':
      content =  '<div>'
                  + name_with_link
                  + (mapData_i.place ? (mapData_i.place.formatted_address + '<br>') : '')
                  + (mapData_i.place ? (mapData_i.place.international_phone_number + '<br>') : '')
                  + (mapData_i.place ? (mapData_i.place.website + '<br>') : '')
                  + open_in_maps
                  + '</div>';
      break;
      
    case 'event':
      content =  '<div>'
                  + name_with_link
                  + (mapData_i.compType ? (mapData_i.compType + '<br>') : '')
                  + (mapData_i.startDate ? ('starting on: ' + mapData_i.startDate + '<br>') : '')
                  + open_in_maps
                  + '</div>';

      break;

    case 'site':
      content =  '<div>'
                  + name_with_link
                  + (mapData_i.depth ? ('depth: ' + mapData_i.depth + 'm' + '<br>') : '')
                  + (mapData_i.waterTemperature ? ('water temperature: ' + mapData_i.waterTemperature + 'C' + '<br>') : '')
                  + open_in_maps
                  + '</div>';
      break;

    case 'parking':
      content =  '<div>'
                  + 'parking'
                  + open_in_maps
                  + '</div>';
      break;

  	default:
    	content = '<div>'
                  + name_with_link
                  + '</div>';
  		break;
  }
  return content;
}