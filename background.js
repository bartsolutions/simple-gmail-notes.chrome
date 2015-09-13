/*
 * Simple Gmail Notes 
 * https://github.com/walty8
 * Copyright (C) 2015 Walty Yeung <walty8@gmail.com>
 */

var settings = {
  CLIENT_ID: "38131814991-p4u809qrr5ee1bsehregd4os69jf2n7i.apps.googleusercontent.com",
  CLIENT_SECRET: "mdA0U_jSkAjI_1x8pdgtrx02",
  REDIRECT_URI: "https://jfjkcbkgjohminidbpendlodpfacgmlm.chromiumapp.org/provider_cb",
  NOTE_FOLDER_NAME: "_SIMPLE_GMAIL_NOTES_"
} 

//The refresh token, access token and sender for google drive are stored in
//local storage. Different gmails may have different sets of storage.
function setStorage(sender, key, value) 
{
  var email = sender.email;
  var storageKey = email + "||" + key;
  localStorage[storageKey] = value;
}

function getStorage(sender, key)
{
  var email = sender.email;
  if(!email || email.indexOf("@") < 0){
    console.log("Get storage email not found.");
  }

  var storageKey = email + "||" + key;
  value = localStorage[storageKey];

  console.log("Get storage result", email, key, value);
  return value;
}

//Post message to google drive via REST API
//Reference: https://developers.google.com/drive/web/quickstart/quickstart-js
function postNote(sender, messageId, gdriveFolderId, gdriveNoteId, content){
  console.log("Posting content", content);
  console.log("Google Drive folder ID", gdriveFolderId);

  executeIfValidToken(sender, function(data){
    var uploadUrl =  "https://www.googleapis.com/upload/drive/v2/files";
    var methodType = "POST"

    if(gdriveNoteId){  //update existing one
      uploadUrl += "/" + gdriveNoteId
      methodType = "PUT";
    }

    var metadata = { title:messageId, parents:[{"id":gdriveFolderId}] };
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

    $.ajax({
      type:methodType,
      url:uploadUrl + "?uploadType=multipart",
      headers: {
          "Authorization": "Bearer " + getStorage(sender, "access_token"),
          "Content-Type": "multipart/related; boundary=\"" 
                                                + boundary + "\""
      },
      data: multipartRequestBody,
      success: function(data){
        console.log("message posted successfully");
      },
      error: function(data){
        sendMessage(sender, {action:"show_error", 
                              message:"Faild post message, error: " + 
                              JSON.stringify(data)});
      }
    });
  });
}


function showRefreshTokenError(sender, error){
  logoutGoogleDrive(sender);
  errorMessage = "Error connecting to Google Drive. " +
                    "Please try to connect again. \n" +
                    "If error persists, you may manually " +
                    "<a href='https://accounts.google.com/b/0/IssuedAuthSubTokens'>revoke</a> " +
                    "previous tokens.\n"
  sendMessage(sender, {action:"show_error", message: errorMessage});
}

function updateRefreshTokenFromCode(sender, messageId){
  $.ajax({
    type: "POST",
    contentType: "application/x-www-form-urlencoded",
    data: {
        "code":getStorage(sender, "code"),
        "client_id": settings.CLIENT_ID,
        "client_secret": settings.CLIENT_SECRET, 
        "redirect_uri": settings.REDIRECT_URI,
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
        console.log("Updated refresh token", data);
        setStorage(sender, "refresh_token", data.refresh_token);
        setStorage(sender, "access_token", data.access_token);
        initialize(sender, messageId);
        updateUserInfo(sender);
      }
    }
  });
}

function updateUserInfo(sender){
  if(getStorage(sender, "gdrive_email")){
    sendMessage(sender, {action:"update_user", 
                         sender:getStorage(sender, "gdrive_email")});
    return;
  }

  executeIfValidToken(sender, function(data){
    $.ajax({
      url:"https://www.googleapis.com/drive/v2/about?access_token=" + 
        getStorage(sender, "access_token"),
      success:function(data){
        setStorage(sender, "gdrive_email", data.user.emailAddress);
        sendMessage(sender, {action:"update_user", 
                             sender:data.user.emailAddress})
      },
      error:function(){
        sendMessage(sender, {action:"show_error", 
                             message: "Failed to get Google Drive User"});
      }
    });
  });
}

