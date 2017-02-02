/*
 * Simple Gmail Notes 
 * https://github.com/walty8
 * Copyright (C) 2015 Walty Yeung <walty8@gmail.com>
 * License: GPLv3
 *
 * This script is going to be shared for both Firefox and Chrome extensions.
 *
 * Note that jquery function calls should be avoided in this file, because 
 * jquery could not be imported to the FF background page, see sendAjax and 
 * iterateArray for the samples.
 *
 */


/* global variables */
var settings = {
  CLIENT_ID: "38131814991-p4u809qrr5ee1bsehregd4os69jf2n7i.apps.googleusercontent.com",
  CLIENT_SECRET: "mdA0U_jSkAjI_1x8pdgtrx02",
  NOTE_FOLDER_NAME: "_SIMPLE_GMAIL_NOTES_",
  SCOPE: 'https://www.googleapis.com/auth/drive.file'
} 

var gPreferenceTypes = ["abstractStyle", "noteHeight", "fontColor", 
                        "backgroundColor", "notePosition", 
                        "showConnectionPrompt", "showAddCalendar", "showDelete",
                        "debugPageInfo", "debugContentInfo", "debugBackgroundInfo"];
var gSgnEmtpy = "<SGN_EMPTY>";
/* -- end -- */

/*
 * Interface declarations
 *
 * The following methods MUST be implemented by the Firefox / Chrome extension
 */

//The refresh token, access token and email for google drive are stored in
//local storage. Different gmails may have different sets of storage.
var isDebug = function(callback) {
  //return true;  //turn on this only if u want to check initialization part
  return false;
}

var openTab = function(page){
  throw "openTab not implemented";
}

var getRawPreferences = function(){
  throw "getRawPreferences not implemented";
}

var getRawStorageObject = function(){
  throw "getRawStorageObject not implementd";
}

var sendContentMessage = function(sender, message) {
  throw "sendContentMessage not implemented";
}

var sendAjax = function(config) {
  throw "sendAjax not implemented";
}

var iterateArray = function(arr, callback){
  throw "iterateArray not implemented";
}

var getRedirectUri = function() {
  throw "getRedirectUri not implemented";
}

var launchAuthorizer = function(sender, callback) {
  throw "launchAuthorizer not implemented";
}

var removeCachedToken = function(tokenValue){
  throw "removeCachedAuthToken not implemented";
}

var checkLogger = function(sender){
  throw "checkLogger not implemented";
}

var getCurrentVersion = function(){
  throw "getCurrentVersion not implemented";
}

/*
 * Shared Utility Functions
 */

var debugLog = function() //need some further work
{
  if (isDebug() && console && console.log) {
      console.log.apply(console, arguments);
  }
}

var isEmptyPrefernce = function(preference)
{
  var val = String(preference);
  return val == "" || val == "null" || val == "undefined";
}

var updateDefaultPreferences = function(preferences)
{
  var hideListingNotes = (preferences["hideListingNotes"] === "true");
  //for backward compatible
  if(hideListingNotes){
    preferences["abstractStyle"] = "none";
    delete preferences["hideListingNotes"];
  }

  if(isEmptyPrefernce(preferences["abstractStyle"]))
    preferences["abstractStyle"] = "20";  //default to 20 characters


  if(isEmptyPrefernce(preferences["noteHeight"]))
    preferences["noteHeight"] = "4";  //default to 4 rows high

  
  if(isEmptyPrefernce(preferences["fontColor"]))
    preferences["fontColor"] = "#808080";

  if(isEmptyPrefernce(preferences["backgroundColor"]))
    preferences["backgroundColor"] = "#FFFF99";

  if(isEmptyPrefernce(preferences["fontSize"]))
    preferences["fontSize"] = "default";

  if(isEmptyPrefernce(preferences["abstractFontColor"]))
    preferences["abstractFontColor"] = "#666666";

  if(isEmptyPrefernce(preferences["abstractBackgroundColor"]))
    preferences["abstractBackgroundColor"] = "#FFFF99";

  if(isEmptyPrefernce(preferences["abstractFontSize"]))
    preferences["abstractFontSize"] = "default";

  if(isEmptyPrefernce(preferences["notePosition"]))
    preferences["notePosition"] = "top";

  if(isEmptyPrefernce(preferences["showConnectionPrompt"]))
    preferences["showConnectionPrompt"] = "false";

  if(isEmptyPrefernce(preferences["showAddCalendar"]))
    preferences["showAddCalendar"] = "true";

  if(isEmptyPrefernce(preferences["showDelete"]))
    preferences["showDelete"] = "true";


  return preferences;

}

