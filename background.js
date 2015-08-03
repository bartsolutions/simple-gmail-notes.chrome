/*
 * Simple Gmail Notes 
 * https://github.com/walty8
 * Copyright (C) 2015 Walty Yeung <walty8@gmail.com>
 */

if(typeof(String.prototype.trim) === "undefined")
{
  String.prototype.trim = function() 
  {
    return String(this).replace(/^\s+|\s+$/g, '');
  };
}

function getActualKey(key)
{
  var storageKey = window.gCurrentEmail + "||" + key
  return storageKey;
}

function setStorarge(key, value) 
{
  var storageKey = getActualKey(key)
  localStorage[storageKey] = value;
}

function getStorage(key, value)
{
  var storageKey = getActualKey(key)
  return localStorage[storageKey]
}


function deletePrevMessage(){
	$.ajax({
		type: "DELETE",
		url: "https://www.googleapis.com/drive/v2/files/" + getStorage("note_id"),
		headers: {
				"Authorization": "Bearer " + getStorage("access_token")
		},
		success:function(data){
				console.log("delete previous message successfully");
		}
	});
}

//reference from: https://developers.google.com/drive/web/quickstart/quickstart-js
function postMessage(content){
	console.log("@34, post content", content);
	executeIfValidToken(function(data){
		var uploadUrl =  "https://www.googleapis.com/upload/drive/v2/files";
		var methodType = "POST"

		if(getStorage("note_id")){	//update existing one
			uploadUrl += "/" + getStorage("note_id")
			methodType = "PUT";
		}

		var metadata = {
										title:getStorage("message_id"), 
										parents:[{"id":getStorage("folder_id")}]
									};
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
					"Authorization": "Bearer " + getStorage("access_token"),
					"Content-Type": "multipart/related; boundary=\"" + boundary + "\""
			},
			data: multipartRequestBody,
			success: function(data){
				console.log("message posted successfully");
			},
			error: function(data){
				sendMessage({action:"show_error", message:"Faild post message, error: " + JSON.stringify(data)});
		 }
		});
	});
}

function getMessage(){
  console.log("@49, get message");


}

/*
function updateAccessTokenFromRefreshToken(){
  $.ajax({
    type: "POST",
    contentType: "application/x-www-form-urlencoded",
    headers: {
      "Authorization": "Bearer ya29.vgG85zkCllw8LevLoLiGf-i-4wHw3r2vrKVUBuNqQrtglHYaHg9ewXF5IaRzUS-Z8hHCtA"
    },
    data: {
         "refresh_token":"1/Y-xxCW0uOFuIIVGiDX1DiGi48mtYWZ1wqZoUyVTODNY",
        "client_id":"38131814991-p4u809qrr5ee1bsehregd4os69jf2n7i.apps.googleusercontent.com",
        "client_secret":"mdA0U_jSkAjI_1x8pdgtrx02",
        "redirect_uri":"https://jfjkcbkgjohminidbpendlodpfacgmlm.chromiumapp.org/provider_cb",
        "grant_type":"refresh_token"
    },
    url: "https://www.googleapis.com/oauth2/v3/token",
    error: function(data) {

    },
    success: function(data) {

    }
  });

}
*/

function showRefreshTokenError(error){
  errorMessage = "Failed to connect to Google Drive using generated token, " +
            "please disconnect and connect again. Error: " + error;
  sendMessage({action:"show_log_out_prompt"});
  sendMessage({action:"disable_edit"});
  sendMessage({action:"show_error", message: errorMessage});
}

