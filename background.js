/*
 * Simple Gmail Notes 
 * https://github.com/walty8
 * Copyright (C) 2015 Walty Yeung <walty8@gmail.com>
 */

//The refresh token, access token and email for google drive are stored in
//local storage. Different gmails may have different sets of storage.
function setStorage(email, key, value) 
{
  var storageKey = email + "||" + key;
  localStorage[storageKey] = value;
}

function getStorage(email, key, value)
{
  var storageKey = email + "||" + key;
  return localStorage[storageKey]
}

//post message to google drive
//reference: https://developers.google.com/drive/web/quickstart/quickstart-js
function postMessage(email, messageId, gdriveFolderId, gdriveNoteId, content){
	console.log("@34, post content", content);
	executeIfValidToken(function(data){
		var uploadUrl =  "https://www.googleapis.com/upload/drive/v2/files";
		var methodType = "POST"

		if(gdriveNoteId){	//update existing one
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
					"Authorization": "Bearer " + getStorage(email, "access_token"),
					"Content-Type": "multipart/related; boundary=\"" 
                                                + boundary + "\""
			},
			data: multipartRequestBody,
			success: function(data){
				console.log("message posted successfully");
			},
			error: function(data){
				sendMessage({action:"show_error", 
                    message:"Faild post message, error: " 
                        + JSON.stringify(data)});
		 }
		});
	});
}


function showRefreshTokenError(error){
  errorMessage = "Failed to connect to Google Drive using generated token, " +
                    "please disconnect and connect again. \n" +
                    "If error persists, please manually remove the token from here: \n" +
                    "https://accounts.google.com/b/0/IssuedAuthSubTokens?hl=en"
             
  sendMessage({action:"show_log_out_prompt"});
  sendMessage({action:"disable_edit"});
  sendMessage({action:"show_error", message: errorMessage});
}

function updateRefreshTokenFromCode(email){
  $.ajax({
    type: "POST",
    contentType: "application/x-www-form-urlencoded",
    data: {
        "code":getStorage(email, "code"),
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
        showRefreshTokenError("Google Drive token could not be collected.");
        setStorage(email, "access_token", data.access_token); //for future revoking
      }
      else{
        console.log("@59, success", data);
        console.log(data);
        setStorage(email, "refresh_token", data.refresh_token);
        setStorage(email, "access_token", data.access_token);
        initialize(email);

      }
    }
  });
}

function updateUserInfo(email){
  if(getStorage(email, "gdrive_email")){
    sendMessage({action:"update_user", email:getStorage(email, "gdrive_email")});
    return;
  }

  executeIfValidToken(function(data){
    $.ajax({
      url:"https://www.googleapis.com/drive/v2/about?access_token=" + 
        getStorage(email, "access_token"),
      success:function(data){
        setStorage(email, "gdrive_email", data.user.emailAddress);
        sendMessage({action:"update_user", email:data.user.emailAddress})
      },
      error:function(){
        sendMessage({action:"show_error", 
            message: "Failed to get Google Drive User"});
      }
    });
  });

}

