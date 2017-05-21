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

SimpleGmailNotes.offlineMessage = "WARNING! Simple Gmail Notes is currently unavailable.\n\n" +
                                   "Please refresh this page to remove the warning. " +
                                   "(Left click the address bar and press the 'Enter' key)";

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

SimpleGmailNotes.getLogoImageSrc = function(type){
  return "https://www.simplegmailnotes.com/bart-logo.24.png" +
           "?v=" + SimpleGmailNotes.getExtensionVersion() + 
           "&from=" + SimpleGmailNotes.getBrowserShortName() + "-" + type;
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
           "-" + type;
};

SimpleGmailNotes.getDonationUrl = function(type){
  return "http://www.simplegmailnotes.com/donation?from=" + 
           SimpleGmailNotes.getBrowserShortName() + "-" + type;
};

SimpleGmailNotes.getSupportUrl = function(){
  var url; 
  if(SimpleGmailNotes.isChrome())
    url = "https://chrome.google.com/webstore/detail/simple-gmail-notes/jfjkcbkgjohminidbpendlodpfacgmlm/support?hl=en";
  else
    url = "https://addons.mozilla.org/en-US/firefox/addon/simple-gmail-notes/#reviews";

  return url;
};

// ***************** end **********************