function updateRefreshTokenFromCode(){
  $.ajax({
    type: "POST",
    contentType: "application/x-www-form-urlencoded",
    data: {
        "code":getStorage("code"),
        "client_id":"38131814991-p4u809qrr5ee1bsehregd4os69jf2n7i.apps.googleusercontent.com",
        "client_secret":"mdA0U_jSkAjI_1x8pdgtrx02",
        "redirect_uri":"https://jfjkcbkgjohminidbpendlodpfacgmlm.chromiumapp.org/provider_cb",
        "grant_type":"authorization_code"
    },
    url: "https://www.googleapis.com/oauth2/v3/token",
    error: function(data){
      showRefreshTokenError(JSON.stringify(data));
    },
    success: function(data){
      if(!data.refresh_token){
        showRefreshTokenError("Google Drive refresh token could not be collected.");
        setStorarge("access_token", data.access_token); //for future revoking
      }
      else{
        console.log("@59, success", data);
        console.log(data);
        setStorarge("refresh_token", data.refresh_token);
        setStorarge("access_token", data.access_token);
        //sendMessage({action:"show_log_out_prompt"});
        //updateUserInfo();
				initialize();

      }
    }
  });
}

function updateUserInfo(){
  if(getStorage("email")){
    sendMessage({action:"update_user", email:getStorage("email")});
    return;
  }

  executeIfValidToken(function(data){
    $.ajax({
      url:"https://www.googleapis.com/drive/v2/about?access_token=" + getStorage("access_token"),
      success:function(data){
        setStorarge("email", data.user.emailAddress);
        sendMessage({action:"update_user", email:data.user.emailAddress})
      },
      error:function(){
        sendMessage({action:"show_error", message: "Failed to get Google Drive User"});
      }
    });
  });

}

function executeIfValidToken(command){
  $.ajax({
    url:"https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=" + getStorage("access_token"),
    success:function(data){
      command(data);
    },
    error:function(data){
       //get a new access token
      $.ajax({
        type: "POST",
        contentType: "application/x-www-form-urlencoded",
        data: {
            "refresh_token":getStorage("refresh_token"),
            "client_id":"38131814991-p4u809qrr5ee1bsehregd4os69jf2n7i.apps.googleusercontent.com",
            "client_secret":"mdA0U_jSkAjI_1x8pdgtrx02",
            "redirect_uri":"https://" + chrome.runtime.id + ".chromiumapp.org/provider_cb",
            "grant_type":"refresh_token"
        },
        url: "https://www.googleapis.com/oauth2/v3/token",
        success:function(data){
					setStorarge("access_token", data.access_token);
          command(data);
        },
        error:function(){
          //the refresh token is not valid somehow
          showRefreshTokenError(JSON.stringify(data));
        }
      });
    }
  });

}

