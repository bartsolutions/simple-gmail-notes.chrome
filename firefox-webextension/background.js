/*
 * Simple Gmail Notes 
 * https://github.com/walty8
 * Copyright (C) 2015 Walty Yeung <walty8@gmail.com>
 */

//disable logging for production

/*** interface implementation for background-common.js ***/
var isDebugCache = null
isDebug = function(callback){
  if(isDebugCache === null)
    isDebugCache = browser.runtime.getManifest().version == "0.0.1";

  return isDebugCache;
}

var extensionID = browser.runtime.id;
openTab = function(page){
  browser.tabs.create({"url" : browser.extension.getURL(page)});
}

getRawStorageObject = function(){
  return localStorage;
}

getRawPreferences = function(){
  storage = getRawStorageObject();
  return storage; //preferences are put into local storage as well
}

sendContentMessage = function(sender, message) {
  browser.tabs.sendMessage(sender.worker.tab.id, message, function(response) {
    debugLog("Message response:", response);
  });
}

sendAjax = function(config) {
  $.ajax(config);
}

iterateArray = function(arr, callback){
  $.each(arr, callback);
}

getRedirectUri = function() {
  return "https://jfjkcbkgjohminidbpendlodpfacgmlm.chromiumapp.org/provider_cb";
}

launchAuthorizer = function(sender, callback) {
  debugLog("Trying to login Google Drive.");
  browser.identity.launchWebAuthFlow(
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
  browser.identity.removeCachedAuthToken({'token':tokenValue}, function(){});
}

checkLogger = function(sender){
  //no need to implement this for chrome
}

getCurrentVersion = function(){
    return browser.runtime.getManifest().version;
}

/*** end of callback implementation ***/

//For messaging between background and content script
$(window).on('load', function(){
  browser.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      debugLog("Get message to background", request);
      sender = {worker: sender, email: request.email};

      setupListeners(sender, request);
  });
});

browser.runtime.onInstalled.addListener(function(details){
    if(details.reason == "install"){
      console.log("Thanks for installing. Please reload the Gmail page (click address bar & press enter key) to start using the extension!");
    } 
    else{
      browser.tabs.query({}, function(tabs){
          for(var i=0; i<tabs.length; i++){
            var tab = tabs[i];

            //send the alert only if the user is opening the Gmail page at the time
            if(tab.url && tab.url.indexOf("https://mail.google.com") == 0){
              alert("The exteions of \'Simple Gmail Notes\' was updated. Please reload the Gmail page (click address bar & press enter key) to continue using the extension!\n\nIf you think the extension is helpful, please consider a donation via the preferences page. Thank you!");
              break;
            }
          }
      });
        
    }
});

debugLog("Finished background script");
