/*
 * Simple Gmail Notes 
 * https://github.com/walty8
 * Copyright (C) 2015 Walty Yeung <walty8@gmail.com>
 */

/*** call back implementation for content-common.js ***/
/*
sendBackgroundMessage = function(message) {
  chrome.runtime.sendMessage(message, function(response){
    debugLog("Message response", response);
  });
}
*/

/*
var port;

// Attempt to reconnect
var reconnectToExtension = function () {
    // Reset port
    port = null;
    // Attempt to reconnect after 1 second
    setTimeout(connectToExtension, 1000 * 1);
};

// Attempt to connect
var connectToExtension = function () {

    // Make the connection
    port = chrome.extension.connect({name: "sgn_content"});

    // When extension is upgraded or disabled and renabled, the content scripts
    // will still be injected, so we have to reconnect them.
    // We listen for an onDisconnect event, and then wait for a second before
    // trying to connect again. Becuase chrome.extension.connect fires an onDisconnect
    // event if it does not connect, an unsuccessful connection should trigger
    // another attempt, 1 second later.
    port.onDisconnect.addListener(reconnectToExtension);

};

// Connect for the first time
connectToExtension();
*/

var port = chrome.runtime.connect({name: "sgn_content"});
sendBackgroundMessage = function(message) {
  port.postMessage(message);
}


/*
setupBackgroundEventsListener = function(callback) {
  chrome.runtime.onMessage.addListener(
      function(request, sender, sendResponse) {
        callback(request);
      }
  )
}
*/

setupBackgroundEventsListener = function(callback){
  port.onMessage.addListener(function(request){
      callback(request)
  });
}

var isDebugCache = null
isDebug = function(callback){
  if(isDebugCache === null)
    isDebugCache = chrome.runtime.getManifest().version == "0.0.1";

  return isDebugCache;
}
/*** end of callback implementation ***/

var extensionID = chrome.runtime.id;
getIconBaseUrl = function(){
  return "chrome-extension://" + extensionID + "/image";
}


function addScript(scriptPath){
    var j = document.createElement('script');
    j.src = chrome.extension.getURL(scriptPath);
    j.async = false;
    j.defer = false;
    (document.head || document.documentElement).appendChild(j);
}

//initalization
function setupPage(){
    addScript('lib/jquery-3.1.0.min.js');
    addScript('lib/gmail.js');
    addScript('common/page-common.js');
    addScript('page.js');
}


//$(document).ready(function(){
    setupListeners();
    setupPage();
//});

