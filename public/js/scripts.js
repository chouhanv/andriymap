var ShpNameField = "NAME";

window.onerror=function(msg, url, linenumber){
	var logerror='Error message: ' + msg + '. \nUrl: ' + url + '\nLine Number: ' + linenumber
	alert(logerror);
	//console.log(logerror);
}


function onResize()
{
	var h = $("#content").height();
	$("#map-canvas").height(h);
}

var labelSize = 18;
var iwLabelSize = 15;
var labelXOffset = -35;
$(document).ready(function() {
	$(window).resize(function()
	{
		onResize();
	});
	onResize();
	if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
		labelSize = 30;
		iwLabelSize = 25;
		labelXOffset = -100;
	}

	initialize();
	$('html, body').on('pitchstart pitchmove', function(e){ 
		//prevent native touch activity like scrolling
		e.preventDefault(); 
	});	
});

var map;

var mapStyle = [{"featureType":"all","elementType":"all","stylers":[{"invert_lightness":true},{"saturation":10},{"lightness":30},{"gamma":0.5},{"hue":"#435158"}]}];
function initialize() {
	// create geocoder
	geocoder = new google.maps.Geocoder();
	// center map
	var houston = new google.maps.LatLng( 29.97, 95.35);
	var mapOptions = {
		zoom: 4,
		center: houston,
		mapTypeId: google.maps.MapTypeId.ROADMAP,
		minZoom:2,
		maxZoom:17,
		styles:mapStyle
	}
	map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
	
	// events for show/hide loader
	google.maps.event.addListener(map, 'dragstart', function() {
		$(loading).show();
	});
	google.maps.event.addListener(map, 'bounds_changed', function() {
		$(loading).show();
	});

	// map loading handle
	google.maps.event.addListener(map, 'idle', function() 
	{
		$(loading).hide();
	});
	
	setTimeout(function(){
		$(loading).show();
		loadStyles();
		getData();
		$(loading).hide();
	}, 300);
}
var infowindow;
var regionInfowindow;

// shows info window with region name
function showRegionName(region, pos)
{
	if(!regionInfowindow)
	{
		regionInfowindow = new InfoBox(
		{
			boxStyle: {
				border: "0px solid black"
				,textAlign: "center"
				,fontSize: labelSize + "px"
				,fontWeight: "bold"
				,width: "auto"
				,whiteSpace:"nowrap"
				,color: "#222222"
				,borderRadius: "5px"
				,backgroundColor: "#ffffff"
				,padding:"5px"
				,opacity:0.8
			 }
			,disableAutoPan: true
			,pixelOffset: new google.maps.Size(-10, labelXOffset)
			,closeBoxURL: ""
			,visible: false
			,pane: "mapPane"
			,enableEventPropagation: true
			,map:map
		});
	}
	if(regionInfowindow.regionName != region)
	{
		regionInfowindow.close();
		regionInfowindow.setContent("<center>" + region + "</center>");
		regionInfowindow.setMap(map);
		regionInfowindow.setPosition(pos);
		regionInfowindow.show();
	}
	setTimeout(function(){
		$(".infoBox").parent().css("z-index", 102);
	}, 0);
}

// selects region
function selectRegion(latLng)
{
	for(key in polygons)
	{
		if(polygons[key].containsLatLng(latLng))
		{
			selectPolygon(polygons[key]);
			break;
		}
	}
}

function selectPolygon(polygon)
{
	if(prevSelectedPolygon)
	{
		prevSelectedPolygon.setOptions(defaultOptions);
		prevSelectedPolygon.isSelected = false;
		//prevSelectedPolygon.setVisible(false);
	}

	polygon.setOptions(selectedOptions);
	polygon.isSelected = true;
	map.fitBounds(polygon.bounds);
	prevSelectedPolygon = polygon;
}

// regions' properties
var fillColor = "#F00000";
var selFillColor = "#0F00000";

var selectedOptions = {
	//strokeColor: "aqua",
	strokeColor: "#427C48",
	strokeOpacity: 0.8,
	strokeWeight: 3,
	fillColor: "#A6DBEA",
	fillOpacity: 0.4,
	zIndex : 2
};

var layerOptions = new Array();
function loadStyles()
{
	for(var i in LayersProperties)
	{
		var defaultOptions = {
		strokeColor: LayersProperties[i].outline.color,
		strokeOpacity: 0.8,
		strokeWeight: LayersProperties[i].outline.width,
		fillColor: "#C2E3ED",
		fillOpacity: 0,
		zIndex : 1
		};
		layerOptions[LayersProperties[i].name] = {style: defaultOptions, displayField: LayersProperties[i].displayField};
	}
}

	
function getFeatureName(name, properties)
{
	return properties[layerOptions[name].displayField];
}
var polygonsData = new Array();

