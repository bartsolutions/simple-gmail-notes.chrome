//For messaging between background and content script
$(window).on('load', function(){
  SGNB.getBrowser().runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      debugLog("Get message to background", request);
      sender = {worker: sender, email: request.email};

      setupListeners(sender, request);
  });
});

SGNB.getBrowser().runtime.onInstalled.addListener(function(details){
    var preferences = getPreferences();
    if(details.reason == "install"){
      alert("Thanks for installing. Please reload the Gmail page (click address bar & press enter key) to start using the extension!");
      preferences["upgrade_notification_done"] = true;
    } 
    else{
      SGNB.getBrowser().browserAction.setBadgeText({"text": gBadgeText});
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
