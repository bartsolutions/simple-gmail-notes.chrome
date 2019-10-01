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
var SGNB = SimpleGmailNotes;
var settings = {
  CLIENT_ID: "38131814991-p4u809qrr5ee1bsehregd4os69jf2n7i.apps.googleusercontent.com",
  CLIENT_SECRET: "mdA0U_jSkAjI_1x8pdgtrx02",
  SCOPE: 'https://www.googleapis.com/auth/drive.file',
  NOTE_NAMES: ["_SIMPLE_GMAIL_NOTES_", "Simple Gmail Notes"],
  ACCESS_TOKEN_KEY: "access_token",
  REFRESH_TOKEN_KEY: "refresh_token",

  CRM_CLIENT_ID: "107383424448-bndpfgli7b0bf9c30u1p1058ovmo4o9b.apps.googleusercontent.com",
  CRM_CLIENT_SECRET: "JxsNEc27Xcj5zh-lle6l3kGe",
  CRM_SCOPE: 'profile email',
  CRM_ACCESS_TOKEN_KEY: "crm_access_token",
  CRM_REFRESH_TOKEN_KEY: "crm_refresh_token",
};


var gInstallMessage = "<div class='title'>Simple Gmail Notes Installed</div><br/><br/>" +
            "<div class='item'>How to use Simple Gmail Notes:</div>" +
            "<div class='item'>1. Click any email</div>" +
            "<div class='item'>2. Click 'log in' link at the top of email</div>" +
            "<div class='item'>3. Write anything in the text area</div>" +
            "<br/><div class='item'>Hint:</div>" +
            "<div class='item'>- You could now view the notes in mobile devices " +
            "(<a target='_blank' href='https://www.youtube.com/watch?v=vpBt36GibcY'>View Demo</a>)</div>" +
            "<div class='item'>- If you do like the extension, please support our development " +
              " by subscribing to " +
              "<a target='_blank' href='https://www.bart.com.hk/simple-gmail-notes-support-package/?f=n'>Support Package</a></div>" +
            "<br/>" +
            "<br/>" +
            "<div style='text-align:right'>" +
              "<a  target='_blank' href='" + SGNB.getOfficalSiteUrl("nt") + "'>" +
                "<img src='" + SGNB.getWhiteLogoImageSrc("nt") + "'></a></div>";

var gUpgradeMessage = "<div class='title'>Simple Gmail Notes Updated</div><br/><br/>" +
            "<div class='item'><strong>New in " + SGNB.getExtensionVersion() + ":</strong></div>" +
            "<div class='item'>- Fixed layout problem for sidebar display</div>" +
            "<br/>" +
            "<div class='item'><strong>New in Mobile CRM:</strong></div>" +
            "<div class='item'>- Directly add Gmail note in mobile phone</div>" +
            "<div class='item'>- Background note save</div>" +
            "<br/><div class='item'>Hint:</div>" +
            "<div class='item'>- You could now view the notes in mobile devices " +
            "(<a target='_blank' href='https://www.youtube.com/watch?v=vpBt36GibcY'>View Demo</a>)</div>" +
            "<div class='item'>- If you do like the extension, please support our development " +
              " by subscribing to " +
              "<a target='_blank' href='https://www.bart.com.hk/simple-gmail-notes-support-package/?f=n'>Support Package</a></div>" +
            "<br/>" +
            "<br/>" +
            "<div style='text-align:right'>" +
              "<a  target='_blank' href='" + SGNB.getOfficalSiteUrl("nt") + "'>" +
                "<img src='" + SGNB.getWhiteLogoImageSrc("nt") + "'></a></div>";

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
  if(SGNB.isChrome())
    SGNB.getBrowser().tabs.create({"url": "chrome-extension://" + SGNB.getExtensionID() + "/" + page});
  else
    SGNB.getBrowser().tabs.create({"url" : browser.extension.getURL(page)});
};


