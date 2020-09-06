//this file should be loaded the first
//I did NOT use the following syntax because the 'window' object does not exist 
//in Firefox background script name space
//window.SimpleGmailNotes = window.SimpleGmailNotes || {}

//this script would be put into page script, better use a strong naming 
//convention
/*********** for page, content, background *********/
if (typeof SimpleGmailNotes === 'undefined' || SimpleGmailNotes === null) {
  SimpleGmailNotes = {};
}

SimpleGmailNotes.isDebug = function(callback){
  // return true;
  return false;
};

SimpleGmailNotes.settings = {
  CLIENT_ID: "38131814991-p4u809qrr5ee1bsehregd4os69jf2n7i.apps.googleusercontent.com",
  SCOPE: 'https://www.googleapis.com/auth/drive.file',
};

SimpleGmailNotes.offlineMessage = "WARNING! Simple Gmail Notes is currently unavailable.\n\n<br/>" +
                                   "Please <a href=''>refresh</a> this page to remove the warning. ";

if(window.location.href.startsWith("moz-extension:"))
  SimpleGmailNotes.IS_CHROME = false;
else
  SimpleGmailNotes.IS_CHROME = !!window.chrome;

SimpleGmailNotes.isChrome = function(){
  return SimpleGmailNotes.IS_CHROME;
};


// ********************   END **************************************

// ********************  for page script & content script
SimpleGmailNotes.isInbox = function(){
  return window.location.href.startsWith("https://inbox.google.com");
};

SimpleGmailNotes.isNewGmail = function(){
  result = false;
  if(SimpleGmailNotes.isInbox())
    result = false;
  else if(top.document.getElementById("embedded_data_iframe") !== null)
    //for loading page
    result = true;
  else
    //after loaded
    result = top.document.getElementById("js_frame") === null;

  return result;
};

SimpleGmailNotes.isClassicGmail = function(){
  if(SimpleGmailNotes.isInbox())
    result = false;
  else
    result = !SimpleGmailNotes.isNewGmail();

  return result;
};

SimpleGmailNotes.getTinyMCEContainer = function(){
  if(SimpleGmailNotes.$(".sgn_container .mce-container").length !== 0){
    return SimpleGmailNotes.$(".sgn_container .mce-container");
  } 
  return null;
};

SimpleGmailNotes.getContainer = function(){
  var injectionNode = $(".sgn_container:visible");
  return injectionNode;
};

SimpleGmailNotes.getCurrentInput = function(){
  var currentInput = SimpleGmailNotes.$(".sgn_input:visible");
  if(SimpleGmailNotes.getTinyMCEContainer()){
    currentInput = SimpleGmailNotes.getTinyMCEContainer().parents(".sgn_container").find(".sgn_input");
  }
  return currentInput;
};

SimpleGmailNotes.getNoteTimeStampDom = function(){
  var timeStampDom = SimpleGmailNotes.$(".sgn_note_timestamp");
  return timeStampDom;
};


SimpleGmailNotes.getCurrentContent = function(){
  var currentInput = SimpleGmailNotes.getCurrentInput();  
  var content = currentInput.val();
  if(!content)
    content = "";
  
  return content;
};


SimpleGmailNotes.getCurrentBackgroundColor = function(){
  var currentInput = SimpleGmailNotes.getCurrentInput();  
  var backgroundColor = currentInput.parents(".sgn_container").find(".sgn_color_picker_value").val();
  return backgroundColor;
};

SimpleGmailNotes.getSidebarNode = function(){
  return SimpleGmailNotes.$(".Bs.nH .Bu.y3:visible");
};

// ********************   END **************************************


// ************* for content script & background script ****************
SimpleGmailNotes.getBrowser = function(){
  if(SimpleGmailNotes.isChrome())
    return chrome;

  //firefox
  return browser;
};

SimpleGmailNotes.getBrowserShortName = function(){
  if(SimpleGmailNotes.isChrome())
    return "c";

  return "f";
};

SimpleGmailNotes.getCssBaseUrl = function(){
  if(SimpleGmailNotes.isChrome())
    return "chrome-extension://" + SimpleGmailNotes.getExtensionID() + "/css";

  //firefox
  return SimpleGmailNotes.getBrowser().extension.getURL("css");
};



SimpleGmailNotes.getIconBaseUrl = function(){
  if(SimpleGmailNotes.isChrome())
    return "chrome-extension://" + SimpleGmailNotes.getExtensionID() + "/image";

  //firefox
  return SimpleGmailNotes.getBrowser().extension.getURL("image");
};