var ids = 0;
// loads regions from data file
function loadPolygons(data)
{
	// check config
	for(var s in data)
	{
		if(!layerOptions[data[s].name])
		{
			alert("Configuration file is invalid.");
			return;
		}	
	}

	for(var s in data)
	{
		var name = data[s].name;
		var features = data[s].data.features;
		
		var polygons = new Array();
		for(var i=0; i < features.length; i++)
		{
			var featureName = getFeatureName(name, features[i].properties);
			
			var polygonData = features[i].geometry.coordinates;
			var points = new Array();
			for(var key1 in polygonData)
			{
				var points1 = new Array();
				for(var key2 in polygonData[key1])
				{
					var gcoor = polygonData[key1][key2];
					points1.push(new google.maps.LatLng(gcoor[1], gcoor[0]));
				}
				points.push(points1);
			}
			var polygon = new google.maps.Polygon(layerOptions[name].style);
			ids++;
			polygon.setPaths(points);
			polygon.setMap(map);
		//	polygon.setVisible(false);
			polygon.name = featureName;
			polygon.group_name = name;
			polygon.id = ids;
			polygon.data = features[i].properties;
			polygon.bounds = getPolygonBound(polygon);
			mapBounds.union(polygon.bounds);
			polygons.push(polygon);
			google.maps.event.addListener(polygon, 'click', function(event) {
				this.isSelected = true;
				if(prevSelectedPolygon)
				{
					if(prevSelectedPolygon.id != this.id)
					{
						prevSelectedPolygon.setOptions(layerOptions[prevSelectedPolygon.group_name].style);
						prevSelectedPolygon.isSelected = false;
					}
				}
				prevSelectedPolygon = this;
				
				map.fitBounds(this.bounds);
				this.setOptions(selectedOptions);
				showInfoWindow(event.latLng, this.name, this.data);
				//showRegionName(this.name, event.latLng);
			});
			google.maps.event.addListener(polygon, 'mouseout', function(event) {
				if(!this.isSelected)
					this.setOptions({fillOpacity: "0"});
				
				regionInfowindow.close();
			});
			google.maps.event.addListener(polygon, 'mouseover', function(event) {
				if(!this.isSelected)
					this.setOptions({fillOpacity: "0.2"});
					
				showRegionName(this.name, event.latLng);
			});
			google.maps.event.addListener(polygon, 'mousemove', function(event) {
				regionInfowindow.setPosition(event.latLng);
			});
			
		}
		
		polygonsData.push(polygons);
	}
	map.fitBounds(mapBounds);
}

var mapBounds = new google.maps.LatLngBounds();
var prevSelectedPolygon = null;

// gets region bound
function getPolygonBound(polygon)
{
	var coords = polygon.getPaths().getArray();
	var bounds = new google.maps.LatLngBounds();
	for (var i = 0; i < coords.length; i++) {
		bounds = getBound(coords[i].getArray(), bounds);
	}

	return bounds;
}

// gets bound
function getBound(points, bounds)
{
	for (var j = 0; j < points.length; j++) {
		bounds.extend(points[j]);
	}
	return bounds;
}

//var projection;
var australiaKML;
function showInfoWindow(pos, name, obj)
{
	if(!infowindow){
		infowindow = new InfoBubble({
			content: "",
			shadowStyle: 1,
			padding: 10,
			backgroundColor: '#FFFFFF',
			borderRadius: 10,
			arrowSize: 20,
			borderWidth: 1,
			borderColor: '#000000',
			disableAutoPan: true,
			hideCloseButton: false,
			arrowPosition: 50,
			arrowStyle: 0,
			maxWidth:450,
			maxHeight:200,
			minWidth:120,
			leftOffset:30,
			rightOffset:30
		});
	}
	
	
	
	var lat = pos.lat();
	var lng = pos.lng();
	var content = '<div class="iw_content" style="opacity:0.7; font-size:'+iwLabelSize+'px; min-width:200px; min-height:120px">';
		content += '<br><center>' + name +'</center>';
		content += '<br><center>' + lat.toFixed(6) + ', '+lng.toFixed(6)+'</center>';
		content += '<br><center><a class="button" target="_blank" href="http://23.246.224.226:3000/public?lat=' + lat + '&lon='+lng+'">Continue</a></center>';
		content += '</div>';

	infowindow.close();
		
	infowindow.setContent(content);
	infowindow.setPosition(pos);
	infowindow.setMap(map);
	
	infowindow.open();
	
	setTimeout(function(){ 
		$(".iw_content").parent().parent().parent()
			.css("-ms-filter", "progid:DXImageTransform.Microsoft.Alpha(Opacity=90)")
			.css("filter", "alpha(opacity=10)")
			.css("-moz-opacity", 0.9)
			.css("-khtml-opacity", 0.9)
			.css("opacity", 0.9);
	}, 0);
}

function goTo(link)
{
	window.open(link);
}

// sends request for services
function getData()
{
	$.ajax({
		type: "GET",
		url: "getfiles",
		//data : {operation:operation, data:params},
		dataType:"JSON",
		timeout:0,
		success: function(data, xhr, options){
			try 
			{
				// convert JSON to object and check result
				if(data.state == "error")
				{
					alert("Error loading data. Please try again");
					return;
				}
				loadPolygons(data);
			} 
			catch(error) {
				alert(error);
				return;
			}
		}
	});
}
