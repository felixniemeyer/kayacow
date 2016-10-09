var h = document.getElementById("h");
var localV = 10;

var bgPageData;

window.onload = function(){
	bgPageData = chrome.extension.getBackgroundPage().data;
	initSearchArea();
	initResults();
}

function initSearchArea()
{
	addSearchRow()
	activateSearchButton()
	makeCollapsable(document.getElementById("searchArea"));
}

function initResults()
{
	for(var i = 0; i < bgPageData.tasks.length; i++)
	{
		createResultArea(i);
		updateResults(i);
		bgPageData.subscribeForUpdates(updateResults, i);
	}
}

function addSearchRow()
{
	var st = document.getElementById("searchTable");
	var tr = document.createElement("tr");
	tr.className = "searchRow";
	tr.innerHTML = [ 
		'<td><input type="text" class="inputWithInitialValue inputAirports fromAirports" value="eg.: MUC, TXL, FRA" /></td>',
		'<td><input type="text" class="inputWithInitialValue inputAirports toAirports" value="eg.: GRU, BUE, LIM" /></td>',
		'<td><input type="text" class="inputWithInitialValue inputDate fromDate" value="DD-MM-YYYY" /></td>',
		'<td><input type="text" class="inputWithInitialValue inputDate toDate" value="DD-MM-YYYY" /></td>',
		'<td><input type="button" class="deleteButton" value="X" /></td>'].join("");
	st.appendChild(tr);
	tr.data = {};
	tr.data.hovering = true;
	tr.style["opacity"] = "0.7";
	
	var inputs = tr.getElementsByClassName("inputWithInitialValue");
	for(var i = 0; i < inputs.length; i++)
	{
		console.log(i);
		inputs[i].data = {
			stillInitial: true
		};
		inputs[i].addEventListener("focus", function(e){
			var me = e.target;
			var tabrow = me.parentNode.parentNode;
			if(me.data.stillInitial)
			{
				me.data.stillInitial = false;
				me.value = "";
				me.style["color"] = "#000";
			}
			if(tabrow.data.hovering)
			{
				tabrow.data.hovering = false;
				tabrow.style["opacity"] = 1;
				addSearchRow();
				tabrow.getElementsByClassName("deleteButton")[0].addEventListener("click", function(e){
					st.removeChild(e.target.parentNode.parentNode);
				});
			}

		});
	}
}

function activateSearchButton()
{
	var sb = document.getElementById("searchButton");
	sb.addEventListener("click", function(e){
		var logger = {
			clean: true,
			string: "",
			error: function(errorMessage) {this.string += (this.string == "" ? "" : " -- ") + errorMessage; this.clean = false;}
		};
		var searchTask = composeSearchTask(logger);
		var sa = document.getElementById("searchArea");
		var previousError;
		while(previousError = sa.getElementsByClassName("error")[0])
			sa.removeChild(previousError);
		if(searchTask)
		{
			console.log("making request: " + JSON.stringify(searchTask));
			passSearchTask(searchTask);
		}
		else
		{
			console.debug("error: " + logger.string);
			var error = document.createElement("p");
			error.className = "error";
			error.textContent = logger.string;
			sa.appendChild(error);
		}
	});
}

function composeSearchTask(logger)
{
	var st = document.getElementById("searchTable");
	var sr = st.getElementsByClassName("searchRow");

	var request = {};

	var segments = [];

	if(sr.length < 2)
	{
		logger.error("Specify airports and dates to make instructions complete for the cow.")
	}
	else
	{
		for(var i = 0; i < sr.length - 1; i++)
		{
			var segment = {};
			segment.fromAirports = parseAirports(sr[i].getElementsByClassName("fromAirports")[0].value, logger);
			segment.toAirports = parseAirports(sr[i].getElementsByClassName("toAirports")[0].value, logger);
			segment.fromDate = parseDate(sr[i].getElementsByClassName("fromDate")[0].value, logger);
			segment.toDate = parseDate(sr[i].getElementsByClassName("toDate")[0].value, logger);
			segments.push(segment);
		}
	}

	request.segments = segments;

	if(logger.clean)
		return request;
	else
		return null;
}

function parseAirports(s, logger)
{
	var airports = [];
	if(s == "")	
	{
		logger.error("An input field contains no airports. Please fill in all airports input fields");
	}
	else
	{
		var s = s.split(",");

		for(var i = 0; i < s.length; i++)
		{
			var c = s[i].trim();
			if(c.length != 3) 
				logger.error("'" + c + "'' is not a correct airport. Airports must be 3 Characters. E.g. 'MUC'");
			else
				airports.push(c.toUpperCase());
		}
		airports.sort();
	}
	return airports;
}

