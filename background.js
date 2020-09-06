/*
 * Simple Gmail Notes 
 * https://github.com/walty8
 * Copyright (C) 2017 Walty Yeung <walty@bart.com.hk>
 * License: GPLv3
 *
 * This script is going to be shared for both background and options page
 *
 */

/* global variables */
//use a shorter name as we won't have name conflict here
var SGNC = SimpleGmailNotes;
var settings = {
  CLIENT_ID: SGNC.settings.CLIENT_ID,
  SCOPE: SGNC.settings.SCOPE,
  CLIENT_SECRET: "mdA0U_jSkAjI_1x8pdgtrx02",
  NOTE_NAMES: ["_SIMPLE_GMAIL_NOTES_", "Simple Gmail Notes"],
  ACCESS_TOKEN_KEY: "access_token",
  REFRESH_TOKEN_KEY: "refresh_token"
};


var getSgnMessageForInstallOrUpgrade = function(type) {
  var title = '';
  var tipCardString = '';
  var message = ''
  if (type == "install") {
    title = "Simple Gmail Notes Installed";
    contentString = "<div class='title_tip'>" + 
              "<div class='item sub_title'>How to use Simple Gmail Notes:</div>" +
              "<div class='item tip_item'>1. Click any email</div>" +
              "<div class='item tip_item'>2. Click 'log in' link at the top of email</div>" +
              "<div class='item tip_item'>3. Write anything in the text area</div></div>";
  } else {
    title = "Simple Gmail Notes Updated";
    contentString = "<div class='title_tip'>" +
              "<div class='item sub_title'>New in " + SGNC.getExtensionVersion() + ":</div>" +
              "<div class='item tip_item'>- Fixed alternate login URL for Chrome and Firefox</div>" + 
              "<div class='item tip_item'>- Added customer portal URL for subscription review in preferences page</div>" + 
            "</div>";
    contentString += "<div class='item divide_line'></div>" + 
              "<div class='title_tip'><div class='item sub_title'>Important:</div>" +
              "<div class='item tip_item'>This is a difficult time for us because of COVID-19, if you do think the extension is useful, " +
              "please <a target='_blank' href='https://www.bart.com.hk/simple-gmail-notes-support-package/?f=n2'>" +
                "subscribe to SGN support package</a> to support the continuous development and maintenance of the extension. Thank you!</div>";

    /*
    contentString += "<div class='title_tip title_hint'>" +
                  "<div class='item sub_title sub_hint_title'>Hint:</div>" + 
                  "<div class='item tip_item'>- You could now view the notes in mobile devices " + 
                  "(<a target='_blank' href='https://www.youtube.com/watch?v=vpBt36GibcY'>View Demo</a>)</div>" + 
                  "<div class='item tip_item'>- If you do like the extension, please support our development " +
                    " by subscribing to " +
                    "<a target='_blank' href='https://www.bart.com.hk/simple-gmail-notes-support-package/?f=n'>Support Package</a></div></div>" +
              "</div>";
              */
  }
  var gMessage = "<div class='title'><img class='sgn_logo' src="+ SGNC.getSgnLogoImageSrc('nt') + ">" + title + "</div>" +
              contentString + 
              "<div class='sgn_message_font' >Powered by" +
                "<a  target='_blank' href='" + SGNC.getOfficalSiteUrl("nt") + "'>" +
                  "<img src='" + SGNC.getBartLogoImageSrc("nt") + "'></a></div>";
  return gMessage;
}


var gUpgradeMessage = "<div class='title'><img class='sgn_logo' src="+ SGNC.getSgnLogoImageSrc('nt') + ">" + "Simple Gmail Notes Updated</div>" +
            "<div class='title_tip'><div class='item sub_title'>New in " + SGNC.getExtensionVersion() + ":</div>" +
            "<div class='item tip_item'>- Enhancements for Mobile CRM</div>" + 
            "</div>" +
            "<div class='item divide_line'></div>" + 
            "<div class='title_tip'><div class='item sub_title'>Subscribe to support package:</div>" +
            "<div class='item tip_item'>- You could now view the notes in mobile devices " +
            "(<a target='_blank' href='https://www.youtube.com/watch?v=vpBt36GibcY'>View Demo</a>)</div>" +
            "<div class='item tip_item'>- If you do like the extension, please support our development " +
              " by subscribing to " +
              "<a target='_blank' href='https://www.bart.com.hk/simple-gmail-notes-support-package/?f=n'>Support Package</a></div></div>" +
            "<div class='title_tip title_hint'>" +
                "<div class='item sub_title sub_hint_title'>Hint:</div>" + 
                "<div class='item tip_item'>- You could now view the notes in mobile devices " + 
                "(<a target='_blank' href='https://www.youtube.com/watch?v=vpBt36GibcY'>View Demo</a>)</div>" + 
                "<div class='item tip_item'>- If you do like the extension, please support our development " +
                  " by subscribing to " +
                  "<a target='_blank' href='https://www.bart.com.hk/simple-gmail-notes-support-package/?f=n'>Support Package</a></div></div>" +
            "</div>" + 
            "<div class='sgn_message_font' >Powered by" +
              "<a  target='_blank' href='" + SGNC.getOfficalSiteUrl("nt") + "'>" +
                "<img src='" + SGNC.getBartLogoImageSrc("nt") + "'></a></div>";