/*
var getRawStorageObject = function(){
  return localStorage;
};*/

var getRawPreferences = function(){
  storage = getRawStorageObject();
  return storage; //preferences are put into local storage as well
};

var sendContentMessage = function(sender, message) {
  SGNB.getBrowser().tabs.sendMessage(sender.worker.tab.id, message, function(response) {
    //debugLog("Message response:", response);
  });
};


var sendAjax = function(config) {
  $.ajax(config);
};

var iterateArray = function(arr, callback){
  $.each(arr, callback);
};

var getRedirectUri = function() {
  return SGNB.getBrowser().identity.getRedirectURL();
};

var launchAuthorizer = function(sender, messageId, title, isCRM) {
  debugLog("Trying to login Google Drive.");
  var clientId = settings.CLIENT_ID;
  var scope = settings.SCOPE;
  if(isCRM){
    clientId = settings.CRM_CLIENT_ID;
    scope = settings.CRM_SCOPE;
  }

  var result = SGNB.getBrowser().identity.launchWebAuthFlow(
    {"url": "https://accounts.google.com/o/oauth2/auth?" +
      $.param({"client_id": clientId,
          "scope": scope,
          "redirect_uri": getRedirectUri(),
          "response_type":"code",
          "access_type":"offline",
          "login_hint":sender.email,
          //"login_hint":"",
          "prompt":"consent select_account"
      }), 
     "interactive": true
    },
    function(code) {
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
        //SGNB.appendLog(message, debugGdriveScope);
        if(!isCRM){
          appendGdriveLog("loginGoogleDrive", error);
          sendContentMessage(sender, {action:"show_log_in_prompt"});
          sendContentMessage(sender, {action:"disable_edit"});
        }
        sendContentMessage(sender, {action:"show_error", 
                                    type:"custom",
                                    message:"Failed to login: " + error});
      }else{
        //get code from redirect url
        if(code.indexOf("=") >= 0)  //for chrome
          code = code.split("=")[1];

        if(code.indexOf("&") >= 0)  //for chrome
          code = code.split("&")[0];

        code = code.replace("%2F", "/");

        code = code.replace(/[#]/g, "");
        debugLog("Collected code:" + code);
        setStorage(sender, "code", code);
        updateRefreshTokenFromCode(sender, messageId, title, isCRM);
      }

    }
  );

  debugLog("authentication result: ", result);
};

var getLastError = function(){
  return SGNB.getBrowser().runtime.lastError.message;
};

var removeCachedToken = function(tokenValue){
  SGNB.getBrowser().identity.removeCachedAuthToken({'token':tokenValue}, function(){});
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
  if (isDebug() && console && console.log) {
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

  SGNB.appendLog(result, debugGdriveScope);
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

    var noteDescripton = stripHtml(content).substring(0,4096);
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
          "Authorization": "Bearer " + getStorage(sender, settings.ACCESS_TOKEN_KEY)
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
        //SGNB.appendLog(message, debugGdriveScope);
        appendGdriveLog("postNote", data);
        sendContentMessage(sender, {action:"show_error", 
                                    type:"custom", 
                                    message:"Faild post message, error: " + 
                                      JSON.stringify(data)});
      }
    });
  });
};

var showRefreshTokenError = function(sender, error, isCRM){
  if(error && typeof(error) === "object"){
    if(error.responseText && error.responseText.indexOf("{") >= 0){ 
      //got an explicit error from google
      if(isCRM)
        logoutCRM(sender);
      else
        logoutGoogleDrive(sender);
    }
    error = JSON.stringify(error);
  }

  //var preferences = getPreferences();
  //preferences['debugBackgroundInfo'] += " Refresh token error: " + error + ".";
  var message = " Refresh token error: " + error + ".";
  SGNB.appendLog(message, debugBackGroundScope);

  if(isCRM)
    sendContentMessage(sender, {action:"show_error", type:"revoke_crm"});
  else
    sendContentMessage(sender, {action:"show_error", type:"revoke"});
};


