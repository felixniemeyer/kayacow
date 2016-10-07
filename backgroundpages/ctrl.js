chrome.runtime.onMessage.addListener(handlePriceReport);

window.data = {
	v: 10,
	f: function(){return "function calls work"}
};

function Flight(price, priceNum, url)
{
	this.price = price;
	this.priceNum = priceNum; 
	this.url = url;
}
Flight.prototype.cheaperThan = function(that){ return this.priceNum < that.priceNum; };

var flightList =
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

function handleMessages()
{
	if(request.type == "reportPrice")
		addFlight(request.price, request.priceNum, request.url);
}

function addPrice(price, priceNum, url)
{

}

document.body.style["background-color"] = "#ff0000";