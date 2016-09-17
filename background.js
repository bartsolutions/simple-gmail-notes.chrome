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
    isDebugCache = chrome.runtime.getManifest().version == "0.0.1";

  return isDebugCache;
}

var extensionID = chrome.runtime.id;
openTab = function(page){
  chrome.tabs.create({"url": "chrome-extension://" + extensionID + "/" + page});
}

getRawStorageObject = function(){
  return localStorage;
}

getRawPreferences = function(){
  storage = getRawStorageObject();
  return storage; //preferences are put into local storage as well
}

/*
sendContentMessage = function(sender, message) {
  chrome.tabs.sendMessage(sender.worker.tab.id, message, function(response) {
    debugLog("Message response:", response);
  });
}
*/



sendContentMessage = function(sender, message) {
  sender.worker.postMessage(message);
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

getCurrentVersion = function(){
    return chrome.runtime.getManifest().version;
}

/*** end of callback implementation ***/

//For messaging between background and content script
/*
initChromeListeners = function(){
  chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      debugLog("Get message to background", request);
      sender = {worker: sender, email: request.email};

      handleRequest(sender, request);
  });
}
*/

initChromeListeners = function(){
  chrome.runtime.onConnect.addListener(function(port) {
      port.onMessage.addListener(function(request){
          sender = {worker: port, email: request.email};
          handleRequest(sender, request);
      });
  });

}


showResult = function(result){
  var temp = result;
}

updateListeners = function(){
  chrome.tabs.getAllInWindow(null, function(tabs){
    for (var i = 0; i < tabs.length; i++) {
      var tab = tabs[i];
      if(tab.url.indexOf("mail.google.com") >= 0){
          chrome.tabs.executeScript(tab.id, {file: "lib/jquery-3.1.0.min.js", runAt: "document_end"}, showResult);
          chrome.tabs.executeScript(tab.id, {file: "common/content-common.js", runAt: "document_end"}, showResult);
          chrome.tabs.executeScript(tab.id, {file: "content.js", runAt: "document_end"}, showResult);
        //chrome.tabs.sendRequest(tab.id, { action: "xxx" });                         
      }
    }
  });
}

$(window).on('load', initChromeListeners);

chrome.runtime.onInstalled.addListener(initChromeListeners);
//chrome.runtime.onSuspendCanceled.addListener(initChromeListeners);

injectScripts = function(){
  // Add a `manifest` property to the `chrome` object.
  chrome.manifest = chrome.runtime.getManifest();
  var injectIntoTab = function (tab) {
      // You could iterate through the content scripts here
      var scripts = chrome.manifest.content_scripts[0].js;
      var i = 0, s = scripts.length;
      for( ; i < s; i++ ) {
          chrome.tabs.executeScript(tab.id, {
              file: scripts[i]
          });
      }
  }

  // Get all windows
  chrome.windows.getAll({
      populate: true
  }, function (windows) {
      var i = 0, w = windows.length, currentWindow;
      for( ; i < w; i++ ) {
          currentWindow = windows[i];
          var j = 0, t = currentWindow.tabs.length, currentTab;
          for( ; j < t; j++ ) {
              currentTab = currentWindow.tabs[j];
              // Skip chrome:// and https:// pages
              //if( ! currentTab.url.match(/(chrome|https):\/\//gi) ) {
              //    injectIntoTab(currentTab);
              //}

              if(currentTab.url.indexOf("www.gmail.com") >= 0){
                  injectIntoTab(currentTab);
              }
          }
      }
  });
}

//chrome.runtime.onInstalled.addListener(injectScripts);

debugLog("Finished background script");