var updateRefreshTokenFromCode = function(sender, messageId, title, isCRM){
  var clientId = settings.CLIENT_ID;
  var clientSecret = settings.CLIENT_SECRET;
  var refreshTokenKey = settings.REFRESH_TOKEN_KEY;
  var accessTokenKey = settings.ACCESS_TOKEN_KEY;

  if(isCRM){
    clientId = settings.CRM_CLIENT_ID;
    clientSecret = settings.CRM_CLIENT_SECRET;
    refreshTokenKey = settings.CRM_REFRESH_TOKEN_KEY;
    accessTokenKey = settings.CRM_ACCESS_TOKEN_KEY;
  }

  sendAjax({
    type: "POST",
    contentType: "application/x-www-form-urlencoded",
    data: {
        "code":getStorage(sender, "code"),
        "client_id": clientId,
        "client_secret": clientSecret,
        "redirect_uri": getRedirectUri(),
        "grant_type":"authorization_code"
    },
    url: "https://www.googleapis.com/oauth2/v3/token",
    error: function(data){
      //var message = "[updateRefreshTokenFromCode]" + JSON.stringify(data);
      //SGNB.appendLog(message, debugGdriveScope);
      appendGdriveLog("updateRefreshTokenFromCode", data);
      showRefreshTokenError(sender, data, isCRM);
    },
    success: function(data){
      if(!data.refresh_token){
        showRefreshTokenError(sender, 
          "Google Drive token could not be collected.", isCRM);
        //for future revoking
        setStorage(sender, accessTokenKey, data.access_token); 
      }else{
        debugLog("Updated refresh token", data);
        setStorage(sender, refreshTokenKey, data.refresh_token);
        setStorage(sender, accessTokenKey, data.access_token);

        if(isCRM){
          //get id token
          var idToken = data.id_token;
          debugLog("@527, idToken: " + idToken);
          sendContentMessage(sender, {action:"crm_user_logged_in", 
                                      idToken: idToken,
                                      email:getStorage(sender, "gdrive_email")});
        }
        else{
          initialize(sender, messageId, title);
          updateUserInfo(sender);
        }
      }
    }
  });
};

var updateUserInfo = function(sender){
  if(getStorage(sender, "gdrive_email")){
    sendContentMessage(sender, {action:"update_user", 
                         email:getStorage(sender, "gdrive_email")});
    return;
  }

  executeIfValidToken(sender, function(data){
    sendAjax({
      url:"https://www.googleapis.com/drive/v2/about?access_token=" + 
        getStorage(sender, settings.ACCESS_TOKEN_KEY),
      success:function(data){
        setStorage(sender, "gdrive_email", data.user.emailAddress);
        sendContentMessage(sender, {action:"update_user", 
                             email:data.user.emailAddress});
      },
      error:function(data){
        //var message = "[updateUserInfo]" + JSON.stringify(data);
        //SGNB.appendLog(message, debugGdriveScope);
        appendGdriveLog("updateUserInfo", data);
        sendContentMessage(sender, {action:"show_error", type:"user"});
      }
    });
  });
};

