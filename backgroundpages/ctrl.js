chrome.runtime.onMessage.addListener(handleMessage);
var windowTaskMapping = {};

var config = {
	avgTabCreateDelaySecs: 20, 
	justLogNoRequest: false
}

window.data = {
	tasks: [],
	taskSequence: 0,
	addSearchTask: function(searchTask){
		console.log("adding search task");
		searchTask.info = {};
		searchTask.info.connectionsNumber = 0;
		searchTask.info.failedNumber = 0;
		searchTask.info.finishedNumber = 0;
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

		this.tasks.push(searchTask);
		var id = this.tasks.length - 1;
		setTimeout(
			(function(id){
				return function(){
						startTask(id);
					};
				}
			)(id)
		);
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
		
		if(request.status == "success")
		{
			task.flightList.add(new Flight(request.price, request.priceNum, request.url));
			task.info.finishedNumber = task.flightList.flights.length;
		}else{
			task.info.failedNumber++;
		}

		if((task.info.finishedNumber + task.info.failedNumber) == task.info.connectionsNumber)
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
	
	var today = new task.classes.date();
	today.setToday();
	var previousConnections = [{str:"", latestDate: today}];
	var connections;
	for(var i = 0; i < task.segments.length; i++)
	{
		connections = [];
		var s = task.segments[i];
		for(var fA = 0; fA < s.fromAirports.length; fA++)
		{
			for(var tA = 0; tA < s.toAirports.length; tA++)
			{
				for(var pc = 0; pc < previousConnections.length; pc++)
				{
					var day = 0;
					var date = resolveDate(previousConnections[pc].latestDate, s.fromDate);
					var maxDate = resolveDate(date, s.toDate);

					while(!date.laterThan(maxDate))
					{
						console.log(JSON.stringify(date));
						connections.push({
							str: previousConnections[pc].str + "/" + s.fromAirports[fA] + "-" + s.toAirports[tA] + "/" + date.join(),
							latestDate: date.clone() });
						date.addDays(s.scatter);
						console.log("neues 'date': " + JSON.stringify(date));
					}
				}
			}
		}
		previousConnections = connections;
	}

	var connectionStrings = [];
	for(var i = 0; i < connections.length; i++) connectionStrings[i] = connections[i].str;
	
	if(!config.justLogNoRequest) chrome.windows.create({left:50, top:50, width:1000, height:600}, function(chromeWindow) {
			windowTaskMapping[chromeWindow.id] = taskId;
			createTabs(connectionStrings, 0, chromeWindow.id);
		});

	task.info.connectionsNumber = connectionStrings.length;
	console.log("connections to create tabs for: " + connectionStrings.join("\n"));
}

function resolveDate(base, date){
	var result;
	console.log("resolving base: " + JSON.stringify(base) + ", date" + JSON.stringify(date) );
	if(date.isRelative())
	{
		result = base.clone();
		result.addDays(date.getRelativeDays());
	}
	else
		if(base.laterThan(date))
			result = base.clone();
		else
			result = date.clone();
	console.log("resolving to result: " + JSON.stringify(result));
	return result;
}

function createTabs(connections, index, windowId)
{
	console.log("index ist " + index + " und die länge " + connections.length);
	if(index < connections.length)
	{
		var task = window.data.tasks[windowTaskMapping[windowId]];
		if(!task.info.pause)
		{
			chrome.tabs.create({windowId: windowId, url: "https://www.kayak.de/flights" + connections[index]}, function(entry){
				if(chrome.runtime.lastError)
					task.info.pause = true;	
				else
					index++;
					setTimeout(function(){createTabs(connections, index, windowId)}, 1000 * (0.75+0.5*Math.random()) * config.avgTabCreateDelaySecs);
			});
		}
		else
		{
			task.info.resume = function(){
				createTabs(connections, index, windowId);
			};
		}
	}
}	