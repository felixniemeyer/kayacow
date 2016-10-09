chrome.runtime.onMessage.addListener(handleMessage);

window.data = {
	tasks: [],
	addSearchTask: function(searchTask){
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
				for(var i = 0; i < subscribers.length; i++)
					subscribers[i]();
			},
			subscribers: []
		};
		//Asynchroniously start opening Tabs, send them the taskId!
		id = this.tasks.push(searchTask);
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


function handleMessage(request)
{
	if(request.type == "reportPrice")
		window.tasks[request.taskId].flightList.add(new Flight(request.price, request.priceNum, request.url));
}

function startTask(searchTask)
{

}