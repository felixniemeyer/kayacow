config = {
	waitForKayakSecs: 200
}


setTimeout(reportBestConnection, config.waitForKayakSecs * 1000);

function reportBestConnection()
{
	//find out cheapest offer
	var cheapest = document.getElementById("content_div").children[0];

	//copy price, from, to, duration / maybe simply copy html?
	var price = cheapest.getElementsByClassName("results_price")[0].innerHTML;

	var priceNum = parseInt((" "+price).split(/\D+/,2)[1], 10);

	var url = window.location.href;

	//send to background page for accumulation
	chrome.runtime.sendMessage({
		"type": "reportPrice",
		"price": price,
		"priceNum": priceNum,
		"url": url
	})
}