function MyDate(days, months, years){
	this.days = days;
	this.months = months;
	this.years = years;
}
MyDate.prototype.join = function(){
	return this.years + "-" + (this.months > 9 ? "" + this.months : "0" + this.months) + "-" + (this.days > 9 ? "" + this.days : "0" + this.days);
};

function parseDate(s, logger)
{
	var date = new MyDate(); 
	if(s == "")	
	{
		logger.error("An input field contains no date. Please fill in all date input fields");
	}
	else
	{
		var s = s.split("-")
		if(s.length != 3)
		{ 
			logger.error("Date format violated. Stick to DD-MM-YYYY like e.g. 13-07-2018");
		}
		else
		{
			var format = [["days",2],["months",2],["years",4]]
			for(var i = 0; i < format.length; i++)
			{
				var c = s[i].trim();
				if(c.length != format[i][1] || !isNumber(c))
					logger.error(format[i][0] + " need to have " + format[i][1] + " digits. Date format violated. Stick to DD-MM-YYYY like e.g. 13-07-2018");
				else 
					date[format[i][0]] = parseInt(c,10);
			}
		}
	}
	return date;
}

function passSearchTask(searchTask)
{
	var taskId = bgPageData.addSearchTask(searchTask);
	console.log("taskId returned is " + taskId)
	createResultArea(taskId);
	bgPageData.subscribeForUpdates(updateResults, taskId);
	updateResults();
}

function createResultArea(taskId)
{
	var task = bgPageData.tasks[taskId];

	var ra = document.createElement("div");
	ra.id = "task_" + taskId;
	ra.className = "searchResult collapsable";

	var taskTitle = "";
	var taskRows = [];
	var previousFrom = "";
	for(var i = 0; i < task.segments.length; i++)
	{
		var from = task.segments[i].fromAirports.join(",")
		var to = task.segments[i].toAirports.join(",")
		if(previousFrom == "")
			taskTitle = from + " -> " + to;
		else if(from == previousFrom)
			taskTitle += " -> " + to;
		else
			taskTitle = " + " + from + " -> " + to; 
		previousFrom = from;
		taskRows.push(
			'<tr class="searchLine">',
			'	<td>', from, '</td>',
			'	<td>', to, '</td>',
			'	<td>', task.segments[i].fromDate.join(), '</td>',
			'	<td>', task.segments[i].toDate.join(), '</td>',
			'</tr>');		
	}

	ra.innerHTML = [
		'	<div class="progressBar"></div>',
		'	<div class="headline">',
		'		<p class="heading">', taskTitle, '<b class="progressText">initializing...</b></p>',
		'	</div>',
		'	<table class="taskTable">',
		'		<tr>',
		'			<th>From Airports</th>',
		'			<th>To Airports</th>',
		'			<th>From Date</th>',
		'			<th>To Date</th>',
		'		</tr>',
		taskRows.join(""),
		'	</table>',
		'	<div class="resultBox">results will be available soon...</div><br/>'].join("");

	document.body.appendChild(ra);
	makeCollapsable(ra);
}

function updateResults(taskId)
{
	var task = bgPageData.tasks[taskId];

	var ra = document.getElementById("task_" + taskId);

	var progressBar = ra.getElementsByClassName("progressBar")[0];
	var progressText = ra.getElementsByClassName("progressText")[0];
	var resultBox = ra.getElementsByClassName("resultBox")[0];
	
	
	if(task.info.connectionsNumber > 0)
	{
		progressBar.style["width"] = Math.floor(100 * task.info.finishedNumber / task.info.connectionsNumber) + "%";
		progressText.innerHTML = " |" + task.flightList.flights[0].price + "|" + task.info.finishedNumber + "/" + task.info.connectionsNumber + "|";
	}

	var resultLinks = []
	for(var i = 0; i < task.flightList.flights.length; i++)
	{
		var url = task.flightList.flights[i].url;
		resultLinks.push('<a href="'+url+'">'+url+task.flightList.flights[i].price+'</a>');
	}

	resultBox.innerHTML = resultLinks.join("<br/>");
}

function makeCollapsable(sa)
{
	var cb = document.createElement("div");
	cb.className = "collapseButton";
	cb.innerHTML = "&#9660";
	cb.data = {};
	cb.data.expanded = true;
	sa.appendChild(cb);
	cb.addEventListener("click", function(e){
		var me = e.target;
		var dad = me.parentNode;
		if(me.data.expanded)
		{
			dad.style["height"] = "1.7rem";
			me.innerHTML = "&#9650";
		}
		else
		{
			dad.style["height"] = "auto";
			me.innerHTML = "&#9660";
		}
		me.data.expanded = !me.data.expanded;
	} )
}

//helpers, prototype extensions
if(typeof(String.prototype.trim) === "undefined")
{
    String.prototype.trim = function() 
    {
        return String(this).replace(/^\s+|\s+$/g, '');
    };
}

function isNumber(string)
{
	return /^\d+$/.test(string);
}