SimpleGmailNotes.getExtensionID = function(){
  return SimpleGmailNotes.getBrowser().runtime.id;
};

SimpleGmailNotes.getExtensionVersion = function(){
  return SimpleGmailNotes.getBrowser().runtime.getManifest().version;
};

SimpleGmailNotes.getExtensionTypeShortName = function(){
  extensionTypeShortName = 'g';
  if(SimpleGmailNotes.isInbox())
    extensionTypeShortName = 'i';
  else if(SimpleGmailNotes.isNewGmail())
    extensionTypeShortName = 'n';
  return extensionTypeShortName;
};

SimpleGmailNotes.getLogoImageSrc = function(type){
  return "https://www.simplegmailnotes.com/bart-logo.24.png" +
           "?v=" + SimpleGmailNotes.getExtensionVersion() + 
           "&from=" + SimpleGmailNotes.getBrowserShortName() + "-" + type +
	   "-" + SimpleGmailNotes.getExtensionTypeShortName();
};

SimpleGmailNotes.getSgnLogoImageSrc = function(type) {
  return "https://api.lazycrm.com/media/sgn_logo.png" +
           "?v=" + SimpleGmailNotes.getExtensionVersion() + 
           "&from=" + SimpleGmailNotes.getBrowserShortName() + "-" + type;
}

SimpleGmailNotes.getBartLogoImageSrc = function(type) {
  return "https://api.lazycrm.com/media/bart_logo_for_sgn.png" +
           "?v=" + SimpleGmailNotes.getExtensionVersion() + 
           "&from=" + SimpleGmailNotes.getBrowserShortName() + "-" + type;
}

SimpleGmailNotes.getWhiteLogoImageSrc = function(type){
  return "https://www.simplegmailnotes.com/bart-logo-white.png" +
           "?v=" + SimpleGmailNotes.getExtensionVersion() + 
           "&from=" + SimpleGmailNotes.getBrowserShortName() + "-" + type;
};

SimpleGmailNotes.getContactUsUrl = function(type){
  return "https://www.bart.com.hk/?from=" + SimpleGmailNotes.getBrowserShortName() + 
              "-" + type + "#ContactUs-section";
};

SimpleGmailNotes.getOfficalSiteUrl = function(type){
  return "https://www.bart.com.hk/?from=" + SimpleGmailNotes.getBrowserShortName() + 
           "-" + type + "-" + SimpleGmailNotes.getExtensionTypeShortName();
};

SimpleGmailNotes.getDonationUrl = function(type){
  return "http://www.simplegmailnotes.com/donation?from=" + 
           SimpleGmailNotes.getBrowserShortName() + "-" + type;
};

SimpleGmailNotes.getSupportUrl = function(){
  var url; 
  if(SimpleGmailNotes.isChrome())
    url = "https://chrome.google.com/webstore/detail/simple-gmail-notes/" + SimpleGmailNotes.getExtensionID() + "/support?hl=en";
  else
    url = "https://addons.mozilla.org/en-US/firefox/addon/simple-gmail-notes/#reviews";

  return url;
};

SimpleGmailNotes.getReviewUrl = function(){
  var url; 
  if(SimpleGmailNotes.isChrome())
    url = "https://chrome.google.com/webstore/detail/simple-gmail-notes/" + SimpleGmailNotes.getExtensionID() + "/reviews?hl=en";
  else
    url = "https://addons.mozilla.org/en-US/firefox/addon/simple-gmail-notes/#reviews";

  return url;
};

SimpleGmailNotes.getCRMBaseUrl = function(){
  return 'https://sgn.mobilecrm.io';
  // return 'https://sgn.mobilecrm.io';
  // return 'https://sgn.mobilecrm.io';
};

SimpleGmailNotes.getSGNWebBaseURL = function(){
  return "https://app.simplegmailnotes.com";
};

SimpleGmailNotes.debugLogInfo = {};
SimpleGmailNotes.defaultScope = "_DEFAULT_";

SimpleGmailNotes.getLog = function(scope){
  var log = "";
  if(!scope){
    scope = SimpleGmailNotes.defaultScope;
  }

  return SimpleGmailNotes.debugLogInfo[scope];
};

SimpleGmailNotes.setLog = function(err, scope){
  if(!scope){
    scope = SimpleGmailNotes.defaultScope;
  }
  SimpleGmailNotes.debugLogInfo[scope] = err;
};

