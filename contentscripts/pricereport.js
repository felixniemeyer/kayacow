config = {
	waitForKayakSecs: 300
}

chrome.runtime.sendMessage({
	"type": "unpauseTask" 
});		

setTimeout(reportBestConnection, config.waitForKayakSecs * 1000);

function reportBestConnection()
{
	var status = "success";

	try{
		//find out cheapest offer
		var cheapest = document.getElementById("content_div").children[0];

		//copy price, from, to, duration / maybe simply copy html?

		var price = cheapest.getElementsByClassName("results_price")[0].innerHTML;

		var priceNum = parseInt((" "+price).split(/\D+/,2)[1], 10);
	}catch(e){
		status = "error";
	}

	var url = window.location.href;

	//send to background page for accumulation
	chrome.runtime.sendMessage({
		type: "reportPrice",
		status: status,
		price: price,
		priceNum: priceNum,
		url: url
	})
}