var gBadgeText = "";
var gPreferenceTypes = [
  {"type": "select", "name": "abstractStyle", "default": "20", "title": "Note Abstract Style", "panelName": "notesAppearance",
    "option": [
      {"value": "none", "text": "(No Abstract)"},
      {"value": "fixed_SGN", "text": "(Fixed) (SGN)"},
      {"value": "inbox_reminder", "text": "(Inbox Reminder)"},
    ]
  },
  {"type": "checkbox", "name": "firstLineAbstract", "default": false, "title": "Only use first line for abstract", "panelName": "notesAppearance"},
  {"type": "checkbox", "name": "enableFlexibleHeight", "default": false, "title": "Enable Note Flexible Height",
   "panelName": "notesAppearance"},
  {"type": "select", "name": "noteHeight", "default": "4", "title": "Note height, in number of rows<br/>(Max of 4 rows for Inbox)",
    "option": [], "panelName": "notesAppearance"},
  {"type": "select", "name": "notePosition", "default": "top", "title": "Note position<br/>(No effect for Inbox)", "panelName": "notesAppearance",
    "option": [
      {"text": "top"},
      {"text": "bottom"},
      {"value": "side-top", "text": "sidebar top"},
      {"value": "side-bottom", "text": "sidebar bottom"}
    ]
  },
  {"type": "select", "name": "abstractPosition", "default": "before-labels", "title": "Abstract Position", "panelName": "notesAppearance",
    "option": [
      {"value": "before-labels", "text": "Before Labels"},
      {"value": "after-labels", "text": "After Labels"}
    ]
  },
  {"type": "color", "name": "fontColor", "default": "#525252", "title": "Note font color", "panelName": "notesAppearance"},
  {"type": "color", "name": "backgroundColor", "default": "#FFFF99", "title": "Note background color", "panelName": "notesAppearance"},
  {"type": "select", "name": "fontSize", "default": "default", "title": "Note font size", "panelName": "notesAppearance",
    "option": [
      {"value": "default", "text": "(Default)"},
    ]
  },
  {"type": "checkbox", "name": "enableNoteFontBold", "default": "false", "title": "Note in Bold Font", "panelName": "notesAppearance"},
  {"type": "color", "name": "abstractFontColor", "default": "#525252", "title": "Abstract font color", "panelName": "notesAppearance"},
  {"type": "color", "name": "abstractBackgroundColor", "default": "#FFFF99", "title": "Abstract background color", "panelName": "notesAppearance"},
  {"type": "select", "name": "abstractFontSize", "default": "default", "title": "Abstract font size", "panelName": "notesAppearance",
    "option": [
      {"value": "default", "text": "(Default)"}
    ]
  },


  {"type": "checkbox", "name": "showConnectionPrompt", "default": false, "panelName": "advancedFeatures",
    "title": "Show Prompt for Current <br/>Google Drive Account"},
  {"type": "checkbox", "name": "showAddCalendar", "default": true , "panelName": "advancedFeatures",
    "title": "Show Button of <br/>Add to Google Calendar"},
  {"type": "checkbox", "name": "showDelete", "default": true, "title": "Show Button of <br/>Delete", "panelName": "advancedFeatures"},
  {"type": "checkbox", "name": "showNoteColorPicker", "default": true, "panelName": "advancedFeatures",
    "title": "Show Button of <br/>Note Color Picker"},
  {"type": "checkbox", "name": "showNoteHistory", "default": true, "title": "Show Note History<br/>(No effect for Inbox)", "panelName": "advancedFeatures"},
  {"type": "checkbox", "name": "showAbstractBracket", "default": true, "title": "Show bracket [] in the abstract",
  "panelName": "advancedFeatures"},
  {"type": "checkbox", "name": "enableNoDisturbMode", "default": false, "panelName": "advancedFeatures",
    "title": "Do Not Set Background Color <br/>When Note Is Empty"},
  {"type": "checkbox", "name": "enableRichtextEditor", "default": false, "title": "Enable Richtext Editor <br/>(Experimental)",
   "panelName": "advancedFeatures"},
  {"type": "checkbox", "name": "showPrintingNote", "default": true, "title": "Show Notes When Printing", "panelName": "advancedFeatures"},
  {"type": "checkbox", "name": "showSavingStatus", "default": true, "title": "Show Saving Status", "panelName": "advancedFeatures"},
  {"type": "checkbox", "name": "showNoteTimeStamp", "default": true, "title": "Show Note Modified Time",
   "panelName": "advancedFeatures"},
  {"type": "select", "name": "noteFolderName", "default": "_SIMPLE_GMAIL_NOTES_", "title": "Gmail Note Folder Name", "panelName": "advancedFeatures",
    "option": [
      {"value": "_SIMPLE_GMAIL_NOTES_", "text": "_SIMPLE_GMAIL_NOTES_"},
      {"value": "Simple Gmail Notes", "text": "Simple Gmail Notes"}
    ]
  },
  {"type": "checkbox", "name": "disableConsecutiveWarning", "default": "false", "title": "Disable Warning for Consecutive Network Requests", "panelName": "advancedFeatures",
  },

  {"type": "checkbox", "name": "showCRMButton", "default": true, "title": "Enable Share Button For 'Simple Mobile CRM'",
   "panelName": "simpleMobileCRM"},
  {"type": "checkbox", "name": "showCRMSuccessPage", "default": true, "title": "Show Success Page After Sharing",
   "panelName": "simpleMobileCRM"},
  {"type": "list", "name": "disabledAccounts", "default": "[]", "panelName": "simpleMobileCRM"},

  {"type": "textarea", "name": "templateContent", "default": ""},
];

var gSgnEmtpy = "<SGN_EMPTY>";
var gSgnDeleted = "<SGN_DELETED>";
var gSgnCrmDeleted = 'sgn-crm-has-deleted';
var gDuplicateNotesForMany = [];
var debugGdriveScope = "debugGdrive";
var debugBackGroundScope = "debugBackGround";
var debugContentScope = "debugContent";
var debugPageScope = "debugPage";


/* -- end -- */

/*
 * Interface declarations
 *
 * The following methods MUST be implemented by the Firefox / Chrome extension
 */

//The refresh token, access token and email for google drive are stored in
//local storage. Different gmails may have different sets of storage.
var isDebug = function(callback) {
  //turn on this only if u want to check initialization part, otherwise turn on 
  //isDebug on shared-common
  //
  //return true;  
  return false;
};

var openTab = function(page){
  if(SGNC.isChrome())
    SGNC.getBrowser().tabs.create({"url": "chrome-extension://" + SGNC.getExtensionID() + "/" + page});
  else
    SGNC.getBrowser().tabs.create({"url" : browser.extension.getURL(page)});
};


/*
var getRawStorageObject = function(){
  return localStorage;
};*/

var getRawPreferences = function(){
  storage = SGNC.getRawStorageObject();
  return storage; //preferences are put into local storage as well
};

var sendContentMessage = function(sender, message) {
  if(!message.action || message.action != 'heart_beat_response'){
    debugLog('@222', sender, message);
  }
  // debugLog('@221', sender, message);
  SGNC.getBrowser().tabs.sendMessage(sender.worker.tab.id, message, function(response) {
    //debugLog("Message response:", response);
  });
};


var sendAjax = function(config) {
  $.ajax(config);
};

var iterateArray = function(arr, callback){
  $.each(arr, callback);
};


/*
var getSGNWebLoginURL = function(url) {
  var result= SGNC.getSGNWebBaseURL() + "/sgn/signin/?url=" + encodeURIComponent(url);

  // debugLog('@242', result);
  return result;
};
*/

