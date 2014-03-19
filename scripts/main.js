/////////////////////////////////////
// Hungry Tiger JS
// An RIT Web-Service Project
// By Nate Perry and Chris Knepper
/////////////////////////////////////

"use strict";

// READY FUNCTION
$(function(){

	//Local storage vars
	var showImages = window.localStorage.getItem('showImages');
	if(showImages === "true")
		$("#showLogos").attr("checked", "checked");
	//For debugging option
	app.main.init();
	var debug = window.localStorage.getItem('debugOn');
	if(debug === "true")
		app.main.debugMode = true;
		$("#debugOn").attr("checked", "checked");
	//
});

// our single global variable
var app = {};

// just one module named main
app.main = (function(){

	// CONSTANTS
	var MIS_JSONP_URL = "http://maps.rit.edu/proxySearch/?wt=json&indent=on&json.wrf=app.main.onJSONLoaded&q=";
	var ALL_DINING_URL = "http://maps.rit.edu/proxySearch/?show=all&q=*&wt=json&indent=off&fq=tag:%22Food%22&sort=name+asc&start=0&rows=17&json.wrf=app.main.onJSONLoaded";
   
   	// INSTANCE VARIABLES

   	var debugMode;
   	//Google Maps-Related
    var map;
    var infowindow;
    var marker;
    var overlays;
    //LatLong array for Google Maps
    //Array of markers
    var markerArray = [];
    var locationArray = [];
    //Arrays
    var placesArray = [];
    //Parallel Array with open status as boolean
    var openArray = [];

	//Setup date stuff
	var days = [];
	days.push("Sunday");
	days.push("Monday");
	days.push("Tuesday");
	days.push("Wednesday");
	days.push("Thursday");
	days.push("Friday");
	days.push("Saturday");
	var theDate = new Date();
	var theDay = days[theDate.getDay()];
	var theHour = theDate.getHours();
	var ampm = "a.m.";
	if(theHour > 12)
	{
		theHour -= 12; //12 hour clock
		ampm = "p.m.";
	}

	if(theHour < 10)
		theHour = "0" + theHour;
		
	var theMinute = theDate.getMinutes();

	if(theMinute < 10)
		theMinute = "0" + theMinute; //Consistent integer length

	//Military time
	//Used to compare times later, but not shown to user
	var current = theDate.getHours().toString();
	//Add 24 hours to time before 5am so places that close
	//after midnight but before 5am work correctly
	//So basically Coho
	if(theDate.getHours() < 5)
	{
		current = parseInt(current);
		current += 24;	
	}
	current += theMinute.toString();
	//current = parseInt(current,10);
    
    // PUBLIC METHODS
    function init(){
		// initializeMap() sets up the Google Map
		initializeMap();

		// Add events to UI
		$("#ajax-loader").hide();

		$("#currentTime").html("<div class='clock'><span class='hourSpan'>" + theHour + "</span>" + "<span class='minuteSpan'>" + theMinute + "</span> <span class='ampmSpan'>" + ampm + "</span></div>");
		if(debugMode === true)
			$("#logo").html("current = " + current);
		
		//Should return all open places
		onGetFood("all");
		
		//Load all open places into 
		var daysVisual = "";
		daysVisual += "<ul>";
		for (var i = 0; i < days.length; i++)
		{
			daysVisual += "<li";
			if(theDate.getDay() === i)
			{
				daysVisual += " class='today' ";
			}
			daysVisual += ">" + days[i] + "</li>";
		}
		daysVisual += "<ul>";

		$("#days").html(daysVisual);
	

		//Save show logos status
		$("#showLogos").on('click', function(event) {
			window.localStorage.setItem('showImages', $(this).prop('checked'));
			onGetFood("all");
		});

		//Save debugging status
		$("#debugOn").on('click', function(event) {
			window.localStorage.setItem('debugOn', $(this).prop('checked'));
		});

    }; // end init
    
    function onJSONLoaded(obj){
		//alert(JSON.stringify(obj));
		var html = "";
		//Clear arrays
		locationArray = [];
		placesArray = [];
		openArray = [];
		markerArray = [];
		var results = obj.response.docs;
		if(results.length > 0)
		{
			for (var i = 0; i< results.length; i++){
				var r = results[i];
				var link = r.link;
					var name = r.name;
					var des = r.description;
					var full_des = r.full_description;
					var hours = r.hours;
					var theHours = "";
					$(hours).find('tr').each(function(index){
						$(this).find('td').each(function(index){

							//Check if the place is open today
							//Most places list days as weekdays, so we check if the day according to JS
							//matches up with a day the place lists as being open
							//Most places list "Monday - Thursday" so we have to check that case for Tuesday and Wednesday
							//Sol's is a special case because they're open "Daily"
							//In the table, the days are the left (even) cells and the corresponding times are the next cell
							if(index % 2 === 0)
							{
								//console.log("Hitting even-numbered cells");
								//console.log($(this).text());
								if($(this).text().indexOf(theDay) >= 0)
								{	
									//Special cases for "noon" and "midnight" times, as well as Gracie's and RITz
					      			html += parseLocation($(this).next().text().toString(),name,des,full_des,results[i].latitude,results[i].longitude,i);
								}

								else if((($(this).text().indexOf("Monday - Thursday") >= 0) || ($(this).text().indexOf("Monday - Friday") >= 0) || ($(this).text().indexOf("Monday - Saturday") >= 0)) && (theDay == "Tuesday" || theDay == "Wednesday"))
								{
									html += parseLocation($(this).next().text().toString(),name,des,full_des,results[i].latitude,results[i].longitude,i);
								}

								else if($(this).text().indexOf("Daily") >= 0)
								{
									html += parseLocation($(this).next().text().toString(),name,des,full_des,results[i].latitude,results[i].longitude,i);
								}
							}
						});
					});

			//Maps shit
			//Get geographical location from the service
			//Send it to Google Maps
			}
		} //end results > 0 if
		
		// set html of #content div using jquery()
		$("#content").html(html);
		$("#content").hide();
		$("#content").fadeIn();
		$('#showLogos').is(':checked') ? $("#places").html(makeArrayList(placesArray,true)) : $("#places").html(makeArrayList(placesArray,false));
		if($('.open').length < 1)
			$('#hungryTiger').html("All places are closed. Looks like you're a hungry tiger! Try a vending machine. Or Zonies.");
		$('img.closed').after('<span class="closed">Closed</span>');
		$("#places").hide();
		$("#places").fadeIn();
		

		 
	};
	
	
	
	// PRIVATE CALLBACK METHODS
	
	// called when we want to query
	function onGetFood(term){
		var url = MIS_JSONP_URL + term;
		if(term === "all")
			url = ALL_DINING_URL;
		
		$.ajax({
				url: url,
				dataType: 'jsonp'
				// we are specifying our callback of 'app.main.onJSONLoaded' function in the URL
		});

	}; // end getFood()

	//This function parses every result we get for the information we're interested in and returns it
	function parseLocation(theTime,name,des,full_des,latitude,longitude,number)
	{
		var opening = ((theTime.indexOf("noon") >= 0) ? "12 p.m." : theTime.substr(0,(theTime.indexOf(".") + 3)));
		var closing = ((theTime.indexOf("midnight") >= 0) ? "11:59 p.m." : theTime.substr((theTime.lastIndexOf(" - ") + 3)));
		//For some reason, Ben and Jerry's closing time isn't parsed correctly, so we'll add it manually
		if(name.indexOf("Jerry") >= 0)
			closing = "9 p.m.";
		if(debugMode = true)
		{
	  		console.log(name + "Military opening: " + convertToMilitary(opening));
	  		console.log(name + "Current time: " + current);
			console.log(name + "Military closing: " + convertToMilitary(closing));
		}
		//Data to send to the map after we create the HTML
		var position = new google.maps.LatLng(latitude, longitude);
		var mapData = "<p>" + name + "</p>\n";
			mapData += "<h3>";
		
		//We're making a list of each place
		var html = "";
		html += "<div id =\"" + trimText(name,false) + "\">";
		html += "<h2>" + name  + "</h2>\n";
		html += "<p>" + des + "</p>";
		html += "<p class='opens'>Opens at " + opening + "</p>\n";
		html += "<p class='closes'>Closes at " + closing + "</p>\n";
		html += "<a href='#' onclick=\"app.main.goToMarker(" + ((number === 0) ? number : (number - 1))  + "); return false;\" class='mapButton'>See on Map</a>";
  		html += "<p>" + full_des + "</p>";
  		html += "<a href='#' onclick='app.main.animateScroll(places); return false;' class='topButton'>Back to Top</a>";
  		html += "</div>"
  		html += "<hr />"
		if(theTime.indexOf("closed") === -1) //They're open today
		{
			placesArray.push(name);
			
			if(convertToMilitary(opening) <= current && current <= convertToMilitary(closing)) //They're open right now
			{
				openArray.push(1);
				mapData += "Open";
			}
				
			else
			{
				openArray.push(0);
				mapData += "Closed";
			}
			mapData += "</h3>\n";
			//mapData += "<a href='http://maps.google.com/maps?ll=" + latitude + "," + longitude + "'>Open in Google Maps</a>";
			makeMarker(position,mapData,number);
		}
		//Append all this HTML to the html variable in the results for-loop
		return html;

	}

	//Convert the opening and closing times formatted as 12 hour times with am and pm into a military time
	//We can compare them this way
	function convertToMilitary(time)
	{
		var milHour;
		var milMin;
		if(time.indexOf(":") >= 0)
		{
			milHour = time.substr(0,(time.indexOf(":")));
			milMin = time.substr((time.indexOf(":") + 1),time.indexOf(" ") - 2);	
		}
			
		else
		{
			milHour = time.substr(0,time.indexOf(" "));
			milMin = "00";
		}
		milHour = parseInt(milHour);
		//Add 12 hours to convert back to military time
		if(time.indexOf("p.m") >= 0 && milHour !== 12)
			milHour += 12;
		//For places that close after midnight but before 5 a.m.
		//They close "later" than the current time.
		if(time.indexOf("a.m.") >= 0 && milHour < 5)
			milHour += 24;
		var milTime = milHour.toString();
		milTime += milMin.toString();
		return parseInt(milTime);
	}

	//Trim spaces and the word "the" out of text
	//Useful for shorter image names
	//If onlyQuotes is true, only trim quotes out
	//Useful for the alt attribute
	function trimText(text,onlyQuotes)
	{
		if(onlyQuotes !== true)
		{
			if(text.indexOf("The") >= 0)
				text = text.substr(4);
			if(text.indexOf(" ") >= 0)
				text = text.substr(0,text.indexOf(" "));
		}
		if(text.indexOf("'") >= 0)
			text = text.substr(0,text.indexOf("'"));
		return text;
	}

	//Pass in a marker number and it will go to that one
	//Animated ;)
	function goToMarker(number)
	{
		$('html, body').animate({
			scrollTop: $("#map_canvas").offset().top - 50
			}, 300,"linear",function(){
				//alert("FUNIMATION complete");
				infowindow.setContent("<p>" + placesArray[number] + "</p>\n<h3>" + ((openArray[number] === 1) ? "Open" : "Closed"));
		infowindow.setPosition(markerArray[number]);
		infowindow.open(map);
			});
	}

	//Pass in a div with that ID
	//Animate to it
	function animateScroll(div)
	{
		var theDiv = "#" + div.id;
		$('html, body').animate({
			scrollTop: $(theDiv).offset().top
			 - 50}, 300,"linear");
	}
	
	//Return a list, either as text or as images
	function makeArrayList(array,showImages)
	{
		var list = "<ul>";
		for(var i=0; i < array.length; i++)
		{
				if(array[i - 1] === array[i]) //Remove weird Crossroads showing up twice bug
					array.splice((i - 1),1);
				if(showImages === true)
				{
					list += "<li><div><a href='#' onclick='app.main.animateScroll(" + trimText(array[i],false) + "); return false;'><img src='logos/" + trimText(array[i],false) + ".png' alt='" + trimText(array[i],true) + "' ";
					if(openArray[i] === 1)
						list += "class='open'";
					else
						list += "class='closed'";
					list += "></a></div></li>";
				}
				else
				{
					list += "<li><a href='#' onclick='app.main.animateScroll(" + trimText(array[i],false) + "); return false;' ";
					if(openArray[i] === 1)
						list += "class='open'";
					else
						list += "class='closed'";
					list += ">" + array[i];
					list += "</a></li>";
				}

		}
		list += "</ul>";
		
		return list;
	}

	//Map Functions
	function makeMarker(position,msg)
	{
		if(infowindow)
			infowindow.close();
		//close old info window and make new one
		marker = new google.maps.Marker({
			map: map,
			position: position,
			msg: msg,
			});
		markerArray.push(position);
		google.maps.event.addListener(marker, 'click', function(){
			infowindow.setContent(msg);
			infowindow.setPosition(position);
			infowindow.open(map);
		});
	}
	
	// Sets up Google Map
	function initializeMap() {
        var myOptions = {
          center: new google.maps.LatLng(43.083848,-77.6799),
          zoom: 16,
          mapTypeId: google.maps.MapTypeId.ROADMAP
        };
        // create google map  
        map = new google.maps.Map(document.getElementById("map_canvas"), myOptions);
        infowindow = new google.maps.InfoWindow(); 
        
	};	
	
	// public interfaces
	//If something outside the main function
	//needs to call a function
	//It has to go here
	return{
		init: init,
		goToMarker: goToMarker,
		animateScroll: animateScroll,
		onJSONLoaded: onJSONLoaded
	};
	
})(); // end app.main