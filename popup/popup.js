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
		createResultArea(i, true);
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
		'<td><input type="text" class="inputWithInitialValue inputDate fromDate" value="DD-MM-YYYY or +X" /></td>',
		'<td><input type="text" class="inputWithInitialValue inputDate toDate" value="DD-MM-YYYY or +X" /></td>',
		'<td><input type="text" class="scatter" value="1" /></td>',
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
			segment.scatter = parseInt(sr[i].getElementsByClassName("scatter")[0].value);
			console.log(segment.scatter);
			segments.push(segment);
		}
	}

	request.segments = segments;
	request.classes = {
		date: MyDate
	};
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

function MyDate(date){
	if(date instanceof MyDate){
		this.relativeInDays = date.relativeInDays;
		this.days = date.days;
		this.months = date.months;
		this.years = date.years;		
	} else {
		this.relativeInDays = null;
		this.days = 0;
		this.months = 0;
		this.years = 0;
	}
}
MyDate.prototype.clone = function(){
	return new MyDate(this);
};
MyDate.prototype.setToday = function(){
	var today = new Date();
	this.days = today.getDate();
	this.months = today.getMonth();
	this.years = today.getFullYear();
};
MyDate.prototype.isRelative = function(){
	return this.relativeInDays != null;
};
MyDate.prototype.getRelativeDays = function(){
	return this.relativeInDays;
};
MyDate.prototype.addDays = function(days){
	if(this.isRelative())
		this.relativeInDays += days;
	else
	{
		this.days += days;
		var dpm;
		while(this.days > (dpm = daysPerMonth(this.months)))
		{
			this.days -= dpm;
			this.months++;
			if(this.months > 12)
			{
				this.months -= 12;
				this.years++;
			}
		}
	}
};
MyDate.prototype.join = function(){
	if(this.isRelative())
		return "+ " + this.relativeInDays + " days"
	else
		return this.years + "-" + (this.months > 9 ? "" + this.months : "0" + this.months) + "-" + (this.days > 9 ? "" + this.days : "0" + this.days);
};
MyDate.prototype.laterThan = function(to){
	if(this.years > to.years)
	{
		return true;
	}
	else if(this.years == to.years)
	{
		if(this.months > to.months)
		{
			return true;
		}
		else if(this.months == to.months)
		{
			if(this.days > to.days)
				return true;
		}
	}
	return false;
};


function parseDate(s, logger)
{
	var date = new MyDate(); 
	if(s == "")	
	{
		logger.error("An input field contains no date. Please fill in all date input fields");
	}
	else if (s.substring(0,1) == "+" ) {
		date.relativeInDays = parseInt(s.substring(1));
		if(date.relativeInDays == NaN)
			logger.error("Date format violated. Stick to DD-MM-YYYY (like e.g. 13-07-2018) or a date dynamically relative to the previous date in days (like e.g. +4)");
	}
	else
	{
		var s = s.split("-")
		if(s.length != 3)
		{
			logger.error("Date format violated. Stick to DD-MM-YYYY (like e.g. 13-07-2018) or a date dynamically relative to the previous date in days (like e.g. +4)");
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
}

function createResultArea(taskId, collapsed)
{
	var task = bgPageData.tasks[taskId];

	var ra = document.createElement("div");
	ra.id = "task_" + taskId;
	ra.className = "searchResult collapsable";

	var taskTitle = "";
	var taskRows = [];
	var previousTo = "";
	for(var i = 0; i < task.segments.length; i++)
	{
		var from = task.segments[i].fromAirports.join(",")
		var to = task.segments[i].toAirports.join(",")
		if(previousTo == "")
			taskTitle = from + " -> " + to;
		else if(from == previousTo)
			taskTitle += " -> " + to;
		else
			taskTitle += " + " + from + " -> " + to; 
		previousTo = to;
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
		'	<div class="failedBar"></div>',
		'	<div class="headline">',
		'		<p class="heading"><b class="progressText"></b>', taskTitle, '</p>',
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
		'	<div class="resultBox">The results will appear here soon...</div><br/>'].join("");

	document.body.insertBefore(ra, document.getElementsByClassName("searchResult")[0] || null);
	makeCollapsable(ra, collapsed);
}

function updateResults(taskId)
{
	var task = bgPageData.tasks[taskId];

	var ra = document.getElementById("task_" + taskId);

	var progressBar = ra.getElementsByClassName("progressBar")[0];
	var failedBar = ra.getElementsByClassName("failedBar")[0];
	var progressText = ra.getElementsByClassName("progressText")[0];
	var resultBox = ra.getElementsByClassName("resultBox")[0];

	var progress = 100 * task.info.finishedNumber / task.info.connectionsNumber;
	progressBar.style["width"] = progress + "%";
	failedBar.style["left"] = progress + "%";
	failedBar.style["width"] = 100 * task.info.failedNumber / task.info.connectionsNumber + "%";

	var totalDone = task.info.finishedNumber + task.info.failedNumber;
	progressText.innerHTML = " |" + (task.flightList.flights[0] ? task.flightList.flights[0].price : "?") + "|" + (totalDone || 0) + "/" + task.info.connectionsNumber + "|";

	if(task.flightList.flights.length > 0)
	{
		var resultLinks = []
		for(var i = 0; i < task.flightList.flights.length; i++)
		{
			var url = task.flightList.flights[i].url;
			resultLinks.push('<a href="'+url+'">'+url+": "+task.flightList.flights[i].price+'</a>');
		}
		resultBox.innerHTML = resultLinks.join("<br/>");
	}
}

function makeCollapsable(sa, collapsed)
{
	var cb = document.createElement("div");
	cb.className = "collapseButton";
	cb.innerHTML = "&#9660";
	cb.data = {};
	cb.data.expanded = true;
	sa.appendChild(cb);
	var toggleCollapsed = function(e){
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
	};
	cb.addEventListener("click", toggleCollapsed);
	if(collapsed)
		toggleCollapsed({target: cb});
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

function daysPerMonth(month, years)
{
	var days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][(month-1)];
	if((years % 4) == 0 && month == 2)
		days++;
	return days;
}