function executeIfValidToken(sender, command){
  $.ajax({
    url:"https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=" + 
          getStorage(sender, "access_token"),
    success:function(data){
      command(data);
    },
    error:function(data){
      //get a new access token
      $.ajax({
        type: "POST",
        contentType: "application/x-www-form-urlencoded",
        data: {
            "refresh_token": getStorage(sender, "refresh_token"),
            "client_id": settings.CLIENT_ID,
            "client_secret": settings.CLIENT_SECRET,
            "redirect_uri": settings.REDIRECT_URI,
            "grant_type": "refresh_token"
        },
        url: "https://www.googleapis.com/oauth2/v3/token",
        success:function(data){
          console.log("Renewed token");
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

function loginGoogleDrive(sender, messageId){
  console.log("Trying to login Google Drive.");
  chrome.identity.launchWebAuthFlow(
    {"url": "https://accounts.google.com/o/oauth2/auth?" +
      $.param({"client_id": settings.CLIENT_ID,
          "scope": "https://www.googleapis.com/auth/drive.file",
          "redirect_uri": settings.REDIRECT_URI,
          "response_type":"code",
          "access_type":"offline",
          "login_hint":sender.email,
          "prompt":"consent"
      }), 
     "interactive": true
    },
    function(redirect_url) {
      if(!redirect_url){
        sendMessage(sender, {action:"show_log_in_prompt"});
        sendMessage(sender, {action:"disable_edit"});
        sendMessage(sender, {action:"show_error", 
            message:"Failed to login Google Drive."});
      }
      else{
        //get code from redirect url
        var code = redirect_url.split("=")[1];
        code = code.replace(/[#]/g, "");
        console.log("Collected code:" + code);
        setStorage(sender, "code", code);
        updateRefreshTokenFromCode(sender, messageId);
      }

    }
  );

}

function logoutGoogleDrive(sender){
  var tokenValue = getStorage(sender, "access_token");
  if(tokenValue){
    console.log("Revoking access token: ", tokenValue);
    chrome.identity.removeCachedAuthToken({'token':tokenValue}, function(){});
    $.ajax({
      url:"https://accounts.google.com/o/oauth2/revoke?token=" + tokenValue,
      complete:function(){
        console.log("Revoke done");
        setStorage(sender, "access_token", "");
        setStorage(sender, "refresh_token", "");
        setStorage(sender, "gdrive_email", "");
        sendMessage(sender, {action:"show_log_in_prompt"});
        sendMessage(sender, {action:"disable_edit"});
      }
    });
  }
}

function loadMessage(sender, gdriveNoteId){
  $.ajax({
    type:"GET",
    headers: {
      "Authorization": "Bearer " + getStorage(sender, "access_token")
    },
    url: "https://www.googleapis.com/drive/v2/files/" + 
          gdriveNoteId + "?alt=media",
    success: function(data) {
      console.log("Loaded message", data);
      sendMessage(sender, {action:"update_content", content:data});
      sendMessage(sender, {action:"enable_edit", 
                           gdriveEmail:getStorage(sender, "gdrive_email")});  
    },
    error: function(data){
      sendMessage(sender, {action:"show_error", 
                           message:"Faild load message, error: " + 
                                    JSON.stringify(data)});
    }
  });
}

//Set up notes token validity checking
function setupNotesFolder(sender){
  $.ajax({
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
         sendMessage(sender, {action:"update_gdrive_note_info", 
                              gdriveNoteId:"", 
                              gdriveFolderId:gdriveFolderId});
         //ready for write new message
         sendMessage(sender, {action:"enable_edit", 
                              gdriveEmail:getStorage(sender, "gdrive_email")}); 
         console.log("Data loaded:", data);
       }
    })

}

//list the files created by this app only (as restricted by permission)
function searchMessage(sender, messageId){
  executeIfValidToken(sender, function(data){
    var query = "title = '" + settings.NOTE_FOLDER_NAME + "' or " +
                  "title = '" + messageId + "'";
    query = encodeURIComponent(query);
    console.log("Search message by query:", query);
    $.ajax({
      type:"GET",
      dataType: 'json',
      contentType: "application/json",
      headers: {
          "Authorization": "Bearer " + getStorage(sender, "access_token")
      },
      url: "https://www.googleapis.com/drive/v2/files?q=" + query,
      success: function(data){
        console.log("Query result:", data);
        var gdriveFolderId = "";
        var gdriveNoteId = "";

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
          console.log("Searching message", messageId);
          for(var i=0; i<data.items.length; i++){
            var currentItem = data.items[i];
            if(currentItem.title == messageId && 
                currentItem.parents[0].id == gdriveFolderId){
              gdriveNoteId = currentItem.id;
              break;
            }
          }

          console.log("Google Drive Folder ID found", gdriveNoteId);

          sendMessage(sender, {action:"update_gdrive_note_info", 
                               gdriveNoteId:gdriveNoteId, 
                               gdriveFolderId:gdriveFolderId});

          if(gdriveNoteId){
            loadMessage(sender, gdriveNoteId);
          }
          else{//ready for write new message
            sendMessage(sender, {
                action:"enable_edit", 
                gdriveEmail:getStorage(sender, "gdrive_email")
            });
          }
        }
      },
      error:function(data){
        showRefreshTokenError(sender, JSON.stringify(data));
      }
    });
  });
}

//Do as much initilization as possible, while not trigger login page
function initialize(sender, messageId){
  if(getStorage(sender, "refresh_token")){
    console.log("Initializing, current refresh token:", 
                getStorage(sender, "refresh_token"), 
                "access_token", 
                getStorage(sender, "access_token"))
    searchMessage(sender, messageId);
  }
  else{ //no refresh token
    if(getStorage(sender, "access_token")){
      logoutGoogleDrive(sender);
    }
    sendMessage(sender, {action:"show_log_in_prompt"});
    sendMessage(sender, {action:"disable_edit"});
  }
}

//For messaging between background and content script
$(window).load(function(){
  chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      console.log("Message from a content script:" + sender.tab.url);
      console.log("Request body:", request);
      sender.email = request.email;
      switch (request.action){
        case "logout":
          logoutGoogleDrive(sender);
          break;
        case "reconnect":
        case "login":
          loginGoogleDrive(sender, request.messageId);
          break;
        case "post_note":
          postNote(sender, request.messageId, 
                   request.gdriveFolderId, request.gdriveNoteId, 
                   request.content);
          break;
        case "initialize":
          initialize(sender, request.messageId);
          break;
      }
  });
});


function sendMessage(sender, message)
{
    chrome.tabs.sendMessage(sender.tab.id, message, function(response) {
      console.log("Message response:", response);
    });
}

//disable logging for production
if(chrome.runtime.getManifest().version != "0.0.1"){  
  console = {};
  console.log = function(){};
}

console.log("Finished background script");
