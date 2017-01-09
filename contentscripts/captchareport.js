chrome.runtime.sendMessage({
	"type": "reportCaptcha" 
});

var div = document.createElement("div");
div.innerHTML = "Kayacow asks you to resolve Kayak.com's attempt to stop her";
div.style.width = "100%";
div.style.height = "100px";
div.style["text-align"] = "center";
div.style["font-size"] = "20px";
div.style["line-height"] = "100px";
div.style.color = "#fff";
div.style["background-color"] = "#f00";
document.body.insertBefore(div,document.body.firstChild);