SimpleGmailNotes.appendLog = function(err, scope){
   var headLength = 2000;
   var tailLength = 500;
   var maxLength = headLength + tailLength;
  /*
  if(debugInfo.length > 4096)  //better to give a limit 
    //console.log("top much error");
    return;
  */
  var result = "";
  if(typeof(err) === "object"){
    if(err.message)
      result += err.message + ":\n";

    if(err.stack)
      result += err.stack + "\n--\n\n";
  }

  if(!result)
    result += "[" + err + "]";  //this would cast err to string

  /*
  if(SimpleGmailNotes.debugLogInfo[scope].indexOf(result) < 0){ //do not repeatly record
    SimpleGmailNotes.debugLogInfo[scope] += result;
  }*/

  if(!scope){
    scope = SimpleGmailNotes.defaultScope;
  }
  if(!SimpleGmailNotes.debugLogInfo[scope]){
    SimpleGmailNotes.debugLogInfo[scope] = "";
  }
  
  var currentLog = SimpleGmailNotes.debugLogInfo[scope];
  //the log would duplicated in the last 50 characters
  if(currentLog.length > 50 && currentLog.substring(currentLog.length-50).indexOf(result) > 0)
    return;


  SimpleGmailNotes.debugLogInfo[scope] += result;

  var scopeDebugInfo = SimpleGmailNotes.debugLogInfo[scope];
  if(scopeDebugInfo.length > maxLength){
    SimpleGmailNotes.debugLogInfo[scope] = scopeDebugInfo.substring(0, headLength) +
      " ... "  +
      scopeDebugInfo.substring(scopeDebugInfo.length-tailLength, scopeDebugInfo.length);
  }

};

//http://stackoverflow.com/questions/28348008/chrome-extension-how-to-trap-handle-content-script-errors-globally
//I have to use try/catch instead of window.onerror because of restriction of same origin policy: 
SimpleGmailNotes.executeCatchingError = function(func, arg){
  try{
    func(arg);
  }
  catch(err){
    SimpleGmailNotes.appendLog(err);
  }
};

SimpleGmailNotes.getShortDescription = function(description, length){
  var shortDescription;
  if(description.indexOf('<p') === 0 || 
    description.indexOf('<div') === 0 ||
    description.indexOf('<ol') === 0 ||
    description.indexOf('<ul') === 0){
    shortDescription = SimpleGmailNotes.htmlUnescape(
      SimpleGmailNotes.stripHtml(description)).substring(0, length);
  }else{
    shortDescription = description.substring(0, length);
  }

  return shortDescription;
};

SimpleGmailNotes.getFirstLineAbstract = function(shortDescription){ 
  var shortDescriptionArray = shortDescription.split("\n");
  var result = "";
  for(var i=0; i<shortDescriptionArray.length; i++){
    if(shortDescriptionArray[i]){
      result = shortDescriptionArray[i];
      break;
    } 
  }

  return result;
};

 

SimpleGmailNotes.getSummaryLabel = function(description, preferences){
  var firstLineAbstract = preferences["firstLineAbstract"];
  var showAbstractBracket = preferences["showAbstractBracket"];
  var abstractStyle = preferences["abstractStyle"];

  if(abstractStyle == "fixed_SGN")
    shortDescription = "SGN";
  else{
    var length = parseInt(abstractStyle);
    if(!length)
      length = 20;  //default to 20

    shortDescription = SimpleGmailNotes.getShortDescription(description, length);
    if(firstLineAbstract !== "false")
      shortDescription = SimpleGmailNotes.getFirstLineAbstract(shortDescription);

    if(showAbstractBracket !== "false")
      shortDescription = "[" + shortDescription + "]";
  }

  return shortDescription;
};

SimpleGmailNotes.containsEmailTag = function(emailAddress) {
  const re = /.*<[\w\.-]+@[\w\.-]+>/;
  return re.test(emailAddress);
};

SimpleGmailNotes.validateEmail = function(email) {
  const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
};

SimpleGmailNotes.nl2br = function(str){
  return String(str)
          .replace(/\n/g, '<br/>');
};

