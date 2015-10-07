/*
 * Simple Gmail Notes 
 * https://github.com/walty8
 * Copyright (C) 2015 Walty Yeung <walty8@gmail.com>
 */

//disable logging for production
if(chrome.runtime.getManifest().version != "0.0.1"){  
  settings.DEBUG = false;
}

/*** callback implementation for background-common.js ***/
getRawStorageObject = function(){
  return localStorage;
}

sendContentMessage = function(sender, message) {
  chrome.tabs.sendMessage(sender.worker.tab.id, message, function(response) {
    debugLog("Message response:", response);
  });
}

sendAjax = function(config) {
  $.ajax(config);
}

getRedirectUri = function() {
  return "https://jfjkcbkgjohminidbpendlodpfacgmlm.chromiumapp.org/provider_cb";
}

launchAuthorizer = function(sender, callback) {
  debugLog("Trying to login Google Drive.");
  chrome.identity.launchWebAuthFlow(
    {"url": "https://accounts.google.com/o/oauth2/auth?" +
      $.param({"client_id": settings.CLIENT_ID,
          "scope": settings.SCOPE,
          "redirect_uri": getRedirectUri(),
          "response_type":"code",
          "access_type":"offline",
          "login_hint":sender.email,
          "prompt":"consent"
      }), 
     "interactive": true
    },
    callback
  );
}

removeCachedToken = function(tokenValue){
  chrome.identity.removeCachedAuthToken({'token':tokenValue}, function(){});
}

checkLogger = function(sender){
  //no need to implement this for chrome
}
/*** end of callback implementation ***/

//For messaging between background and content script
$(window).load(function(){
  chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      debugLog("Get message to background", request);
      sender = {worker: sender, email: request.email};
      setupListeners(sender, request)
  });
});


debugLog("Finished background script");
