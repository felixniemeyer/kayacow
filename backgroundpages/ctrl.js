chrome.runtime.onMessage.addListener(handleMessage);
var windowTaskMapping = {};
var config = {
	avgTabCreateDelaySecs: 5, 
}

window.data = {
	tasks: [],
	addSearchTask: function(searchTask){
		console.log("adding search task")
		searchTask.info = {};
		searchTask.subscribers = [];
		searchTask.flightList = 
		{
			flights: [],
			add: function(flight) { 
				//ermittle den Index des günstigsten Fluges, der teurer ist als "flight"
				var l = 0;
				var r = this.flights.length - 1;
				var m = Math.floor(l+r / 2);
				if(this.flights.length < 1 || this.flights[r].cheaperThan(flight))
					this.flights.push(flight);
				else
				{
					while(l != r){
						if(this.flights[m].cheaperThan(flight))
						{
							l = m+1;
							m = Math.floor((l+r)/2);
						}
						else
						{
							r = m;
							m = Math.floor((l+r)/2);
						}
						console.log("l,m,r:" + [l,m,r].join(","));
					};
					this.flights.splice(m, 0, flight);
				}
			}
		};

		id = this.tasks.push(searchTask) - 1;
		setTimeout(function(){startTask(id);});
		return id;
	},
	subscribeForUpdates: function(callback, searchTaskId){
		this.tasks[searchTaskId].subscribers.push(callback);	
	}
};

function Flight(price, priceNum, url)
{
	this.price = price;
	this.priceNum = priceNum; 
	this.url = url;
}
Flight.prototype.cheaperThan = function(that){ return this.priceNum < that.priceNum; };


function handleMessage(request, sender, sendResponse)
{
	if(request.type == "reportPrice")
	{
		console.log(sender.tab.windowId);
		var taskId = windowTaskMapping[sender.tab.windowId];
		var task = window.data.tasks[taskId];
		task.flightList.add(new Flight(request.price, request.priceNum, request.url));
		task.info.finishedNumber = task.flightList.flights.length;

		for(var i = 0; i < subscribers.length; i++)
			task.subscribers[i](taskId);
	}
}

function startTask(taskId)
{
	console.log("starting search task with id" + taskId);

	var task = window.data.tasks[taskId];

	var previousConnections = [""];
	var connections;
	for(var i = 0; i < task.segments.length; i++)
	{
		connections = [];
		var s = task.segments[i];
		for(var fA = 0; fA < s.fromAirports.length; fA++)
		{
			for(var tA = 0; tA < s.toAirports.length; tA++)
			{
				var day = 0;
				var date;
				while(date = interpolateDate(s.fromDate, s.toDate, day))
				{
					console.log(JSON.stringify(date));
					day++;
					for(var pc = 0; pc < previousConnections.length; pc++)
					{
						connections.push(previousConnections[pc] + "/" + s.fromAirports[fA] + "-" + s.toAirports[tA] + "/" + date.join());
					}
				}
			}
		}
		previousConnections = connections;
	}
	chrome.windows.create({left:50, top:50, width:1000, height:600}, function(chromeWindow) {
		createTabs(connections, 0, chromeWindow.id);
		windowTaskMapping[chromeWindow.id] = taskId;
		});
	task.info.connectionsNumber = connections.length;
	console.log("connections to create tabs for: " + connections.join("\n"));
}

function interpolateDate(from, to, days)
{
	var d = new from.constructor(from.days + days, from.months, from.years);
	var dpm;
	while(d.days > (dpm = daysPerMonth(d.months)))
	{
		d.days -= dpm;
		d.months++;
		if(d.months > 12)
		{
			d.months -= 12;
			d.years++;
		}
	}
	if(d.years > to.years)
	{
		return null;
	}
	else if(d.years == to.years)
	{
		if(d.months > to.months)
		{
			return null;
		}
		else if(d.months == to.months)
		{
			if(d.days > to.days)
				return null;
		}
	}
	return d;
}

function daysPerMonth(month, years)
{
	var days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][(month-1)];
	if((years % 4) == 0 && month == 2)
		days++;
	return days;
}

function createTabs(connections, index, windowId)
{
	chrome.tabs.create({windowId: windowId, url: "https://www.kayak.de/flights" + connections[index]})
	index++;
	if(index < connections.length) setTimeout(function(){createTabs(connections, index, windowId)}, 1000 * ((0.5+Math.random())*config.avgTabCreateDelaySecs));
}	