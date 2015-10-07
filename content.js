/*
 * Simple Gmail Notes 
 * https://github.com/walty8
 * Copyright (C) 2015 Walty Yeung <walty8@gmail.com>
 */
if(chrome.runtime.getManifest().version != "0.0.1"){  
  settings.DEBUG = false;
}

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
/*** end of callback implementation ***/


//initalization
function setupPage(){
    var j = document.createElement('script');
    j.src = chrome.extension.getURL('lib/jquery-1.11.3.min.js');
    (document.head || document.documentElement).appendChild(j);

    var j = document.createElement('script');
    j.src = chrome.extension.getURL('lib/gmail.js');
    (document.head || document.documentElement).appendChild(j);

    var j = document.createElement('script');
    j.src = chrome.extension.getURL('common/page.js');
    (document.head || document.documentElement).appendChild(j);
}

$(document).ready(function(){
    setupListeners();
    setupPage();
});

