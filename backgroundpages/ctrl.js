chrome.runtime.onMessage.addListener(handleMessage);
var windowTaskMapping = {};

var config = {
	avgTabCreateDelaySecs: 20, 
	justLogNoRequest: false
}

window.data = {
	tasks: [],
	addSearchTask: function(searchTask){
		console.log("adding search task")
		searchTask.info = {};
		searchTask.info.pause = false;
		searchTask.info.resume = null; 
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
		console.log("received reportPrice request, windowId: " + sender.tab.windowId);
		var taskId = windowTaskMapping[sender.tab.windowId];
		var task = window.data.tasks[taskId];
		task.flightList.add(new Flight(request.price, request.priceNum, request.url));
		task.info.finishedNumber = task.flightList.flights.length;

		if(task.info.finishedNumber == task.info.connectionsNumber)
			chrome.windows.remove(sender.tab.windowId);

		for(var i = 0; i < task.subscribers.length; i++)
			task.subscribers[i](taskId);

		chrome.tabs.remove(sender.tab.id);
	}
	if(request.type	== "reportCaptcha")
	{
		console.log("received reportCaptcha request");
		var taskId = windowTaskMapping[sender.tab.windowId];
		window.data.tasks[taskId].info.pause = true;
		chrome.windows.update(sender.tab.windowId, {focused:true});
		chrome.tabs.update(sender.tab.id, {active:true});
	}
	if(request.type	== "unpauseTask")
	{
		console.log("received unpauseTask request");
		var task = window.data.tasks[windowTaskMapping[sender.tab.windowId]];
		if(task.info.pause)
		{
			task.info.pause = false;
			if(task.info.resume) task.info.resume();
			task.info.resume = null;
		}
	}
}

function startTask(taskId)
{
	console.log("starting search task with id" + taskId);

	var task = window.data.tasks[taskId];

	var previousConnections = [{str:""}];
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
					day += task.options.scatter;
					for(var pc = 0; pc < previousConnections.length; pc++)
					{
						if(previousConnections[pc].latestDate == undefined || !previousConnections[pc].latestDate.laterThan(date))
						connections.push({
								str: previousConnections[pc].str + "/" + s.fromAirports[fA] + "-" + s.toAirports[tA] + "/" + date.join(),
								latestDate: new date.constructor(date) });

					}
				}
			}
		}
		previousConnections = connections;
	}

	var connectionStrings = []
	for(var i = 0; i < connections.length; i++) connectionStrings[i] = connections[i].str;
	
	if(!config.justLogNoRequest) chrome.windows.create({left:50, top:50, width:1000, height:600}, function(chromeWindow) {
			windowTaskMapping[chromeWindow.id] = taskId;
			createTabs(connectionStrings, 0, chromeWindow.id);
		});

	task.info.connectionsNumber = connectionStrings.length;
	console.log("connections to create tabs for: " + connectionStrings.join("\n"));
}

function interpolateDate(from, to, days)
{
	var d = new from.constructor(from);
	d.days += days;
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
	if(d.laterThan(to))
		return null
	else
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
	console.log("index ist " + index + " und die länge " + connections.length);
	if(index < connections.length)
	{
		var task = window.data.tasks[windowTaskMapping[windowId]];
		if(!task.info.pause)
		{
			chrome.tabs.create({windowId: windowId, url: "https://www.kayak.de/flights" + connections[index]})
			index++;
			setTimeout(function(){createTabs(connections, index, windowId)}, 1000 * (0.75+0.5*Math.random()) * config.avgTabCreateDelaySecs);
		}
		else
		{
			task.info.resume = function(){
				createTabs(connections, index, windowId);
			};
		}
	}
}	