var getPreferences = function()
{
  var preferences = getRawPreferences();

  return updateDefaultPreferences(preferences);
}

var setStorage = function(sender, key, value) {
  var email = sender.email;
  var storageKey = email + "||" + key;
  var storage = getRawStorageObject();
  storage[storageKey] = value;
}

var getStorage = function(sender, key) {
  var email = sender.email;
  if(!email || email.indexOf("@") < 0){
    debugLog("Get storage email not found.");
  }

  var storageKey = email + "||" + key;
  var storage = getRawStorageObject()
  value = storage[storageKey];

  debugLog("Get storage result", email, key, value);
  return value;
}

var getPreferenceAbstractStyle = function() {
  var preferences = getPreferences();
  var abstractStyle = preferences["abstractStyle"];

  return abstractStyle;
}

//Post message to google drive via REST API
//Reference: https://developers.google.com/drive/web/quickstart/quickstart-js
var postNote = function(sender, messageId, emailTitleSuffix, gdriveFolderId, gdriveNoteId, content){
  debugLog("Posting content", content);
  debugLog("Google Drive folder ID", gdriveFolderId);

  executeIfValidToken(sender, function(data){
    var uploadUrl =  "https://www.googleapis.com/upload/drive/v2/files";
    var methodType = "POST"

    if(gdriveNoteId){  //update existing one
      uploadUrl += "/" + gdriveNoteId
      methodType = "PUT";
    }

    var noteDescripton = content.substring(0,50);

    var metadata = { title:messageId + " - " + emailTitleSuffix , parents:[{"id":gdriveFolderId}], 
                     description: noteDescripton };
    var boundary = "-------314159265358979323846";
    var contentType = "text/plain";
    var delimiter = "\r\n--" + boundary + "\r\n";
    var close_delim = "\r\n--" + boundary + "--";
    var base64Data = btoa(unescape(encodeURIComponent(content)));
    var multipartRequestBody =
              delimiter +
              'Content-Type: application/json\r\n\r\n' +
              JSON.stringify(metadata) +
              delimiter +
              'Content-Type: ' + contentType + '\r\n' +
              'Content-Transfer-Encoding: base64\r\n' +
              '\r\n' +
              base64Data +
              close_delim;

    sendAjax({
      type:methodType,
      url:uploadUrl + "?uploadType=multipart",
      headers: {
          "Authorization": "Bearer " + getStorage(sender, "access_token")
      },
      contentType: "multipart/related; boundary=\"" + boundary + "\"",
      data: multipartRequestBody,
      success: function(data){
        debugLog("message posted successfully");
        sendContentMessage(sender, {action:"revoke_summary_note", messageId: messageId});
      },
      error: function(data){
        sendContentMessage(sender, {action:"show_error", 
                              type:"custom", 
                              message:"Faild post message, error: " + 
                              JSON.stringify(data)});
      }
    });
  });
}

var showRefreshTokenError = function(sender, error){
  debugLog("@169, refresh token error: ", error);
  logoutGoogleDrive(sender);
  errorMessage = "Error connecting to Google Drive. " +
                    "Please try to connect again. \n" +
                    "If error persists, you may manually " +
                    "<a href='https://accounts.google.com/IssuedAuthSubTokens'>revoke</a> " +
                    "previous tokens.\n"
  sendContentMessage(sender, {action:"show_error", type:"revoke"});
}

var updateRefreshTokenFromCode = function(sender, messageId){
  sendAjax({
    type: "POST",
    contentType: "application/x-www-form-urlencoded",
    data: {
        "code":getStorage(sender, "code"),
        "client_id": settings.CLIENT_ID,
        "client_secret": settings.CLIENT_SECRET, 
        "redirect_uri": getRedirectUri(),
        "grant_type":"authorization_code"
    },
    url: "https://www.googleapis.com/oauth2/v3/token",
    error: function(data){
      showRefreshTokenError(sender, JSON.stringify(data));
    },
    success: function(data){
      if(!data.refresh_token){
        showRefreshTokenError(sender, 
          "Google Drive token could not be collected.");
        //for future revoking
        setStorage(sender, "access_token", data.access_token); 
      }
      else{
        debugLog("Updated refresh token", data);
        setStorage(sender, "refresh_token", data.refresh_token);
        setStorage(sender, "access_token", data.access_token);
        initialize(sender, messageId);
        updateUserInfo(sender);
      }
    }
  });
}