var executeIfValidToken = function(sender, command, isCRM){
  var clientId = settings.CLIENT_ID;
  var clientSecret = settings.CLIENT_SECRET;
  var refreshTokenKey = settings.REFRESH_TOKEN_KEY;
  var accessTokenKey = settings.ACCESS_TOKEN_KEY;

  if(isCRM){
    clientId = settings.CRM_CLIENT_ID;
    clientSecret = settings.CRM_CLIENT_SECRET;
    refreshTokenKey = settings.CRM_REFRESH_TOKEN_KEY;
    accessTokenKey = settings.CRM_ACCESS_TOKEN_KEY;
  }

  if(!getStorage(sender, accessTokenKey) && 
     !getStorage(sender, refreshTokenKey)){  //if acccess token not found
      
    debugLog("@197, no token found, skip the verification");
    showRefreshTokenError(sender, "No token found.", isCRM);
    return;
  }

  sendAjax({
    url:"https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=" + 
          getStorage(sender, accessTokenKey),
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
              "refresh_token": getStorage(sender, refreshTokenKey),
              "client_id": clientId,
              "client_secret": clientSecret,
              "redirect_uri": getRedirectUri(),
              "grant_type": "refresh_token"
          },
          url: "https://www.googleapis.com/oauth2/v3/token",
          success:function(data){
            debugLog("Renewed token");
            setStorage(sender, accessTokenKey, data.access_token);
            command(data);
          },
          error:function(data){
            //var message = "[executeIfValidToken]" + JSON.stringify(data);
            //SGNB.appendLog(message, debugGdriveScope);
            appendGdriveLog("executeIfValidToken", data);
            showRefreshTokenError(sender, data, isCRM);
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

var loginCRM = function(sender) {
  launchAuthorizer(sender, null, null, true);
};

var loginGoogleDrive = function(sender, messageId, title){
  debugLog("Trying to login Google Drive.");
  launchAuthorizer(sender, messageId, title);
};

var updateCRMEmailThreadId = function(sender, email, messageId) {
  executeIfValidToken(sender, function(data){
    var clientId = settings.CRM_CLIENT_ID;
    var clientSecret = settings.CRM_CLIENT_SECRET;
    var refreshTokenKey = settings.CRM_REFRESH_TOKEN_KEY;
    var accessTokenKey = settings.CRM_ACCESS_TOKEN_KEY;

    var accessToken = getStorage(sender, accessTokenKey);

    sendAjax({
      type: "GET",
      dataType: 'json',
      contentType: "application/json",
      headers: {
          "Authorization": "Bearer " + accessToken
      },
      url: "https://www.googleapis.com/gmail/v1/users/me/messages/" + messageId,
      success:function(data){
        sendContentMessage(sender, {action:"get_crm_thread_id_success",
                                    messageId: messageId,
                                    emailData:data});
      },
      error: function(data){
        sendContentMessage(sender, {action:"show_error", 
                                    type:"custom", 
                                    message:"Failed update email info: " + 
                                      JSON.stringify(data)});
      }
    });
  }, true);

};

// the revoke should be manually done by the user now
/*
var revokeToken = function(sender){
  var tokenValue = getStorage(sender, "access_token");
  if(tokenValue){
    debugLog("Revoking access token: ", tokenValue);
    removeCachedToken(tokenValue);
    sendAjax({
      url:"https://accounts.google.com/o/oauth2/revoke?token=" + tokenValue,
      complete:function(data){
        debugLog("Revoke done", data);
        if(data.status == 200 || data.status == 400){
          debugLog("Removing local data");
          //setStorage(sender, "access_token", "");
          //setStorage(sender, "refresh_token", "");
          //setStorage(sender, "gdrive_email", "");
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
  setStorage(sender, "code", "");
  setStorage(sender, settings.ACCESS_TOKEN_KEY, "");
  setStorage(sender, settings.REFRESH_TOKEN_KEY, "");
  setStorage(sender, "gdrive_email", "");
  setStorage(sender, "crm_user_email", "");
  sendContentMessage(sender, {action:"show_log_in_prompt"});
  sendContentMessage(sender, {action:"disable_edit"});
};

var logoutCRM = function(sender){
  setStorage(sender, settings.CRM_ACCESS_TOKEN_KEY, "");
  setStorage(sender, settings.CRM_REFRESH_TOKEN_KEY, "");
  sendContentMessage(sender, {action:"logout_crm"});
};


var loadMessage = function(sender, gdriveNoteId, messageId, properties, description, modifiedTime){
  sendAjax({
    type:"GET",
    headers: {
      "Authorization": "Bearer " + getStorage(sender, settings.ACCESS_TOKEN_KEY)
    },
    url: "https://www.googleapis.com/drive/v2/files/" + 
          gdriveNoteId + "?alt=media",
    success: function(data) {
      debugLog("Loaded message", data);
      if(data == gSgnEmtpy || isMarkCrmDeleted(properties))
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
                                  gdriveEmail:getStorage(sender, "gdrive_email")});  
    },
    error: function(data){
      //var message = "[loadMessage]" + JSON.stringify(data);
      //SGNB.appendLog(message, debugGdriveScope);
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
          "Authorization": "Bearer " + getStorage(sender, settings.ACCESS_TOKEN_KEY)
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
                                   gdriveEmail:getStorage(sender, "gdrive_email")});
       debugLog("Data loaded:", data);
     },
    error: function(data){
      //var message = "[setupNotesFolder]" + JSON.stringify(data);
      //SGNB.appendLog(message, debugGdriveScope);
      appendGdriveLog("setupNotesFolder", data);
    }
  });
};

var gdriveQuery = function(sender, query, success_cb, error_cb, baseWaiting){
  if(baseWaiting === undefined)
    baseWaiting = 1; //default retry count

  executeIfValidToken(sender, function(data){
    if(!query.startsWith("trashed")){  //only append once
      query = "trashed = false and ( " + query + ")";
      query = encodeURIComponent(query);
    }

    debugLog("Search message by query:", query);
    sendAjax({
      type:"GET",
      dataType: 'json',
      contentType: "application/json",
      headers: {
          "Authorization": "Bearer " + getStorage(sender, settings.ACCESS_TOKEN_KEY)
      },
      url: "https://www.googleapis.com/drive/v2/files?q=" + query,
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
              gdriveQuery(sender, query, success_cb, error_cb, baseWaiting * 2);
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
        "Authorization": "Bearer " + getStorage(sender, settings.ACCESS_TOKEN_KEY)
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
      //SGNB.appendLog(message, debugGdriveScope);
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

var searchNoteHistory = function(sender, messageId, title){
  var originalTitle = title;

  title = extractTitle(title);

  if(title === "")
    return null;

  //fullText contain must be alpha numeric
  var searchTitle = title.replace(/[^a-zA-Z0-9]/g, " ");
  searchTitle = shrinkSearchContent(searchTitle);
  var query = "(not properties has { key='"+gSgnCrmDeleted+"' and value='true' and visibility='PUBLIC' }) and " + 
    "(fullText contains '" + getFolderName() + "' or fullText contains '" + searchTitle + "')";
  gdriveQuery(sender, query, 
    function(data){ //success callback
      var gdriveFolderIds = [];
      var gdriveNoteId = "";
      var i, currentItem;
      debugLog("@521", query, data);

      //first pass, get folder id for gmail notes
      for(i=0; i<data.items.length; i++){
        currentItem = data.items[i];

        
        if(settings.NOTE_NAMES.includes(currentItem.title) && 
           currentItem.parents[0].isRoot){
          //found the root folder
           gdriveFolderIds.push(currentItem.id);
        }
      }
      
      if(!gdriveFolderIds.length)
        return null;

      //second pass find the document
      debugLog("Searching message", title);
      total_found = 0;
      result = [];

      var needShow = false;
      for(i=0; i<data.items.length; i++){
        currentItem = data.items[i];

        var currentMessageId = currentItem.title.split(" ")[0];
        var currentItemTitle = extractTitle(currentItem.title.substring(19));
        if(currentItemTitle == title && 
           gdriveFolderIds.includes(currentItem.parents[0].id)){
            var crmDeleteTag = false;
            var properties = currentItem.properties;

          result.push({"id": currentMessageId, 
                       "noteId": currentItem.id,
                       "description": currentItem.description,
                       "properties": currentItem.properties,
                       "modifiedDate": currentItem.modifiedDate,
                       "createdDate": currentItem.createdDate});

          if(currentMessageId != messageId){
            needShow = true;
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
    //SGNB.appendLog(message, debugGdriveScope);
    appendGdriveLog("searchNoteHistory");
  });
};


//list the files created by this app only (as restricted by permission)
var searchNote = function(sender, messageId){
  console.log("@1065 messageId", messageId);
   
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
        }else{//ready for write new message
          sendContentMessage(sender, {
              action:"enable_edit",
              content:'',
              description:description,
              properties:properties,
              messageId:messageId,
              gdriveEmail:getStorage(sender, "gdrive_email")
          });
        }
      }
    },
    function(data){ //error callback
      //showRefreshTokenError(sender, data);
      //var message = "[searchNote]" + JSON.stringify(data);
      //SGNB.appendLog(message, debugGdriveScope);
      appendGdriveLog("searchNote");
    }
  );
};

//Do as much initilization as possible, while not trigger login page
var initialize = function(sender, messageId, title){
  var accessTokenKey = settings.ACCESS_TOKEN_KEY;
  var refreshTokenKey = settings.REFRESH_TOKEN_KEY;
  var preferences = getPreferences();
  //preferences['debugBackgroundInfo'] = "Extension Version: " + SGNB.getExtensionVersion();

  //sendContentMessage(sender, {action:"update_preferences", preferences:preferences});

  debugLog("@476", preferences);
  if(getStorage(sender, refreshTokenKey)){
    debugLog("Initializing, current refresh token:", 
                getStorage(sender, refreshTokenKey), 
                accessTokenKey, 
                getStorage(sender, accessTokenKey));
    searchNote(sender, messageId);

    if(preferences['showNoteHistory'] !== 'false'){
      searchNoteHistory(sender, messageId, title); 
    }
  }
  else{ //no refresh token
    if(getStorage(sender, accessTokenKey)){
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
      shortDescription = SGNB.getSummaryLabel(description, preferences);
    }
    else{
      emailId = gSgnEmtpy;
      description = gSgnEmtpy;
      shortDescription = gSgnEmtpy;
    }

    result.push({"id":emailId, "description":description, "short_description":shortDescription, "properties":properties});
  }
  sendContentMessage(sender, {email:getStorage(sender, "gdrive_email"), 
                              action:"update_summary", noteList:result});
};

var pullNotes = function(sender, pendingPullList){
  var abstractStyle = getPreferenceAbstractStyle();
  var i;

  if(abstractStyle == "none" || !getStorage(sender, settings.ACCESS_TOKEN_KEY)){
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
          "Authorization": "Bearer " + getStorage(sender, accessTokenKey)
      },
      data: getMultipart(noteInfos, getStorage(sender, accessTokenKey), requestUrl, requestMethod),
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
    //SGNB.appendLog(message, debugGdriveScope);
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
                        email: getStorage(sender, "gdrive_email")});
    sendContentMessage(sender, {email: getStorage(sender, "gdrive_email"),
                            action: "show_success_delete_message"
                            });
  }, function(data){
    //var message = "[markDeleteNoteList]" + JSON.stringify(data);
    //SGNB.appendLog(message, debugGdriveScope);
    appendGdriveLog("markDeleteNoteList", data);
    debugLog("fail to mark Note(Deleted)", data);
  });
};

var actualDeleteNoteList = function(sender, noteInfos, gdriveFolderId){
  var requestMethod = "POST";
  var requestUrl = "/drive/v2/files/{note_id}/trash";

  batchDo(sender, requestMethod, requestUrl, noteInfos, function(data){
    debugLog("message deleted successfully");
    sendContentMessage(sender, {email: getStorage(sender, "gdrive_email"),
                            action: "show_success_delete_message"
                            });
  }, function(data){
    debugLog("message deleted failed");
    //var message = "[deleteNoteList]" + JSON.stringify(data);
    //SGNB.appendLog(message, debugGdriveScope);
    appendGdriveLog("deleteNoteList", data);
    sendContentMessage(sender, {email: getStorage(sender, "gdrive_email"),
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

  //console.log("@1393, shrinked content", newContent);
  return newContent;
};

var searchNoteList = function(sender, gdriveFolderId, searchContent){
  var notes = [];
  var query = "(not properties has { key='"+gSgnCrmDeleted+"' and value='true' and visibility='PUBLIC' }) and " +
                "(parents in '" + gdriveFolderId + "')"; 
  var userId = sender.email;
  
  if(searchContent){
    searchContent = shrinkSearchContent(searchContent);

    query = query + " and fullText contains '" + searchContent + "'";
  }

  gdriveQuery(sender, query, function(data){
    for(var i=0; i<data.items.length; i++){
      var description = data.items[i].description;
      var length = description.length;
      if (length > 50){
          length = 50;
      }
      var shortDescription = SGNB.getShortDescription(description, length);

      var content = description;
      // remove previous description html tag
      var crmContent = htmlUnescape(stripHtml(content));
      
      var initialTitle = data.items[i].title;
      var messageId = initialTitle.split("-")[0].replace(/\s/g, '');
      var noteDatetime = data.items[i].modifiedDate;
      var properties = data.items[i].properties;

      var position = initialTitle.indexOf("-");
      var title = initialTitle.substring(position+1, initialTitle.length);

      var modifiedTime  = formatDate(noteDatetime, true);
      var modifiedDate = formatDate(noteDatetime);

      notes.push({
        'noteId': data.items[i].id, 
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
    sendContentMessage(sender, {action:"show_search_result", notes: notes, 
                                email: sender.email});

  },function(data){
    //var message = "[searchNoteList]" + JSON.stringify(data);
    //SGNB.appendLog(message, debugGdriveScope);
    appendGdriveLog("searchNoteList");
  });
  
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
          "Authorization": "Bearer " + getStorage(sender, settings.ACCESS_TOKEN_KEY)
      },
      success: function(data){
        debugLog("message deleted successfully");
        if(markCrmDeleted){
          var noteList = [];
          noteList.push({"messageId": messageId, "properties":data["properties"]});
          sendContentMessage(sender, {action:"delete_crm_notes",
                              email: getStorage(sender, "gdrive_email"),
                              noteList: noteList});
        }
        sendContentMessage(sender, {action:"revoke_summary_note", messageId: messageId});
      },
      error: function(data){
        //var message = "[deleteNoteByNoteId]" + JSON.stringify(data);
        //SGNB.appendLog(message, debugGdriveScope);
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
  var noteInfosChunkArray = getArrayChunk(noteInfos, 100);
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
        //SGNB.appendLog(message, debugGdriveScope);
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
      loginGoogleDrive(sender, request.messageId, request.title);
      break;
    case "crm_oauth":
      loginCRM(sender);
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
      alertMessageIfNeeded(sender, gInstallMessage, "install_notification_done");
      alertMessageIfNeeded(sender, gUpgradeMessage, "upgrade_notification_done");
      sendContentMessage(sender, {action: "heart_beat_response", 
                                  email:request.email,
                                  gdriveEmail:getStorage(sender, "gdrive_email"),
                                  crmUserEmail:getStorage(sender, "crm_user_email"),
                                  preferences:displayPreferences});
      break;
    case "update_debug_page_info":
      SGNB.setLog(request.debugInfo, debugPageScope);
      break;
    case "update_debug_content_info":
      SGNB.setLog(request.debugInfo, debugContentScope);
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
    case "update_crm_user_email":
      var crm_user_email = request.email;
      setStorage(sender, "crm_user_email", crm_user_email);
      break;
    case "update_crm_email_thread_id":
      updateCRMEmailThreadId(sender, request.email, request.messageId);
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

