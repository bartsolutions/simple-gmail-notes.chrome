/*
 * Simple Gmail Notes 
 * https://github.com/walty8
 * Copyright (C) 2017 Walty Yeung <walty@bart.com.hk>
 * License: GPLv3
 *
 * This script is going to be used by background only
 */

//For messaging between background and content script
$(window).on('load', function(){
  SGNB.getBrowser().runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      debugLog("Get message to background", request);
      sender = {worker: sender, email: request.email};

      handleRequest(sender, request);
      return true;
  });


  //var preferences = getPreferences();
  //preferences['debugBackgroundInfo'] = "Extension Version: " + SGNB.getExtensionVersion();
  var message = "Extension Version: " + SGNB.getExtensionVersion();
  SGNB.appendLog(message, debugBackGroundScope);
});

SGNB.getBrowser().runtime.onInstalled.addListener(function(details){
    var preferences = getPreferences();
    if(details.reason == "install"){
      if(SGNB.isChrome()){
        alert("Thanks for installing. Please reload the Gmail page (click address bar & press enter key) to start using the extension!");
      }
      preferences["install_notification_done"] = "";
      preferences["upgrade_notification_done"] = true;
    } 
    else if(details.reason == "update"){
      SGNB.getBrowser().browserAction.setBadgeText({"text": gBadgeText});
      preferences["install_notification_done"] = true;
      preferences["upgrade_notification_done"] = "";
      /*
      alert("The exteions of \'Simple Gmail Notes\' was updated. " +
            "Please reload the Gmail page (click address bar & press enter key) to continue using the extension!\n\n");
      */


      /*
      alert("The exteions of \'Simple Gmail Notes\' was updated. " +
            "Please reload the Gmail page (click address bar & press enter key) to continue using the extension!\n\n" +
                    "New in v0.9.0:\n" +
                    "- Able to set color to individual notes\n" +
                    "- Increased max height for textarea\n" +
                    "- User could select the Google Drive to connect during each login\n" +
                    "- Fixed bugs regarding to split view\n" +
                    "\n\nIf you think the extension is helpful, please consider a donation via the preferences page. Thank you!");
		    */
    }

});

debugLog("Finished background script (event)");