function executeIfValidToken(email, command){
  $.ajax({
    url:"https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=" 
      + getStorage(email, "access_token"),
    success:function(data){
      command(data);
    },
    error:function(data){
       //get a new access token
      $.ajax({
        type: "POST",
        contentType: "application/x-www-form-urlencoded",
        data: {
            "refresh_token":getStorage(email, "refresh_token"),
            "client_id":"38131814991-p4u809qrr5ee1bsehregd4os69jf2n7i.apps.googleusercontent.com",
            "client_secret":"mdA0U_jSkAjI_1x8pdgtrx02",
            "redirect_uri":"https://jfjkcbkgjohminidbpendlodpfacgmlm.chromiumapp.org/provider_cb",
            "grant_type":"refresh_token"
        },
        url: "https://www.googleapis.com/oauth2/v3/token",
        success:function(data){
					setStorage(email, "access_token", data.access_token);
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

function loginGoogleDrive(email){
  //alert(chrome.identity.launchWebAuthFlow);
  console.log("@38");
  chrome.identity.launchWebAuthFlow(
    {"url": "https://accounts.google.com/o/oauth2/auth?" +
      $.param({"client_id":"38131814991-p4u809qrr5ee1bsehregd4os69jf2n7i.apps.googleusercontent.com",
          "scope":"https://www.googleapis.com/auth/drive.file",
          "redirect_uri":"https://" + 
            chrome.runtime.id + ".chromiumapp.org/provider_cb",
          "response_type":"code",
          "access_type":"offline"
      }), 
     "interactive": true
    },
    function(redirect_url) {
      if(!redirect_url){
        sendMessage({action:"show_log_in_prompt"});
        sendMessage({action:"disable_edit"});
        sendMessage({action:"show_error", 
            message:"Failed to login Google Drive."});
      }
      else{
        //get code from redirect url
        var code = redirect_url.split("=")[1];
        code = code.replace(/[#]/g, "");
        console.log("@53:" + code);
        setStorage(email, "code", code);
        updateRefreshTokenFromCode(email);
      }

    }
  );

}

function logoutGoogleDrive(email){
  console.log("@207 ", getStorage(email, "access_token"));
  console.log("@208 ", getStorage(email, "refresh_token"));
  var tokenValue = getStorage(email, "access_token");
  if(tokenValue){
    console.log("Revoking token: ", tokenValue);
    $.ajax({
      url:"https://accounts.google.com/o/oauth2/revoke?token=" + tokenValue,
      complete:function(){
        console.log("@163");
        setStorage(email, "access_token", "");
        setStorage(email, "refresh_token", "");
        setStorage(email, "gdrive_email", "");
        sendMessage({action:"show_log_in_prompt"});
				sendMessage({action:"disable_edit"});
        //alert("Logged out successfully");
      }
    });

    //sendResponse({action: "show_error", message:"walty test 22222"});
    //sendMessage({action: "show_error", message:"walty test"});
  }
}

function loadMessage(email, gdriveNoteId){
	$.ajax({
		type:"GET",
		headers: {
				"Authorization": "Bearer " + getStorage(email, "access_token")
		},
		url: "https://www.googleapis.com/drive/v2/files/"
                    + gdriveNoteId + "?alt=media",
		success: function(data) {
			console.log("@268", data);
			sendMessage({action:"update_content", content:data});
		},
		error: function(data){
			sendMessage({action:"show_error", 
                message:"Faild load message, error: " + JSON.stringify(data)});
		}
	});
}

//it should be executed after valid token checking
function setupNotesFolder(email){
  $.ajax({
        type: "POST",
        dataType: 'json',
        contentType: "application/json",
        headers: {
            "Authorization": "Bearer " + getStorage(email, "access_token")
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
function searchMessage(email, messageId){
	executeIfValidToken(function(data){
		$.ajax({
			type:"GET",
			dataType: 'json',
			contentType: "application/json",
			headers: {
					"Authorization": "Bearer " + getStorage(email, "access_token")
			},
			url: "https://www.googleapis.com/drive/v2/files",
			success: function(data){
				console.log("@245", data);
				var gdriveFolderId = "";
				var gdriveNoteId = "";

				//first pass, get folder id for gmail notes
				for(var i=0; i<data.items.length; i++){
					var currentItem = data.items[i];
					if(currentItem.title == "_SIMPLE_GMAIL_NOTES_" 
                        && currentItem.parents[0].isRoot){
						//found the root folder
						gdriveFolderId = currentItem.id;
						break;
					}
				}

				if(!gdriveFolderId){
					setupNotesFolder(email);
				}
				else{
					//second pass find the document
					//var messageId = getStorage(email, "message_id");
					console.log("@277", messageId);
					for(var i=0; i<data.items.length; i++){
						var currentItem = data.items[i];
						if(currentItem.title == messageId 
                            && currentItem.parents[0].id){
							gdriveNoteId = currentItem.id;
						}
					}
				}

				//setStorage(email, "folder_id", gdriveFolderId);

                //if not found, an empty value needs to be set
				//setStorage(email, "note_id", gdriveNoteId);
				
                sendMessage({action:"update_gdrive_note_info", 
                    gdriveNoteId:gdriveNoteId, gdriveFolderId:gdriveFolderId});

				if(gdriveNoteId){
					loadMessage(gdriveNoteId);
				}
			},
			error:function(data){
				showRefreshTokenError(JSON.stringify(data));
			}
		
		});
	});
}


//do as much initilization as possible, while not trigger login page
function initialize(email){
	//var messageId = getStorage(email, "message_id");
  //var refresh_token = getStorage("refresh_token");
  if(getStorage(email, "refresh_token")){
    console.log("@253, refresh token:", getStorage(email, "refresh_token"), 
        "access_token", getStorage(email, "access_token"))
    sendMessage({action:"show_log_out_prompt"});
    sendMessage({action:"enable_edit"});
    updateUserInfo(email);
    searchMessage(email);
  }
  else{ //no refresh token
    if(getStorage(email, "access_token")){
      logoutGoogleDrive(email);
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

      //if(request.email)
        //window.gCurrentEmail = request.email;
            //use storage to allow multiple window conflict
			//if(request.messageId)	
				//setStorage(email, "message_id", request.messageId);


      var email = request.email;

      switch (request.action){
        case "logout":
          logoutGoogleDrive(email);
          break;
        case "login":
          loginGoogleDrive(email);
          break;
        case "post_message":
          postMessage(email, request.messageId, 
                  request.gdriveFolderId, request.gdriveNoteId, request.content);
          break;
        case "initialize":
          initialize(email);
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
