var h = document.getElementById("h");

console.log(chrome.extension.getBackgroundPage());

h.innerHTML = chrome.extension.getBackgroundPage().data.f();