function loginGoogleDrive(){
  //alert(chrome.identity.launchWebAuthFlow);
  console.log("@38");
  chrome.identity.launchWebAuthFlow(
    {"url": "https://accounts.google.com/o/oauth2/auth?" +
      $.param({"client_id":"38131814991-p4u809qrr5ee1bsehregd4os69jf2n7i.apps.googleusercontent.com",
          "scope":"https://www.googleapis.com/auth/drive.file",
          "redirect_uri":"https://" + chrome.runtime.id + ".chromiumapp.org/provider_cb",
          "response_type":"code",
          "access_type":"offline"
      }), 
     "interactive": true
    },
    function(redirect_url) {
      if(!redirect_url){
        sendMessage({action:"show_log_in_prompt"});
        sendMessage({action:"disable_edit"});
        sendMessage({action:"show_error", message:"Failed to login Google Drive."});
      }
      else{
        //get code from redirect url
        var code = redirect_url.split("=")[1];
        code = code.replace(/[#]/g, "");
        console.log("@53:" + code);
        setStorarge("code", code);
        updateRefreshTokenFromCode();
      }

    }
  );

}

function logoutGoogleDrive(){
  console.log("@207 ", getStorage("access_token"));
  console.log("@208 ", getStorage("refresh_token"));
  var tokenValue = getStorage("access_token");
  if(tokenValue){
    console.log("Revoking token: ", tokenValue);
    $.ajax({
      url:"https://accounts.google.com/o/oauth2/revoke?token=" + tokenValue,
      complete:function(){
        console.log("@163");
        setStorarge("access_token", "");
        setStorarge("refresh_token", "");
        setStorarge("email", "");
        sendMessage({action:"show_log_in_prompt"});
				sendMessage({action:"disable_edit"});
        //alert("Logged out successfully");
      }
    });

    //sendResponse({action: "show_error", message:"walty test 22222"});
    //sendMessage({action: "show_error", message:"walty test"});
  }
}

function loadMessage(noteId){
	$.ajax({
		type:"GET",
		headers: {
				"Authorization": "Bearer " + getStorage("access_token")
		},
		url: "https://www.googleapis.com/drive/v2/files/" + noteId + "?alt=media",
		success: function(data) {
			console.log("@268", data);
			sendMessage({action:"update_content", content:data});
		},
		error: function(data){
			sendMessage({action:"show_error", message:"Faild load message, error: " + JSON.stringify(data)});
		}
	});
}

//it should be executed after valid token checking
function setupNotesFolder(){
  $.ajax({
        type: "POST",
        dataType: 'json',
        contentType: "application/json",
        headers: {
            "Authorization": "Bearer " + getStorage("access_token")
        },
        data: JSON.stringify({
              "title":"_SIMPLE_GMAIL_NOTES_",
              "parents": [{"id":"root"}],
              "mimeType": "application/vnd.google-apps.folder"
        }),
        url: "https://www.googleapis.com/drive/v2/files"
    })

}

//list the files created by this app only (as restricted by permission)
function searchMessage(){
	executeIfValidToken(function(data){
		$.ajax({
			type:"GET",
			dataType: 'json',
			contentType: "application/json",
			headers: {
					"Authorization": "Bearer " + getStorage("access_token")
			},
			url: "https://www.googleapis.com/drive/v2/files",
			success: function(data){
				console.log("@245", data);
				var folderId = "";
				var noteId = "";

				//first pass, get folder id for gmail notes
				for(var i=0; i<data.items.length; i++){
					var currentItem = data.items[i];
					if(currentItem.title == "_SIMPLE_GMAIL_NOTES_" && currentItem.parents[0].isRoot){
						//found the root folder
						folderId = currentItem.id;
						break;
					}
				}

				if(!folderId){
					setupNotesFolder();
				}
				else{
					//second pass find the document
					var messageId = getStorage("message_id");
					console.log("@277", messageId);
					for(var i=0; i<data.items.length; i++){
						var currentItem = data.items[i];
						if(currentItem.title == messageId && currentItem.parents[0].id){
							noteId = currentItem.id;
						}
					}
				}

				setStorarge("folder_id", folderId);
				setStorarge("note_id", noteId);//if not found, an empty value needs to be set
				
				if(noteId){
					loadMessage(noteId);
				}
			},
			error:function(data){
				showRefreshTokenError(JSON.stringify(data));
			}
		
		});
	});
}


//do as much initilization as possible, while not trigger login page
function initialize(){
	var messageId = getStorage("message_id");
  //var refresh_token = getStorage("refresh_token");
  if(getStorage("refresh_token")){
    console.log("@253, refresh token:", getStorage("refresh_token"), 
        "access_token", getStorage("access_token"))
    sendMessage({action:"show_log_out_prompt"});
    sendMessage({action:"enable_edit"});
    updateUserInfo();
    searchMessage();
  }
  else{ //no refresh token
    if(getStorage("access_token")){
      logoutGoogleDrive();
    }
    sendMessage({action:"show_log_in_prompt"});
    sendMessage({action:"disable_edit"});

  }

}


/*  for messaging between background and content script */
$(window).load(function(){
  chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      console.log(sender.tab ?
        "from a content script:" + sender.tab.url :
        "from the extension");

      console.log("@46:", request);

      if(request.email)
        window.gCurrentEmail = request.email;

			if(request.messageId)	//use storage to allow multiple window conflict
				setStorarge("message_id", request.messageId);


      switch (request.action){
        case "logout":
          logoutGoogleDrive();
          break;
        case "login":
          loginGoogleDrive();
          break;
        case "get_message":
          getMessage();
          break;
        case "post_message":
          postMessage(request.content);
          break;
        case "initialize":
          initialize();
          break;

      }
  });
});


function sendMessage(message)
{
  console.log("@226", message);
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, message, function(response) {
      console.log("response", response);
    });
  });

}

console.log("@38, at background");
