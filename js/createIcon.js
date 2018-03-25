// createIcon provides a different icon for each type of item
// (school, dive site, etc)
function createIcon(mapData_i) {
	var icon, iconSpiderfiable;
	switch (mapData_i.type) {
    	case 'site':
			icon = 'https://maps.google.com/mapfiles/ms/icons/blue.png';
			iconSpiderfiable = 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png';
        	break;
    	case 'parking':
			icon = 'https://maps.google.com/mapfiles/ms/icons/parkinglot.png';
			iconSpiderfiable = 'https://maps.google.com/mapfiles/ms/icons/parkinglot.png';
        	break;
    	case 'pool':
    	// !! cant find lightblue-dot -> cant mark as spiderfiable !!
        	icon = 'https://maps.google.com/mapfiles/ms/icons/lightblue.png';
			iconSpiderfiable = 'https://maps.google.com/mapfiles/ms/icons/lightblue.png';
        	break;
      	case 'school':
        	icon = 'https://maps.google.com/mapfiles/ms/icons/green.png';
			iconSpiderfiable = 'https://maps.google.com/mapfiles/ms/icons/green-dot.png';
        	break;
      	case 'trip':
        	icon = 'https://maps.google.com/mapfiles/ms/icons/plane.png';
			iconSpiderfiable = 'https://maps.google.com/mapfiles/ms/icons/plane.png';
        	break;
      	case 'event':
        	switch (mapData_i.compType.toLowerCase()) {
          		case 'depth competition':
            		icon = 'https://maps.google.com/mapfiles/ms/icons/red.png';
            		iconSpiderfiable = 'https://maps.google.com/mapfiles/ms/icons/red-dot.png';
            		break;
          		case 'pool competition':
           			icon = 'https://maps.google.com/mapfiles/ms/icons/pink.png';
            		iconSpiderfiable = 'https://maps.google.com/mapfiles/ms/icons/pink-dot.png';
            		break;
          		case 'mixed competition':
            		icon = 'https://maps.google.com/mapfiles/ms/icons/red.png';
            		iconSpiderfiable = 'https://maps.google.com/mapfiles/ms/icons/red-dot.png';
            		break;
          		case 'judge course':
            		icon = 'https://maps.google.com/mapfiles/ms/icons/orange.png';
            		iconSpiderfiable = 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png';
            		break;
         		case 'workshop/camp':
            		icon = 'https://maps.google.com/mapfiles/ms/icons/yellow.png';
            		iconSpiderfiable = 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png';
            		break;
          		default:
            		icon = 'https://maps.google.com/mapfiles/ms/icons/purple.png';
            		iconSpiderfiable = 'https://maps.google.com/mapfiles/ms/icons/purple-dot.png';
            		break;
        	}
        	break;
		default:
	        icon = 'https://maps.google.com/mapfiles/ms/icons/purple.png';
    		iconSpiderfiable = 'https://maps.google.com/mapfiles/ms/icons/purple-dot.png';
	        /* other useful ones
	        used 'https://maps.google.com/mapfiles/ms/icons/orange.png';
	        used 'https://maps.google.com/mapfiles/ms/icons/water.png';
	        'https://maps.google.com/mapfiles/ms/icons/marina.png';
	        'https://maps.google.com/mapfiles/ms/icons/plane.png';
	        'https://maps.google.com/mapfiles/ms/icons/fishing.png';
	        
	        */
	}
    return [icon,iconSpiderfiable];
  }