var handleGoogleAuthCode = function(code, sender, messageId, title, loginType) {
  debugLog("Code collected", code);
  if(!code || code.indexOf("error=") > 0 ){
    var error = "";
    if(!code)
      error = getLastError();
    else{
      //https://xxx/?error=access_denied#"
      error = code.split("error=")[1];
      error = error.replace(/#/g, '');
    }
        
    //var message = "[loginGoogleDrive]" + error;
    //SGNC.appendLog(message, debugGdriveScope);
    appendGdriveLog("loginGoogleDrive", error);
    sendContentMessage(sender, {action:"show_log_in_prompt"});
    sendContentMessage(sender, {action:"disable_edit"});

    sendContentMessage(sender, {action:"show_error", 
                                type:"login",
                                message:error});
  }else{
    //get code from redirect url
    if(code.indexOf("=") >= 0)  //for chrome
      code = code.split("=")[1];

    if(code.indexOf("&") >= 0)  //for chrome
      code = code.split("&")[0];

    code = code.replace("%2F", "/");

    code = code.replace(/[#]/g, "");
    debugLog("Collected code:" + code);
    SGNC.setStorage(sender, "code", code);
    updateRefreshTokenFromCode(sender, messageId, title, loginType);
  }

};

/*
var onWindowCreated =  function(win){
  console.log('@297');
  win.openerWin = window;
};

var launchsgnweblogin = function(sender, messageid, title) {
  debuglog("trying to login sgn web");
  var clientid = settings.client_id;
  var scope = settings.scope;
  var state = sender.email + "/" + sender.worker.tab.id + "/" + messageid;

  var url = getsgnwebloginurl("https://accounts.google.com/o/oauth2/auth?" + $.param({"client_id": clientid,
          "scope": scope,
          "redirect_uri": getredirecturi('sgn_web'),
          "response_type": "code",
          "access_type": "offline",
          "login_hint": sender.email,
          "state": state,
          //"login_hint":"",
          "prompt":"consent select_account" })); 

  if(SGNC.isChrome()){
    window.open(url, 'sgn_signin_popup', SGNC.getStrWindowFeatures(1000, 800));
  }
  else {  // for FF
    // need to do message handling
    var creating = SGNC.getBrowser().windows.create({allowScriptsToClose: true, url: url, type: 'popup', width:1000, height:800});
    creating.then(onWindowCreated);
  }

};
*/

var launchAuthorizer = function(sender, messageId, title) {
  debugLog("Trying to login Google Drive.");
  var clientId = settings.CLIENT_ID;
  var scope = settings.SCOPE;
  var result = SGNC.getBrowser().identity.launchWebAuthFlow(
    {"url": "https://accounts.google.com/o/oauth2/auth?" +
      $.param({"client_id": clientId,
          "scope": scope,
          "redirect_uri": SGNC.getRedirectUri(),
          "response_type":"code",
          "access_type":"offline",
          "login_hint":sender.email,
          //"login_hint":"",
          "prompt":"consent select_account"
      }),
      "interactive": true
    },
    function(code) {
      handleGoogleAuthCode(code, sender, messageId, title);
    }
  );

  debugLog("authentication result: ", result);
};

var getLastError = function(){
  return SGNC.getBrowser().runtime.lastError.message;
};

var removeCachedToken = function(tokenValue){
  SGNC.getBrowser().identity.removeCachedAuthToken({'token':tokenValue}, function(){});
};


/*
 * Shared Utility Functions
 */

function pushPreferences(preferences){
  $.each(gPreferenceTypes, function(index, gPreferenceTypesInfo){
    var key = gPreferenceTypesInfo["name"];
    localStorage[key] = preferences[key];
  });
}

function pullPreferences(){
  var preferences = {};

  updateDefaultPreferences(localStorage);
  $.each(gPreferenceTypes, function(index, gPreferenceTypesInfo){
    var key = gPreferenceTypesInfo["name"];
    preferences[key] = localStorage[key];
  });
  updateControls(preferences);
}

var debugLog = function(){ //need some further work
  if (isDebug() && console && debugLog) {
      console.log.apply(console, arguments);
  }
};

var appendGdriveLog = function(prefix, message, postfix){
  var result = "";

  if(message && typeof(message) !== 'string'){
    message = JSON.stringify(message);
  }

  if(prefix)
    result = result + "[" + prefix + "]";

  if(message)
    result = result + message;

  if(postfix)
    result = result + "[" + postfix + "]";

  SGNC.appendLog(result, debugGdriveScope);
};

var isEmptyPrefernce = function(preference){
  var val = String(preference);
  return val === "" || val == "null" || val == "undefined";
};

var updateDefaultPreferences = function(preferences){
  var hideListingNotes = (preferences["hideListingNotes"] === "true");
  //for backward compatible
  if(hideListingNotes){
    preferences["abstractStyle"] = "none";
    delete preferences["hideListingNotes"];
  }
  for (var i=0; i < gPreferenceTypes.length; i++) {
    var defaultValue = gPreferenceTypes[i]["default"];
    var preferencesName = gPreferenceTypes[i]["name"];
    if (isEmptyPrefernce(preferences[preferencesName])) {
      preferences[preferencesName] = defaultValue;
    }
  }
  if(!settings.NOTE_NAMES.includes(preferences["noteFolderName"])) {
    preferences["noteFolderName"] = "_SIMPLE_GMAIL_NOTES_";
  }
  return preferences;
};

var getPreferences = function(){
  var preferences = getRawPreferences();

  return updateDefaultPreferences(preferences);
};

var getPreferenceAbstractStyle = function() {
  var preferences = getPreferences();
  var abstractStyle = preferences["abstractStyle"];

  return abstractStyle;
};

//Post message to google drive via REST API
//Reference: https://developers.google.com/drive/web/quickstart/quickstart-js

var getMultipartRequestBody = function(metadata, content){

  var boundary = "-------314159265358979323846";
  var contentType = "text/plain";
  var delimiter = "\r\n--" + boundary + "\r\n";
  var close_delim = "\r\n--" + boundary + "--";
  var multipartRequest;
  var multipartRequestContent =
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            JSON.stringify(metadata) ;

  if(content){
         
       var base64Data = btoa(unescape(encodeURIComponent(content)));
       multipartRequestContent = multipartRequestContent +
        delimiter +
            'Content-Type: ' + contentType + '\r\n' +
            'Content-Transfer-Encoding: base64\r\n' +
            '\r\n' +
            base64Data;

  }
        
  multipartRequestContent = multipartRequestContent + close_delim;
  multipartRequest = {
      multipartRequestBody: multipartRequestContent,
      boundary: boundary
  };
  return multipartRequest;

};

var postNote = function(sender, messageId, emailTitleSuffix, gdriveFolderId, gdriveNoteId, content, properties){
  debugLog("Posting content", content);
  debugLog("Google Drive folder ID", gdriveFolderId);

  executeIfValidToken(sender, function(data){
    var uploadUrl =  "https://www.googleapis.com/upload/drive/v2/files";
    var methodType = "POST";

    if(gdriveNoteId){  //update existing one
      uploadUrl += "/" + gdriveNoteId;
      methodType = "PUT";
    }

    var noteDescripton = SGNC.stripHtml(content).substring(0,4096);
    if(content == gSgnEmtpy){
      noteDescripton = gSgnEmtpy;
    }

    var metadata = { title:messageId + " - " + emailTitleSuffix , parents:[{"id":gdriveFolderId}], 
                     description: noteDescripton, properties:properties};
    
    var multipartRequest = getMultipartRequestBody(metadata, content);
    sendAjax({
      type:methodType,
      url:uploadUrl + "?uploadType=multipart",
      headers: {
          "Authorization": "Bearer " + SGNC.getStorage(sender, settings.ACCESS_TOKEN_KEY)
      },
      contentType: "multipart/related; boundary=\"" + multipartRequest.boundary + "\"",
      data: multipartRequest.multipartRequestBody,
      success: function(data){
        debugLog("message posted successfully");
        sendContentMessage(sender, {action:"revoke_summary_note", 
                                    messageId: messageId,
                                    gdriveNoteId: data["id"],
                                    gdriveFolderId: data["parents"][0]["id"]});

        sendContentMessage(sender, {action:"show_timestamp_and_notice", 
                                    messageId: messageId,
                                    modifiedTime: formatDate(data.modifiedDate, true)
                                    });
      },
      error: function(data){
        //var message = "[postNote]" + JSON.stringify(data);
        //SGNC.appendLog(message, debugGdriveScope);
        appendGdriveLog("postNote", data);
        sendContentMessage(sender, {action:"show_error", 
                                    type:"custom", 
                                    message:"Faild post message, error: " + 
                                      JSON.stringify(data)});
      }
    });
  });
};

var showRefreshTokenError = function(sender, error){
  if(error && typeof(error) === "object"){
    if(error.responseText && error.responseText.indexOf("{") >= 0){ 
      //got an explicit error from google
      logoutGoogleDrive(sender);
    }
    error = JSON.stringify(error);
  }

  //var preferences = getPreferences();
  //preferences['debugBackgroundInfo'] += " Refresh token error: " + error + ".";
  var message = " Refresh token error: " + error + ".";
  SGNC.appendLog(message, debugBackGroundScope);

  sendContentMessage(sender, {action:"show_error", type:"revoke"});
};


var updateRefreshTokenFromCode = function(sender, messageId, title, loginType){
  var clientId = settings.CLIENT_ID;
  var clientSecret = settings.CLIENT_SECRET;
  var refreshTokenKey = settings.REFRESH_TOKEN_KEY;
  var accessTokenKey = settings.ACCESS_TOKEN_KEY;


  // console.log('@555', clientId, loginType);
  sendAjax({
    type: "POST",
    contentType: "application/x-www-form-urlencoded",
    data: {
        "code":SGNC.getStorage(sender, "code"),
        "client_id": clientId,
        "client_secret": clientSecret,
        "redirect_uri": SGNC.getRedirectUri(loginType),
        "grant_type":"authorization_code"
    },
    url: "https://www.googleapis.com/oauth2/v3/token",
    error: function(data){
      //var message = "[updateRefreshTokenFromCode]" + JSON.stringify(data);
      //SGNC.appendLog(message, debugGdriveScope);
      appendGdriveLog("updateRefreshTokenFromCode", data);
      showRefreshTokenError(sender, data);
    },
    success: function(data){
      if(!data.refresh_token){
        showRefreshTokenError(sender, 
          "Google Drive token could not be collected.");
        //for future revoking
        SGNC.setStorage(sender, accessTokenKey, data.access_token); 
      }else{
        debugLog("Updated refresh token", data);
        SGNC.setStorage(sender, refreshTokenKey, data.refresh_token);
        SGNC.setStorage(sender, accessTokenKey, data.access_token);

        initialize(sender, messageId, title);
        updateUserInfo(sender);
      }
    }
  });
};

var updateUserInfo = function(sender){
  if(SGNC.getStorage(sender, "gdrive_email")){
    sendContentMessage(sender, {action:"update_user", 
                         email:SGNC.getStorage(sender, "gdrive_email")});
    return;
  }

  executeIfValidToken(sender, function(data){
    sendAjax({
      url:"https://www.googleapis.com/drive/v2/about?access_token=" + 
        SGNC.getStorage(sender, settings.ACCESS_TOKEN_KEY),
      success:function(data){
        SGNC.setStorage(sender, "gdrive_email", data.user.emailAddress);
        sendContentMessage(sender, {action:"update_user", 
                             email:data.user.emailAddress});
      },
      error:function(data){
        //var message = "[updateUserInfo]" + JSON.stringify(data);
        //SGNC.appendLog(message, debugGdriveScope);
        appendGdriveLog("updateUserInfo", data);
        sendContentMessage(sender, {action:"show_error", type:"user"});
      }
    });
  });
};

var executeIfValidToken = function(sender, command){
  var clientId = settings.CLIENT_ID;
  var clientSecret = settings.CLIENT_SECRET;
  var refreshTokenKey = settings.REFRESH_TOKEN_KEY;
  var accessTokenKey = settings.ACCESS_TOKEN_KEY;


  if(!SGNC.getStorage(sender, accessTokenKey) && 
     !SGNC.getStorage(sender, refreshTokenKey)){  //if acccess token not found
      
    debugLog("@197, no token found, skip the verification");
    showRefreshTokenError(sender, "No token found.");
    return;
  }

  sendAjax({
    url:"https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=" + 
          SGNC.getStorage(sender, accessTokenKey),
    timeout: 10000,
    success:function(data){
      command(data);
    },
    error:function(data){
      debugLog("@474, token not valid!: " + data);
      //get a new access token
      if(data["status"] && data["status"] >= 400){
        sendAjax({
          type: "POST",
          contentType: "application/x-www-form-urlencoded",
          data: {
              "refresh_token": SGNC.getStorage(sender, refreshTokenKey),
              "client_id": clientId,
              "client_secret": clientSecret,
              "redirect_uri": SGNC.getRedirectUri(),
              "grant_type": "refresh_token"
          },
          url: "https://www.googleapis.com/oauth2/v3/token",
          success:function(data){
            debugLog("Renewed token");
            SGNC.setStorage(sender, accessTokenKey, data.access_token);
            command(data);
          },
          error:function(data){
            //var message = "[executeIfValidToken]" + JSON.stringify(data);
            //SGNC.appendLog(message, debugGdriveScope);
            appendGdriveLog("executeIfValidToken", data);
            showRefreshTokenError(sender, data);
          }
        });
      }
      else{
        sendContentMessage(sender, {action:"show_error", 
                                    type:"custom",
                                    message:"Network error found, please check your connectivity to Google servers."});
      }
    }
  });
};


// the revoke should be manually done by the user now
/*
var revokeToken = function(sender){
  var tokenValue = SGNC.getStorage(sender, "access_token");
  if(tokenValue){
    debugLog("Revoking access token: ", tokenValue);
    removeCachedToken(tokenValue);
    sendAjax({
      url:"https://accounts.google.com/o/oauth2/revoke?token=" + tokenValue,
      complete:function(data){
        debugLog("Revoke done", data);
        if(data.status == 200 || data.status == 400){
          debugLog("Removing local data");
          //SGNC.setStorage(sender, "access_token", "");
          //SGNC.setStorage(sender, "refresh_token", "");
          //SGNC.setStorage(sender, "gdrive_email", "");
          //sendContentMessage(sender, {action:"show_log_in_prompt"});
          //sendContentMessage(sender, {action:"disable_edit"});
          logoutGoogleDrive(sender);
        }

      }
    });
  }
};
*/

var logoutGoogleDrive = function(sender){
  SGNC.setStorage(sender, "code", "");
  SGNC.setStorage(sender, settings.ACCESS_TOKEN_KEY, "");
  SGNC.setStorage(sender, settings.REFRESH_TOKEN_KEY, "");
  SGNC.setStorage(sender, "gdrive_email", "");
  SGNC.setStorage(sender, "crm_user_email", "");
  sendContentMessage(sender, {action:"show_log_in_prompt"});
  sendContentMessage(sender, {action:"disable_edit"});
};


var loadMessage = function(sender, gdriveNoteId, messageId, properties, description, modifiedTime){
  sendAjax({
    type:"GET",
    headers: {
      "Authorization": "Bearer " + SGNC.getStorage(sender, settings.ACCESS_TOKEN_KEY)
    },
    url: "https://www.googleapis.com/drive/v2/files/" + 
          gdriveNoteId + "?alt=media",
    success: function(data) {
      debugLog("Loaded message", data);
      if(data == gSgnEmtpy || SGNC.isMarkCrmDeleted(properties))
        data = "";

      if(!properties)
        properties = [];

      sendContentMessage(sender, {action:"update_content", content:data, 
                                  messageId:messageId, gdriveNoteId:gdriveNoteId, 
                                  properties:properties, modifiedTime: modifiedTime});

      sendContentMessage(sender, {action:"enable_edit", 
                                  content:data, 
                                  description: description,
                                  properties:properties,  
                                  messageId:messageId, 
                                  gdriveEmail:SGNC.getStorage(sender, "gdrive_email")});  
    },
    error: function(data){
      //var message = "[loadMessage]" + JSON.stringify(data);
      //SGNC.appendLog(message, debugGdriveScope);
      appendGdriveLog("loadMessage", data);
      sendContentMessage(sender, {action:"show_error", 
                           type: "custom", 
                           message:"Faild load message, error: " + 
                                    JSON.stringify(data)});
    }
  });
};


var getFolderName = function(){
  var preferences = getPreferences();
  var folderName = preferences["noteFolderName"];

  return folderName;
};

var getFolderQuery = function(){
  var query = "";
  for(var i=0;i<settings.NOTE_NAMES.length;i++){
    query = query + "title='" + settings.NOTE_NAMES[i] +"'";
    if(i != settings.NOTE_NAMES.length - 1){
      query = query + "or";
    }
  }

  return query;
};



//Set up notes token validity checking
var setupNotesFolder = function(sender, description, properties, messageId){
  sendAjax({
      type: "POST",
      dataType: 'json',
      contentType: "application/json",
      headers: {
          "Authorization": "Bearer " + SGNC.getStorage(sender, settings.ACCESS_TOKEN_KEY)
      },
      data: JSON.stringify({
            "title": getFolderName(),
            "parents": [{"id":"root"}],
            "mimeType": "application/vnd.google-apps.folder"
      }),
      url: "https://www.googleapis.com/drive/v2/files",
      success: function(data){
       var gdriveFolderId = data.id;
       sendContentMessage(sender, {action:"update_gdrive_note_info", 
                            gdriveNoteId:"", 
                            gdriveFolderId:gdriveFolderId});
       //ready for write new message
       sendContentMessage(sender, {action:"enable_edit",
                                   content:'',
                                   description:description,
                                   properties:properties,
                                   messageId:messageId,
                                   gdriveEmail:SGNC.getStorage(sender, "gdrive_email")});
       debugLog("Data loaded:", data);
     },
    error: function(data){
      //var message = "[setupNotesFolder]" + JSON.stringify(data);
      //SGNC.appendLog(message, debugGdriveScope);
      appendGdriveLog("setupNotesFolder", data);
    }
  });
};

var sendAjaxAfterValidToken = function(sender, query, ajaxData, success_cb, error_cb, baseWaiting) {
  executeIfValidToken(sender, function(data){
    sendAjax({
      type:"GET",
      dataType: 'json',
      contentType: "application/json",
      data: ajaxData,
      headers: {
          "Authorization": "Bearer " + SGNC.getStorage(sender, settings.ACCESS_TOKEN_KEY)
      },
      url: query,
      success:function(data){
        //remove the items in the trash
        if(data.items && data.items.length){
          for(var i = data.items.length - 1; i >= 0; i--) {
            var item = data.items[i];
            if(item.labels && item.labels.trashed) { // a trashed item
               data.items.splice(i, 1);
            }
          }
        }

        success_cb(data);
      },
      error:function(data){
        if(data["status"] && data["status"] >= 400 && baseWaiting <= 2){
          appendGdriveLog("gdriveQueryRetry", data, query);
          var sleepTime = parseInt((baseWaiting + Math.random()) * 1000);
          setTimeout(function(){
            sendAjaxAfterValidToken(sender, query, ajaxData, success_cb, error_cb, baseWaiting * 2);
          }, sleepTime);
        }
        else{
          //maxmium attempts reached
          if(error_cb) 
            error_cb(data);


          appendGdriveLog("gdriveQueryFail", data, query);
          sendContentMessage(sender, {action:"show_error",
                                      type:"custom",
                                      message:"Google Drive error: " +
                                      JSON.stringify(data)});

        }
      }
    });
  });
};

var appendQueryTrashedParam = function(query) {
  if(!query.startsWith("trashed")){  //only append once
      query = "trashed = false and ( " + query + ")";
      query = encodeURIComponent(query);
  }

  debugLog("Search message by query:", query);
  return query;
};

var gdriveQuery = function(sender, query, success_cb, error_cb, baseWaiting){
  if(baseWaiting === undefined)
    baseWaiting = 1; //default retry count

  query = appendQueryTrashedParam(query);
  var queryUrl = "https://www.googleapis.com/drive/v2/files?q=" + query;
  sendAjaxAfterValidToken(sender, queryUrl, {}, success_cb, error_cb, baseWaiting)

};

var extractTitle = function(orgTitle){
  if(!orgTitle)
    return "";

  var title = orgTitle.toLowerCase().trim();

  while(true){
    if(title.startsWith("re:")){
      title = title.substring(3).trim();
    }
    else if(title.startsWith("fwd:")){
      title = title.substring(4).trim();
    }
    else{
      break;
    }
  }

  return title;
};

var renameNoteFolder = function(sender, folderId){

  sendAjax({
    type:"PATCH",
    dataType: "json",
    url: "https://www.googleapis.com/drive/v2/files/" + folderId,
    headers: {
        "Authorization": "Bearer " + SGNC.getStorage(sender, settings.ACCESS_TOKEN_KEY)
    },
    contentType: "application/json",
    data: JSON.stringify({
            "title": getFolderName(),
            "mimeType": "application/vnd.google-apps.folder"
      }),

    success: function(data){
      debugLog("change note name successfully");
    },
    error: function(data){
      //var message = "[renameNoteFolder]" + JSON.stringify(data);
      //SGNC.appendLog(message, debugGdriveScope);
      appendGdriveLog("renameNoteFolder", data);

      sendContentMessage(sender, {action:"show_error", 
                              type:"custom", 
                              message:"Faild change name, error: " + 
                              JSON.stringify(data)});
    }
  });
      
};


var removeDuplicateAndEmptyMessages = function(messageList){
  var newMessageList = [];
  var finalMessageList = [];
  var foundMessage = {};
  var i, message, messageId;
  gDuplicateNotesForMany = [];
  //the logic must be in two rounds

  //remove duplicate ones
  for(i=0; i<messageList.length; i++){
    message = messageList[i];
    messageId = message["id"];

    if(foundMessage[messageId]){
      gDuplicateNotesForMany.push(message); 
      continue;
    }

    newMessageList.push(message);
    foundMessage[messageId] = true;
  }

  //remove empty ones and deleted ones
  for(i=0; i<newMessageList.length; i++){
    message = newMessageList[i];
    if(message["description"] == gSgnEmtpy)
      continue;

    finalMessageList.push(message);
  } 

  return finalMessageList;
  
};

var searchNoteHistory = function(sender, gdriveFolderId, messageId, title){
  var originalTitle = title;

  title = extractTitle(title);

  if(title === "")
    return null;

  //fullText contain must be alpha numeric
  var searchTitle = title.replace(/[^a-zA-Z0-9]/g, " ");
  searchTitle = shrinkSearchContent(searchTitle);
  var query = "(not properties has { key='"+gSgnCrmDeleted+"' and value='true' and visibility='PUBLIC' }) and " + 
  "(fullText contains '" + searchTitle + "')"; 
  gdriveQuery(sender, query, 
    function(data){ //success callback
      var i, currentItem;
      debugLog("@521", query, data);

      //first pass, get folder id for gmail notes
      for(i=0; i<data.items.length; i++){
        currentItem = data.items[i];
      }
      
      //second pass find the document
      debugLog("Searching message", title);
      total_found = 0;
      result = [];

      var needShow = false;
      for(i=0; i<data.items.length; i++){
        currentItem = data.items[i];

        var currentMessageId = currentItem.title.split(" ")[0];
        var currentItemTitle = extractTitle(currentItem.title.substring(19));
        if(currentItemTitle == title){
            var crmDeleteTag = false;
            var properties = currentItem.properties;

          if(currentMessageId != messageId){
            needShow = true;

            result.push({"id": currentMessageId, 
                         "noteId": currentItem.id,
                         "description": currentItem.description,
                         "properties": currentItem.properties,
                         "modifiedDate": currentItem.modifiedDate,
                         "createdDate": currentItem.createdDate});

          }
        }

        result = removeDuplicateAndEmptyMessages(result);
      }
  
      if(needShow){
        var preferences = getPreferences();
        sendContentMessage(sender, {action: "update_history", 
                                    data:result, 
                                    messageId:messageId, 
                                    title:originalTitle,
                                    preferences:preferences});
      }
  }, function(data){
    //var message = "[searchNoteHistory]" + JSON.stringify(data);
    //SGNC.appendLog(message, debugGdriveScope);
    appendGdriveLog("searchNoteHistory");
  });
};


//list the files created by this app only (as restricted by permission)
var searchNote = function(sender, messageId, title){
  // debugLog("@1065 messageId", messageId);
   
  var query = getFolderQuery() + " or title contains '" + messageId +"'";
  gdriveQuery(sender, query, 
    function(data){ //success callback
      var gdriveFolderIds = [];
      var gdriveFolderId = "";
      var gdriveNoteId = "";
      var properties = [];
      var description = "";
      var modifiedTime = "";
      var i, j, currentItem, currentFolderName;

      debugLog("@403", query, data);
      //first pass, get folder id for gmail notes
      for(i=0; i<data.items.length; i++){
        currentItem = data.items[i];
        for(j=0; j<settings.NOTE_NAMES.length; j++){
          currentFolderName = settings.NOTE_NAMES[j];

          if(currentFolderName.toLowerCase() == currentItem.title.toLowerCase() &&
             currentItem.parents[0].isRoot){
            //found the root folder
            gdriveFolderId = currentItem.id;
            gdriveFolderIds.push(currentItem.id);
            if(currentItem.title != getFolderName()){
                renameNoteFolder(sender, gdriveFolderId);  
            }
          }
        }
      }

      if(gdriveFolderIds.length == 0){
        setupNotesFolder(sender, description, properties, messageId);
      }
      else{
        //second pass find the document
        debugLog("Searching message", messageId);
        for(i=0; i<data.items.length; i++){
          currentItem = data.items[i];
          /*
          if(currentItem.description === gSgnDelete)
            continue;
            */
          if(messageId.length &&
             currentItem.title.indexOf(messageId) === 0 && 
             gdriveFolderIds.includes(currentItem.parents[0].id)){
            gdriveNoteId = currentItem.id;
            properties = currentItem.properties;
            description = currentItem.description;
            modifiedTime = formatDate(currentItem.modifiedDate, true);
            break;
          }
        }

        debugLog("Google Drive Folder ID found", gdriveNoteId);
//
        
        sendContentMessage(sender, {action:"update_gdrive_note_info", 
                           gdriveNoteId:gdriveNoteId, 
                           gdriveFolderId:gdriveFolderIds[0]});
        if(gdriveNoteId){
          loadMessage(sender, gdriveNoteId, messageId, properties, description, 
                modifiedTime);

          if(preferences['showNoteHistory'] !== 'false' && title){
            searchNoteHistory(sender, gdriveFolderIds[0], messageId, title);
          }
        }else{//ready for write new message
          sendContentMessage(sender, {
              action:"enable_edit",
              content:'',
              description:description,
              properties:properties,
              messageId:messageId,
              gdriveEmail:SGNC.getStorage(sender, "gdrive_email")
          });
        }
      }
    },
    function(data){ //error callback
      //showRefreshTokenError(sender, data);
      //var message = "[searchNote]" + JSON.stringify(data);
      //SGNC.appendLog(message, debugGdriveScope);
      appendGdriveLog("searchNote");
    }
  );
};

//Do as much initilization as possible, while not trigger login page
var initialize = function(sender, messageId, title){
  var accessTokenKey = settings.ACCESS_TOKEN_KEY;
  var refreshTokenKey = settings.REFRESH_TOKEN_KEY;
  var preferences = getPreferences();
  //preferences['debugBackgroundInfo'] = "Extension Version: " + SGNC.getExtensionVersion();

  //sendContentMessage(sender, {action:"update_preferences", preferences:preferences});

  debugLog("@476", preferences);
  if(SGNC.getStorage(sender, refreshTokenKey)){
    debugLog("Initializing, current refresh token:", 
                SGNC.getStorage(sender, refreshTokenKey), 
                accessTokenKey, 
                SGNC.getStorage(sender, accessTokenKey));
    searchNote(sender, messageId, title);

    //if(preferences['showNoteHistory'] !== 'false'){
      //searchNoteHistory(sender, messageId, title); 
    //}
  }
  else{ //no refresh token
    if(SGNC.getStorage(sender, accessTokenKey)){
      logoutGoogleDrive(sender);
    }
    sendContentMessage(sender, {action:"show_log_in_prompt"});
    sendContentMessage(sender, {action:"disable_edit"});
  }
};



var sendSummaryNotes = function(sender, pullList, resultList){
  var result = [];
  var itemDict = {};
  var abstractStyle = getPreferenceAbstractStyle();

  iterateArray(resultList, function(index, emailItem){
    var emailId = emailItem.title.split(" ")[0];
    debugLog("@477", emailId);

    //we collect the first one
    if(emailItem.description && !itemDict[emailId]){
      itemDict[emailId] = emailItem;
    }
  });

  debugLog("@482", pullList, resultList);

  for(var i=0; i<pullList.length; i++){
    var emailId = pullList[i];
    var description = ""; //empty string for not found
    var shortDescription = "";
    var properties = [];

    var preferences = getPreferences();
    var item = itemDict[emailId];
    if(item && item.description != gSgnEmtpy){
      
      if(item.properties)
        properties = item.properties;

      description = item.description;
      shortDescription = SGNC.getSummaryLabel(description, preferences);
    }
    else{
      emailId = gSgnEmtpy;
      description = gSgnEmtpy;
      shortDescription = gSgnEmtpy;
    }

    result.push({"id":emailId, "description":description, "short_description":shortDescription, "properties":properties});
  }
  sendContentMessage(sender, {email:SGNC.getStorage(sender, "gdrive_email"), 
                              action:"update_summary", noteList:result});
};

var pullNotes = function(sender, pendingPullList){
  var abstractStyle = getPreferenceAbstractStyle();
  var i;

  if(abstractStyle == "none" || !SGNC.getStorage(sender, settings.ACCESS_TOKEN_KEY)){
    debugLog("@482, skipped pulling because settings -> hide listing notes or no access token");
    sendSummaryNotes(sender, pendingPullList, []);  //send an empty result
    return;
  }

  if(pendingPullList.length === 0){
    debugLog("Empty pending list, no need to pull");
    return;
  }

  //var preferences = getPreferences();
  //sendContentMessage(sender, {action:"update_preferences", preferences:preferences});
  debugLog("@414", pendingPullList);

  var totalRequests = Math.floor((pendingPullList.length-1) / 120) + 1;

  var foundItemDict = {};
  for(i=0; i<totalRequests; i++){
    var query = "1=1";
    var startIndex = i*120;
    var endIndex = (i+1)*120;

    if(endIndex > pendingPullList.length)
      endIndex = pendingPullList.length;


    var partialPullList = pendingPullList.slice(startIndex, endIndex);


    iterateArray(partialPullList, function(index, messageId){
      query += " or title contains '" + messageId + "'";
    });
    query = query + ")";

    query = query.replace("1=1 or", "");  //remove the heading string

    query = "(" + query + " and (not properties has { key='"+gSgnCrmDeleted+"' and value='true' and visibility='PUBLIC' })";
    debugLog("@431, query", query);
    (function(pullList){gdriveQuery(sender, query, 
      function(data){ //success callback
        debugLog("@433, query succeed", data);
        sendSummaryNotes(sender, pullList, data.items);

        for(var i=0; i<data.items.length; i++){
          var item = data.items[i];

          foundItemDict[item.id] = true;
        }

      },
      function(data){ //error callback
        debugLog("@439, query failed", data);
        //var message  = "[pullList]" + JSON.stringify(data);
        //SGNC.appendLog(message, debugGdriveScope);
        appendGdriveLog("pullList");
      }
      );
      })(partialPullList);
  }

  var missedItems = [];
  for(i=0; i<pendingPullList.length; i++){
    var id = pendingPullList[i];
    if(!foundItemDict[id]){
      missedItems.push(id);
    }
  }

};


var padOneZero = function(str){
  str = str.toString();
  
  if(str.length < 2)
    return "0" + str;

  return str;
};

var formatDate = function(initialDate, includeTime){
  var formatedDate;
  var date = new Date(initialDate);
  var year = date.getFullYear();
  var month = padOneZero(date.getMonth() + 1);
  var day = padOneZero(date.getDate());

  formatedDate = year + "-" + month + "-" + day;

  if(includeTime){
    var hour = padOneZero(date.getHours());
    var minute = padOneZero(date.getMinutes());
    var second = padOneZero(date.getSeconds());
    formatedDate = formatedDate + " " + hour + ":" + minute + ":" + second;
  }

  return formatedDate;

};

var getMultipart = function(noteInfos, authToken, requestUrl, method){
  var options = [];
  var boundary = "-------314159265358979323846";
  var multiBody = "";
  for(var i=0; i<noteInfos.length; i++){
    // var url =  "/drive/v2/files/" + noteIds[i] + "/trash";
    var url = requestUrl.replace("{note_id}", noteInfos[i]["noteId"]); 

    var body = "--" + boundary + "\r\n" + "Content-Type: application/http" + "\r\n" + 
          "content-id: " + (i + 1) + "\r\n" + 
          "content-transfer-encoding: binary" + "\r\n\r\n" + 
          method +' '+ url + '\r\n'  + 
          'Authorization: Bearer ' + authToken + '\r\n' +
          'Content-Type: application/json; charset=UTF-8' + '\r\n\r\n' ;

    if(noteInfos[i]["metadata"]){
      body = body + JSON.stringify(noteInfos[i]["metadata"]) + '\r\n';
    }

    if(i === noteInfos.length - 1){
      body = body + "--" + boundary + "--";  
    }
    multiBody = multiBody + body;
  }
  debugLog("@1139 options", multiBody);
  return multiBody;
};

//https://stackoverflow.com/questions/33289711/parsing-gmail-batch-response-in-javascript
var parseBatchResponse = function(response){
  var delimiter = response.substr(0, response.indexOf('\r\n'));
  var parts = response.split(delimiter);
  parts.shift();
  parts.pop();

  var result = [];
  for (var i = 0; i < parts.length; i++) {
    var part = parts[i];
    var p = part.substring(part.indexOf("{"), part.lastIndexOf("}") + 1);
    result.push(JSON.parse(p));
  }

  return result;
};

var batchDo = function(sender, requestMethod, requestUrl, noteInfos, 
                            successCommand, errorCommand){
  executeIfValidToken(sender, function(data){
    var batchUrl = "https://www.googleapis.com/batch/drive/v2";
    var methodType = "POST";
    var accessTokenKey = settings.ACCESS_TOKEN_KEY;
    sendAjax({
      type:methodType,
      url:batchUrl,
      headers: {
          "content-type": 'multipart/mixed; boundary="-------314159265358979323846"',
          "Authorization": "Bearer " + SGNC.getStorage(sender, accessTokenKey)
      },
      data: getMultipart(noteInfos, SGNC.getStorage(sender, accessTokenKey), requestUrl, requestMethod),
      success: function(data){
        var response = parseBatchResponse(data);
        successCommand(response);
      },
      error: function(data){
        errorCommand(data);
      }
    });
  });
};

var markShareNoteList = function(sender, noteInfos){
  var resultData = [];
  var requestUrl = "/drive/v2/files/{note_id}?uploadType=multipart";
  var requestMethod = "PUT";
  batchDo(sender, requestMethod, requestUrl, noteInfos, function(data){
    debugLog("share notes", data);
  }, function(data){
    //var message = "[markShareNoteList]" + JSON.stringify(data);
    //SGNC.appendLog(message, debugGdriveScope);
    appendGdriveLog("markShareNoteList", data);
    debugLog("failed to share notes", data);
  });
};


var markDeleteNoteList = function(sender, noteInfos, gdriveFolderId){
  var resultData = [];
  var requestUrl = "/drive/v2/files/{note_id}?uploadType=multipart";
  var requestMethod = "PUT";
  batchDo(sender, requestMethod, requestUrl, noteInfos, function(data){
    var messageId = "";
    for(var i=0; i<data.length; i++){
      messageId = data[i]["title"].split("-")[0].replace(/\s/g, '');
      resultData.push({"messageId": messageId, "properties": data[i]["properties"]});
    }
    sendContentMessage(sender, {action:"delete_crm_notes", noteList: resultData,
                        email: SGNC.getStorage(sender, "gdrive_email")});
    sendContentMessage(sender, {email: SGNC.getStorage(sender, "gdrive_email"),
                            action: "show_success_delete_message"
                            });
  }, function(data){
    //var message = "[markDeleteNoteList]" + JSON.stringify(data);
    //SGNC.appendLog(message, debugGdriveScope);
    appendGdriveLog("markDeleteNoteList", data);
    debugLog("fail to mark Note(Deleted)", data);
  });
};

var actualDeleteNoteList = function(sender, noteInfos, gdriveFolderId){
  var requestMethod = "POST";
  var requestUrl = "/drive/v2/files/{note_id}/trash";

  batchDo(sender, requestMethod, requestUrl, noteInfos, function(data){
    debugLog("message deleted successfully");
    sendContentMessage(sender, {email: SGNC.getStorage(sender, "gdrive_email"),
                            action: "show_success_delete_message"
                            });
  }, function(data){
    debugLog("message deleted failed");
    //var message = "[deleteNoteList]" + JSON.stringify(data);
    //SGNC.appendLog(message, debugGdriveScope);
    appendGdriveLog("deleteNoteList", data);
    sendContentMessage(sender, {email: SGNC.getStorage(sender, "gdrive_email"),
                          action: "show_error_delete_message"});
  });
};


var shrinkSearchContent = function(content){
  var maxLength = 100;  //this is hard limit by google
  var newContent = content.trim();
  if(newContent.length <= maxLength)
    return newContent;  //happy ending

  newContent = newContent.substring(0, maxLength);
  var lastSpaceIndex = newContent.lastIndexOf(" ");
  if(lastSpaceIndex > 0){
    newContent = newContent.substring(0, lastSpaceIndex);
  }

  //debugLog("@1393, shrinked content", newContent);
  return newContent;
};

var searchNoteList = function(sender, gdriveFolderId, searchContent) {
  var notes = [];
  var initialNotes = [];
  var startQueryUrl = "https://www.googleapis.com/drive/v2/files?q=";
  query = "(not properties has { key='"+gSgnCrmDeleted+"' and value='true' and visibility='PUBLIC' }) and " +
                  "(parents in '" + gdriveFolderId + "')"; 
  if (searchContent) {
    searchContent = shrinkSearchContent(searchContent);
    query = query + " and fullText contains '" + searchContent + "'";
  }
  query = appendQueryTrashedParam(query);
  startQueryUrl = startQueryUrl + query;

  var getFirstHundredNotes = function(searchFullUrl, ajaxData){
    sendAjaxAfterValidToken(sender, searchFullUrl, ajaxData, function(data){
      initialNotes = initialNotes.concat(data.items)
      for(var i=0; i<initialNotes.length; i++){
        var description = initialNotes[i].description;
        var length = description.length;
        if (length > 50){
            length = 50;
        }
        var shortDescription = SGNC.getShortDescription(description, length);

        var content = description;
        // remove previous description html tag
        var crmContent = SGNC.htmlUnescape(SGNC.stripHtml(content));
        
        var initialTitle = initialNotes[i].title;
        var messageId = initialTitle.split("-")[0].replace(/\s/g, '');
        var noteDatetime = initialNotes[i].modifiedDate;
        var properties = initialNotes[i].properties;

        var position = initialTitle.indexOf("-");
        var title = initialTitle.substring(position+1, initialTitle.length);

        var modifiedTime  = formatDate(noteDatetime, true);
        var modifiedDate = formatDate(noteDatetime);

        notes.push({
          'noteId': initialNotes[i].id, 
          'id': messageId,
          'description': description,
          'messageId': messageId,
          'shortDescription': shortDescription,
          'content': crmContent,
          'modifiedDate': modifiedDate,
          'modifiedTime': modifiedTime,
          'properties': properties,
          'title': title
        });
      }
      notes = removeDuplicateAndEmptyMessages(notes);
      // debugLog("@1563 notes", notes.length);
      if (notes.length >= 100 || !data.nextPageToken) {
        notes = notes.slice(0, 100);
        sendContentMessage(sender, {action:"show_search_result", notes: notes, 
                                  email: sender.email});
        return;
      }
      if (data.nextLink && data.nextPageToken) {
        debugLog("@1527------ data.nextLink", data.nextLink);
        getFirstHundredNotes(data.nextLink, {"nextPageToken": data.nextPageToken});
      }

    },function(data){
      //var message = "[searchNoteList]" + JSON.stringify(data);
      //SGNC.appendLog(message, debugGdriveScope);
      appendGdriveLog("searchNoteList");
    }, 1);
    
  };

  getFirstHundredNotes(startQueryUrl, searchContent);

};

var deleteNoteByNoteId = function(sender, messageId, gdriveNoteId, markCrmDeleted){
  executeIfValidToken(sender, function(data){
    var deleteUrl =  "https://www.googleapis.com/drive/v2/files/" + gdriveNoteId + "/trash";
    var methodType = "POST";
    var requestBody = "";

    var contentType = "application/json";
    if(markCrmDeleted){
      deleteUrl =  "https://www.googleapis.com/drive/v2/files/" + gdriveNoteId + "?uploadType=multipart";
      methodType = "PUT";
      //mark the single deleted note for crm
      var properties = [{"key" : gSgnCrmDeleted, "value" : true, "visibility": "PUBLIC"}];
      var metadata = {properties: properties, description: gSgnDeleted};
      var multipartRequest = getMultipartRequestBody(metadata);
      requestBody = multipartRequest.multipartRequestBody;
      contentType = "multipart/related; boundary=\"" + multipartRequest.boundary + "\"";
    }

    sendAjax({
      type:methodType,
      url:deleteUrl,
      dataType: 'json',
      contentType: contentType,
      data: requestBody,
      headers: {
          "Authorization": "Bearer " + SGNC.getStorage(sender, settings.ACCESS_TOKEN_KEY)
      },
      success: function(data){
        debugLog("message deleted successfully");
        if(markCrmDeleted){
          var noteList = [];
          noteList.push({"messageId": messageId, "properties":data["properties"]});
          sendContentMessage(sender, {action:"delete_crm_notes",
                              email: SGNC.getStorage(sender, "gdrive_email"),
                              noteList: noteList});
        }
        sendContentMessage(sender, {action:"revoke_summary_note", messageId: messageId});
      },
      error: function(data){
        //var message = "[deleteNoteByNoteId]" + JSON.stringify(data);
        //SGNC.appendLog(message, debugGdriveScope);
        appendGdriveLog("deleteNoteByNoteId", data);
        sendContentMessage(sender, {action:"show_error", 
                                    type:"custom", 
                                    message:"Faild delete message, error: " + 
                                    JSON.stringify(data)});
      }
    });
  });
};

var deleteNoteList = function(sender, noteInfos, isMark, gdriveFolderId){
  var noteInfosChunkArray = SGNC.getArrayChunk(noteInfos, 100);
  var chunkLength = noteInfosChunkArray.length;
  for(var i=0; i<chunkLength; i++){
    if(noteInfosChunkArray[i] && noteInfosChunkArray[i].length > 0){
      if(isMark){
        markDeleteNoteList(sender, noteInfosChunkArray[i], gdriveFolderId);
      }
      else{
        actualDeleteNoteList(sender, noteInfosChunkArray[i], gdriveFolderId);
      }
    }
  }

};

var deleteNoteByMessageId = function(sender, messageId){
  debugLog("Delete note for message", messageId);
  gdriveQuery(sender, "title contains '" + messageId + "'",
      function(data){ //success callback
        for(var i=0; i<data.items.length; i++){
          var item = data.items[i];
          markCrmDeleted = false;
          var properties = data.items[i]["properties"];
          for(var j=0; j<properties.length; j++){
            if(properties[j]["key"] === "sgn-opp-id"){
              markCrmDeleted = true;
              break;
            }
          }
          deleteNoteByNoteId(sender, messageId, item.id, markCrmDeleted);
        }
      },
      function(data){ //error backback
        debugLog("@743, query failed", data);
        //var message = "[deleteNoteByMessageId]" + JSON.stringify(data);
        //SGNC.appendLog(message, debugGdriveScope);
        appendGdriveLog("deleteNoteByMessageId");
      }
  );

};


var alertMessageIfNeeded = function(sender, message, preferenceType){
  if(!message)
    return;

  preferences = getPreferences();
  if(preferences[preferenceType]){
    return;
  }

  preferences[preferenceType] = true;
  sendContentMessage(sender, {action: "alert_message", message: message}); 
};

//For messaging between background and content script
var handleRequest = function(sender, request){
  var preferences = {};

  debugLog("Request body:", request);
  switch (request.action){
    case "request_setup":
      preferences = getPreferences();
      var email = request.email;
      var currentDisableList = JSON.parse(preferences["disabledAccounts"]);
      //it's not disabled
      if(currentDisableList.indexOf(email) < 0){
        sendContentMessage(sender, {action: "approve_setup"});
        currentDisableList.push(email);
      } 
      break;
    case "batch_share_crm":
      markShareNoteList(sender, request.shareNotes);
      break;
    case "delete_notes":
      var noteInfos = request.noteInfos;

      var markNoteInfos = [];
      var trashNoteInfos = [];
      for(var i=0; i<noteInfos.length; i++){
        if(noteInfos[i]["crmDeleteTag"]){
          markNoteInfos.push(noteInfos[i]);
        }
        else{
          trashNoteInfos.push(noteInfos[i]);
        }
      }
      
     //this is for delete dupliate notes
      if(gDuplicateNotesForMany.length > 0){
        trashNoteInfos = trashNoteInfos.concat(gDuplicateNotesForMany);
      }

      var gdriveFolderId = request.gdriveFolderId;
      deleteNoteList(sender, trashNoteInfos, false, gdriveFolderId);
      deleteNoteList(sender, markNoteInfos, true, gdriveFolderId);

      break;
    case "search_notes":
      searchNoteList(sender, request.gdriveFolderId, request.searchContent);
      break;
    case "logout":
      logoutGoogleDrive(sender);
      break;
    case "reconnect":
    case "login":
      debugLog("Trying to login Google Drive.");
      launchAuthorizer(sender, request.messageId, request.title);
      break;
    case "crm_oauth":
      // this logic will not be used any more
      // launchAuthorizer(sender, null, null, true);
      break;
    case "post_note":
      content = request.content;
      if(content === "")
        content = gSgnEmtpy;
      postNote(sender, request.messageId, request.emailTitleSuffix,
                 request.gdriveFolderId, request.gdriveNoteId, content, request.properties);
      break;
    case "initialize":
      initialize(sender, request.messageId, request.title);
      break;
    case "pull_notes":
      pullNotes(sender, request.pendingPullList);
      break;
    case "login_sgn_web":
      var code = request.code;
      var messageId = request.messageId;
      var title = null;
      var loginType = "sgn_web";
      // console.log('@1719', sender, code, messageId);
      handleGoogleAuthCode(code, sender, messageId, title, loginType);
      break;
    case "open_options":
      openTab("options.html");
      break;
    case "heart_beat_request":
      var displayPreferences = {};
      preferences = getPreferences();
      for(var j=0; j<gPreferenceTypes.length; j++){
        var key = gPreferenceTypes[j]["name"];
        if(key.startsWith("debug"))
          continue;

        displayPreferences[key] = preferences[key];
      }

      //do nothing except echo back, to show it's alive
      var alertInstallMessage = getSgnMessageForInstallOrUpgrade('install');
      var alertUpgradeMessage = getSgnMessageForInstallOrUpgrade('upgrade');
      alertMessageIfNeeded(sender, alertInstallMessage, "install_notification_done");
      alertMessageIfNeeded(sender, alertUpgradeMessage, "upgrade_notification_done");

      sendContentMessage(sender, {action: "heart_beat_response", 
                                  email:request.email,
                                  gdriveEmail:SGNC.getStorage(sender, "gdrive_email"),
                                  crmUserEmail:SGNC.getStorage(sender, "crm_user_email"),
                                  crmUserToken:SGNC.getStorage(sender, "crm_user_token"),
                                  preferences:displayPreferences});
      break;
    case "update_debug_page_info":
      SGNC.setLog(request.debugInfo, debugPageScope);
      break;
    case "update_debug_content_info":
      SGNC.setLog(request.debugInfo, debugContentScope);
      break;
    case "delete":
      deleteNoteByMessageId(sender, request.messageId);
      break;
    case "send_preference":
      preferences = getPreferences();
      preferences[request.preferenceType] = request.preferenceValue;
      break;
    case "reset_preferences":
      pushPreferences({});
      preferences = getPreferences();
      preferences = updateDefaultPreferences(localStorage);
      break;
    case "update_crm_user_info":
      var crm_user_email = request.crm_user_email;
      var crm_user_token = request.crm_user_token;
      SGNC.setStorage(sender, "crm_user_email", crm_user_email);
      SGNC.setStorage(sender, "crm_user_token", crm_user_token);
      break;
    case "disable_account":
      var accountEmail = request.email;
      preferences = getPreferences();
      var disableCurrentList = JSON.parse(preferences["disabledAccounts"]);
      if(disableCurrentList.indexOf(accountEmail) < 0){
        disableCurrentList.push(accountEmail);
      } 
      preferences["disabledAccounts"] = JSON.stringify(disableCurrentList);
      pushPreferences(preferences);
      break;
    default:
      debugLog("unknown request to background", request);
      break;
  }
};

/*
window.addEventListener("message", function(e){
  if(!e.data.startsWith("sgnlogin:"))
    return;

  if (e.data.startsWith("sgnlogin:")) {
    var data = e.data.split(":");
    var state = data[1];
    var code = data[2];
    var error = data[3];

    var stateData = state.split("/");
    var email = stateData[0];
    var tabId = parseInt(stateData[1]);
    var messageId = stateData[2];

    //simulate state
    var sender = {email: email, worker: {tab: {id: tabId}}};
    handleGoogleAuthCode(code, sender, messageId, null, "sgn_web");
  }
  debugLog('@1835', e.data);
}, true);
*/