var updateUserInfo = function(sender){
  if(getStorage(sender, "gdrive_email")){
    sendContentMessage(sender, {action:"update_user", 
                         email:getStorage(sender, "gdrive_email")});
    return;
  }

  executeIfValidToken(sender, function(data){
    sendAjax({
      url:"https://www.googleapis.com/drive/v2/about?access_token=" + 
        getStorage(sender, "access_token"),
      success:function(data){
        setStorage(sender, "gdrive_email", data.user.emailAddress);
        sendContentMessage(sender, {action:"update_user", 
                             email:data.user.emailAddress})
      },
      error:function(){
        sendContentMessage(sender, {action:"show_error", type:"user"});
      }
    });
  });
}

var executeIfValidToken = function(sender, command){
  if(!getStorage(sender, "access_token") && 
     !getStorage(sender, "refresh_token")){  //if acccess token not found
      
    debugLog("@197, no token found, skip the verification");
    showRefreshTokenError(sender, "No token found.");
    return;
  }

  sendAjax({
    url:"https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=" + 
          getStorage(sender, "access_token"),
    success:function(data){
      command(data);
    },
    error:function(data){
      //get a new access token
      sendAjax({
        type: "POST",
        contentType: "application/x-www-form-urlencoded",
        data: {
            "refresh_token": getStorage(sender, "refresh_token"),
            "client_id": settings.CLIENT_ID,
            "client_secret": settings.CLIENT_SECRET,
            "redirect_uri": getRedirectUri(),
            "grant_type": "refresh_token"
        },
        url: "https://www.googleapis.com/oauth2/v3/token",
        success:function(data){
          debugLog("Renewed token");
          setStorage(sender, "access_token", data.access_token);
          command(data);
        },
        error:function(){
          //the refresh token is not valid somehow
          showRefreshTokenError(sender, JSON.stringify(data));
        }
      });
    }
  });
}

var loginGoogleDrive = function(sender, messageId){
  debugLog("Trying to login Google Drive.");
  launchAuthorizer(sender, function(code) {
      debugLog("Code collected", code);
      if(!code){
        sendContentMessage(sender, {action:"show_log_in_prompt"});
        sendContentMessage(sender, {action:"disable_edit"});
        sendContentMessage(sender, {action:"show_error", type:"login"});
      }
      else{
        //get code from redirect url
        if(code.indexOf("=") >= 0)  //for chrome
          code = code.split("=")[1];

        code = code.replace(/[#]/g, "");
        debugLog("Collected code:" + code);
        setStorage(sender, "code", code);
        updateRefreshTokenFromCode(sender, messageId);
      }

    }
  );

}

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
}

var logoutGoogleDrive = function(sender){
  setStorage(sender, "code", "");
  setStorage(sender, "access_token", "");
  setStorage(sender, "refresh_token", "");
  setStorage(sender, "gdrive_email", "");
  sendContentMessage(sender, {action:"show_log_in_prompt"});
  sendContentMessage(sender, {action:"disable_edit"});
}

var loadMessage = function(sender, gdriveNoteId, messageId){
  sendAjax({
    type:"GET",
    headers: {
      "Authorization": "Bearer " + getStorage(sender, "access_token")
    },
    url: "https://www.googleapis.com/drive/v2/files/" + 
          gdriveNoteId + "?alt=media",
    success: function(data) {
      debugLog("Loaded message", data);
      if(data == gSgnEmtpy)
        data = "";
      sendContentMessage(sender, {action:"update_content", content:data, messageId:messageId, gdriveNoteId:gdriveNoteId});
      sendContentMessage(sender, {action:"enable_edit", 
                           gdriveEmail:getStorage(sender, "gdrive_email")});  
    },
    error: function(data){
      sendContentMessage(sender, {action:"show_error", 
                           type: "custom", 
                           message:"Faild load message, error: " + 
                                    JSON.stringify(data)});
    }
  });
}

//Set up notes token validity checking
var setupNotesFolder = function(sender){
  sendAjax({
      type: "POST",
      dataType: 'json',
      contentType: "application/json",
      headers: {
          "Authorization": "Bearer " + getStorage(sender, "access_token")
      },
      data: JSON.stringify({
            "title": settings.NOTE_FOLDER_NAME,
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
                            email:getStorage(sender, "gdrive_email")}); 
       debugLog("Data loaded:", data);
     }
  });

}

