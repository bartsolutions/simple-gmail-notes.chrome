/*
 * Simple Gmail Notes 
 * https://github.com/walty8
 * Copyright (C) 2015 Walty Yeung <walty8@gmail.com>
 */

/*** call back implementation for content-common.js ***/
sendBackgroundMessage = function(message) {
  chrome.runtime.sendMessage(message, function(response){
    debugLog("Message response", response);
  });
}

setupBackgroundEventsListener = function(callback) {
  chrome.runtime.onMessage.addListener(
      function(request, sender, sendResponse) {
        callback(request);
      }
  )
}

var isDebugCache = null
isDebug = function(callback){
  if(isDebugCache === null)
    isDebugCache = chrome.runtime.getManifest().version == "0.0.1";

  return isDebugCache;
}

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
/*** end of callback implementation ***/

//initalization
/*
document.addEventListener('DOMContentLoaded', 
    function(){
        appendDebugInfo("DOMContentLoaded");
        fireContentLoadedEvent();
    }, 
    false
);
*/

$(document).ready(function(){
    appendDebugInfo("documentReady");
    fireContentLoadedEvent();
})