SimpleGmailNotes.htmlEscape = function(str) {
  return String(str)
          .replace(/&/g, '&amp;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
};

/*
var removeHtmlTag = function(str){
  return str.replace(/<\/?("[^"]*"|'[^']*'|[^>])*(>|$)/g, "");
}
*/

// I needed the opposite function today, so adding here too:
SimpleGmailNotes.htmlUnescape = function(value){
  return String(value)
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
};

SimpleGmailNotes.stripHtml = function(value){
  var specialCharRe = new RegExp(String.fromCharCode(160), 'g');
  return value.replace(/<(?:.|\n)*?>/gm, '')
              .replace(/&nbsp;/g, '')
              .replace(specialCharRe, ' ');
};

SimpleGmailNotes.isMarkCrmDeleted = function(properties){
  // not load crm delete
  if(!properties)
    return false;

  var crmDeleteTag = false;
  for(var n=0; n<properties.length; n++){
    if(properties[n]["key"] === gSgnCrmDeleted && properties[n]["value"] === "true"){
      crmDeleteTag = true; 
    }
  }
  return crmDeleteTag;
};


SimpleGmailNotes.getArrayChunk = function(array, chunk){
  if(chunk === 0){
    debugLog("chunk is not 0");
    return;
  }
  var tempArray = [];
  for(var i=0; i<array.length; i+=chunk){
    tempArray.push(array.slice(i, i+chunk));
  }

  return tempArray;
  
};


SimpleGmailNotes.getRawStorageObject = function(){
  return localStorage;
};

SimpleGmailNotes.setStorage = function(sender, key, value) {
  var email = sender;
  if(sender !== null && typeof sender === "object") {
    email = sender.email;
  }

  var storageKey = email + "||" + key;
  var storage = SimpleGmailNotes.getRawStorageObject();
  if(value)
    storage.setItem(storageKey, value);
  else
    storage.removeItem(storageKey);
};

SimpleGmailNotes.removeStorage = function(sender, key) {
  var email = sender;
  if(sender !== null && typeof sender === "object") {
    email = sender.email;
  }
  if(!email || email.indexOf("@") < 0){
    debugLog("Get storage email not found.");
  }

  var storageKey = email + "||" + key;
  var storage = SimpleGmailNotes.getRawStorageObject();
  if(storage.getItem(storageKey)) {
    storage.removeItem(storageKey);
  }
};


SimpleGmailNotes.getStorage = function(sender, key) {
  var email = sender;
  if(sender !== null && typeof sender === "object") {
    email = sender.email;
  }
  if(!email || email.indexOf("@") < 0){
    debugLog("Get storage email not found.");
  }

  var storageKey = email + "||" + key;
  var storage = SimpleGmailNotes.getRawStorageObject();
  value = storage[storageKey];

  debugLog("Get storage result", email, key, value);
  return value;
};


SimpleGmailNotes.getPopupDimensions = function(newWindowWidth, newWindowHeight){
  var dualScreenLeft = window.screenLeft !== undefined ? window.screenLeft : window.screenX;
  var dualScreenTop = window.screenTop !== undefined ? window.screenTop : window.screenY;
  var width = window.innerWidth ? window.innerWidth : window.screen.width;
  var height = window.innerHeight ? window.innerHeight : window.screen.height;
  
  if(!width)
    width = 0;

  if(!height)
    height = 0;

  var newWindowTop = (height - newWindowHeight) / 2 + dualScreenTop;
  var newWindowLeft = (width - newWindowWidth) / 2 + dualScreenLeft;
  
  return {height: newWindowHeight, width: newWindowWidth, top: parseInt(newWindowTop), 
          left: parseInt(newWindowLeft)}; 
};

SimpleGmailNotes.getStrWindowFeatures = function(newWindowWidth, newWindowHeight) {
  var dimensions = SimpleGmailNotes.getPopupDimensions(newWindowWidth, newWindowHeight);
  newWindowTop = dimensions.top;
  newWindowLeft = dimensions.left;

  var strWindowFeatures = ('innerHeight=' + newWindowHeight +
                           ', innerWidth=' + newWindowWidth +
                           ', top=' + newWindowTop + ', left=' + newWindowLeft);
  // console.log('@489', strWindowFeatures);
  return strWindowFeatures;
};

SimpleGmailNotes.getRedirectUri = function(loginType) {
  var result;

  if(loginType === 'sgn_web'){
    result = SimpleGmailNotes.getSGNWebBaseURL() + "/sgn/signin_done/";
  }
  else {
    result = SimpleGmailNotes.getBrowser().identity.getRedirectURL();
  }

  return result;
};
// ***************** end **********************
