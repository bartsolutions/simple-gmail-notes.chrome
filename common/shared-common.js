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
  return false;
};

SimpleGmailNotes.offlineMessage = "WARNING! Simple Gmail Notes is currently unavailable.\n\n<br/>" +
                                   "Please refresh this page to remove the warning. ";

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


SimpleGmailNotes.getCurrentInput = function(){
  var currentInput = SimpleGmailNotes.$(".sgn_input:visible");
  return currentInput;
};

SimpleGmailNotes.getCurrentContent = function(){
  var currentInput = SimpleGmailNotes.getCurrentInput();  
  var content = currentInput.val();

  return content;
};

SimpleGmailNotes.getCurrentBackgroundColor = function(){
  var currentInput = SimpleGmailNotes.getCurrentInput();  
  var backgroundColor = currentInput.parents(".sgn_container").find(".sgn_color_picker_value").val();

  return backgroundColor;
};

SimpleGmailNotes.getSidebarNode = function(){
  return SimpleGmailNotes.$(".Bs.nH .nH.bno:visible");
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
  return extensionTypeShortName;
};

SimpleGmailNotes.getLogoImageSrc = function(type){
  return "https://www.simplegmailnotes.com/bart-logo.24.png" +
           "?v=" + SimpleGmailNotes.getExtensionVersion() + 
           "&from=" + SimpleGmailNotes.getBrowserShortName() + "-" + type +
	   "-" + SimpleGmailNotes.getExtensionTypeShortName();
};

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



SimpleGmailNotes.debugLog = "";
SimpleGmailNotes.appendLog = function(err){
  if(SimpleGmailNotes.debugLog > 4096)  //better to give a limit 
    //console.log("top much error");
    return;

  var result = "";

  if(err.message)
    result += err.message + ":\n";

  if(err.stack)
    result += err.stack + "\n--\n\n";

  if(!result)
    result += "[" + err + "]";  //this would cast err to string

  if(SimpleGmailNotes.debugLog.indexOf(result) < 0) //do not repeatly record
    SimpleGmailNotes.debugLog += result;
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
// ***************** end **********************