var gdriveQuery = function(sender, query, success_cb, error_cb){

  executeIfValidToken(sender, function(data){
    query = encodeURIComponent(query);
    debugLog("Search message by query:", query);
    sendAjax({
      type:"GET",
      dataType: 'json',
      contentType: "application/json",
      headers: {
          "Authorization": "Bearer " + getStorage(sender, "access_token")
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

        success_cb(data)
      },
      error:function(data){error_cb(data)}
    });
  })

}

//list the files created by this app only (as restricted by permission)
var searchNote = function(sender, messageId){
  var query = "title='" + settings.NOTE_FOLDER_NAME + "' or " +
                "title contains '" + messageId + "'";
  gdriveQuery(sender, query, 
    function(data){ //success callback
      var gdriveFolderId = "";
      var gdriveNoteId = "";

      debugLog("@403", query, data);

      //first pass, get folder id for gmail notes
      for(var i=0; i<data.items.length; i++){
        var currentItem = data.items[i];
        if(currentItem.title == settings.NOTE_FOLDER_NAME
            && currentItem.parents[0].isRoot){
          //found the root folder
          gdriveFolderId = currentItem.id;
          break;
        }
      }

      if(!gdriveFolderId){
        setupNotesFolder(sender);
      }
      else{
        //second pass find the document
        debugLog("Searching message", messageId);
        for(var i=0; i<data.items.length; i++){
          var currentItem = data.items[i];
          if(messageId.length &&
              currentItem.title.indexOf(messageId) == 0 && 
              currentItem.parents[0].id == gdriveFolderId){
            gdriveNoteId = currentItem.id;
            break;
          }
        }

        debugLog("Google Drive Folder ID found", gdriveNoteId);
//
        sendContentMessage(sender, {action:"update_gdrive_note_info", 
                             gdriveNoteId:gdriveNoteId, 
                             gdriveFolderId:gdriveFolderId});

        if(gdriveNoteId){
          loadMessage(sender, gdriveNoteId, messageId);
        }
        else{//ready for write new message
          sendContentMessage(sender, {
              action:"enable_edit", 
              gdriveEmail:getStorage(sender, "gdrive_email")
          });
        }
      }
    },
    function(data){ //error callback
      showRefreshTokenError(sender, JSON.stringify(data));
    }
  );
}

//Do as much initilization as possible, while not trigger login page
var initialize = function(sender, messageId){
  var preferences = getPreferences();

  preferences['debugBackgroundInfo'] = "Extension Version: " + getCurrentVersion();

  sendContentMessage(sender, {action:"update_preferences", preferences:preferences});

  debugLog("@476", preferences);
  if(getStorage(sender, "refresh_token")){
    debugLog("Initializing, current refresh token:", 
                getStorage(sender, "refresh_token"), 
                "access_token", 
                getStorage(sender, "access_token"))
    checkLogger(sender);
    searchNote(sender, messageId);
  }
  else{ //no refresh token
    if(getStorage(sender, "access_token")){
      logoutGoogleDrive(sender);
    }
    sendContentMessage(sender, {action:"show_log_in_prompt"});
    sendContentMessage(sender, {action:"disable_edit"});
  }
}

var sendSummaryNotes = function(sender, pullList, resultList){
  var result = [];
  var itemDict = {};
  var abstractStyle = getPreferenceAbstractStyle();

  iterateArray(resultList, function(index, emailItem){
    var emailId = emailItem.title.split(" ")[0];
    debugLog("@477", emailId);

    //we collect the first one
    if(emailItem.description && !itemDict[emailId]){
      itemDict[emailId] = emailItem.description;
    }
  });

  debugLog("@482", pullList, resultList);

  for(var i=0; i<pullList.length; i++){
    var emailId = pullList[i];
    var description = ""; //empty string for not found
    var shortDescription = "";

    if(itemDict[emailId] && itemDict[emailId] != gSgnEmtpy){
      description = itemDict[emailId];

      if(abstractStyle == "fixed_SGN")
        shortDescription = "SGN";
      else{
        var length = parseInt(abstractStyle);
        if(!length)
          length = 20;  //default to 20

        shortDescription = "[" + description.substring(0, length) + "]";
      }

    }
    else{
      emailId = gSgnEmtpy;
      description = gSgnEmtpy;
      shortDescription = gSgnEmtpy;
    }

    result.push({"id":emailId, "description":description, "short_description":shortDescription});
  }

  sendContentMessage(sender, {email:getStorage(sender, "gdrive_email"), 
                              action:"update_summary", noteList:result});
}

