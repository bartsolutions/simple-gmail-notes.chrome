/*
 * Simple Gmail Notes 
 * https://github.com/walty8
 * Copyright (C) 2015 Walty Yeung <walty8@gmail.com>
 */

/*** call back implementation for content-common.js ***/
sendBackgroundMessage = function(message) {
  browser.runtime.sendMessage(message, function(response){
    debugLog("Message response", response);
  });
}

setupBackgroundEventsListener = function(callback) {
  browser.runtime.onMessage.addListener(
      function(request, sender, sendResponse) {
        callback(request);
      }
  )
}

var isDebugCache = null
isDebug = function(callback){
  if(isDebugCache === null)
    isDebugCache = browser.runtime.getManifest().version == "0.0.1";

  return isDebugCache;
}

var extensionID = browser.runtime.id;
getIconBaseUrl = function(){
  return browser.extension.getURL("image");
}


function addScript(scriptPath){
    var j = document.createElement('script');
    j.src = browser.extension.getURL(scriptPath);
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