var pullNotes = function(sender, pendingPullList){
  var abstractStyle = getPreferenceAbstractStyle();

  if(abstractStyle == "none" || !getStorage(sender, "access_token")){
    debugLog("@482, skipped pulling because settings -> hide listing notes or no access token");
    sendSummaryNotes(sender, pendingPullList, []);  //send an empty result
    return;
  }

  if(pendingPullList.length == 0){
    debugLog("Empty pending list, no need to pull");
    return;
  }

  var preferences = getPreferences();
  sendContentMessage(sender, {action:"update_preferences", preferences:preferences});
  debugLog("@414", pendingPullList);

  var totalRequests = Math.floor((pendingPullList.length-1) / 120) + 1;

  var foundItemDict = {};
  for(var i=0; i<totalRequests; i++){
      var query = "1=1";
      var startIndex = i*120;
      var endIndex = (i+1)*120;

      if(endIndex > pendingPullList.length)
          endIndex = pendingPullList.length;


      var partialPullList = pendingPullList.slice(startIndex, endIndex)

      iterateArray(partialPullList, function(index, messageId){
        query += " or title contains '" + messageId + "'";
      });


      query = query.replace("1=1 or", "");  //remove the heading string
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
        }
      );
      })(partialPullList);
  }

  var missedItems = [];
  for(var i=0; i<pendingPullList.length; i++){
    var id = pendingPullList[i];
    if(!foundItemDict[id]){
      missedItems.push(id);
    }
  }

}

var deleteNoteByNoteId = function(sender, messageId, gdriveNoteId){
  executeIfValidToken(sender, function(data){
    var deleteUrl =  "https://www.googleapis.com/drive/v2/files/" + gdriveNoteId + "/trash";
    var methodType = "POST";

    sendAjax({
      type:methodType,
      url:deleteUrl,
      dataType: 'json',
      contentType: "application/json",
      headers: {
          "Authorization": "Bearer " + getStorage(sender, "access_token")
      },
      success: function(data){
        debugLog("message deleted successfully");
        sendContentMessage(sender, {action:"revoke_summary_note", messageId: messageId});
      },
      error: function(data){
        sendContentMessage(sender, {action:"show_error", 
                                    type:"custom", 
                                    message:"Faild delete message, error: " + 
                                    JSON.stringify(data)});
      }
    });
  });
}

var deleteNoteByMessageId = function(sender, messageId){
  debugLog("Delete note for message", messageId);

  gdriveQuery(sender, "title contains '" + messageId + "'",
      function(data){ //success callback
        for(var i=0; i<data.items.length; i++){
          var item = data.items[i];
          deleteNoteByNoteId(sender, messageId, item.id);
        }
      },
      function(data){ //error backback
        debugLog("@743, query failed", data);
      }
  );

}

//For messaging between background and content script
var setupListeners = function(sender, request){
  debugLog("Request body:", request);
  switch (request.action){
    case "logout":
      logoutGoogleDrive(sender);
      break;
    case "reconnect":
    case "login":
      loginGoogleDrive(sender, request.messageId);
      break;
    case "post_note":
      content = request.content;
      if(content == "")
          content = gSgnEmtpy;
      postNote(sender, request.messageId, request.emailTitleSuffix,
                 request.gdriveFolderId, request.gdriveNoteId, content);
      break;
    case "initialize":
      initialize(sender, request.messageId);
      
      break;
    case "pull_notes":
      pullNotes(sender, request.pendingPullList);
      break;
    case "open_options":
      openTab("options.html");
      break;
    case "heart_beat_request":
      //do nothing except echo back, to show it's alive
      sendContentMessage(sender, {action: "heart_beat_response", 
                                  gdriveEmail:getStorage(sender, "gdrive_email")});  
      break;
    case "update_debug_page_info":
      var preferences = getPreferences();
      preferences["debugPageInfo"] = request.debugInfo;
      break;
    case "update_debug_content_info":
      var preferences = getPreferences();
      preferences["debugContentInfo"] = request.debugInfo;
      break;
    case "delete":
      deleteNoteByMessageId(sender, request.messageId);
      break;
    default:
      debugLog("unknown request to background", request);
      break;
  }
}

debugLog("Finished background script (common)");
