/*
 * Simple Gmail Notes 
 * https://github.com/walty8
 * Copyright (C) 2015 Walty Yeung <walty8@gmail.com>
 */
function disableEdit()
{
  $("#sgn_input").prop("disabled", true);
//  $("#sgn_input").hide();
 // $("#sgn_padding").hide();

  if(!$("#sgn_input").is(":disabled") || $("#sgn_padding").is(":visible")){  //keep trying until it's visible
    console.log("retry disable edit");
    setTimeout(disableEdit, 100);
  }
}

function enableEdit()
{
  $("#sgn_input").prop("disabled", false);
  //$("#sgn_input").show();
//  $("#sgn_padding").hide();

  if($("#sgn_input").is(":disabled")){  //keep trying until it's visible
    console.log("retry enable edit");
    setTimeout(enableEdit, 100);
  }
}

function showLoginPrompt(){
  $("#sgn_prompt_login").show();
  $("#sgn_prompt_logout").hide();
  $("#sgn_padding").hide();
  console.log("@34, show login", $("#sgn_prompt_login").is(":visible"));
  if(!$("#sgn_prompt_login").is(":visible")){  //keep trying until it's visible
    console.log("retry show prompt login");
    setTimeout(showLoginPrompt, 100);
  }
}

function showLogoutPrompt(email){
  $("#sgn_prompt_logout").show();
  $("#sgn_prompt_login").hide();
  $("#sgn_padding").hide();
  $("#sgn_error").hide();

  if(email)
    $("#sgn_prompt_logout").find("#sgn_user").text(email);
	//enableEdit();

  if(!$("#sgn_prompt_logout").is(":visible")){  //keep trying until it's visible
    console.log("retry show prompt");
    setTimeout(showLogoutPrompt, 100, email);
  }
}


var gEmailReg = /([\w-\.]+)@((?:[\w]+\.)+)([a-zA-Z]{2,4})/g;
var gCurrentGDriveNoteId = "";
var gCurrentGDriveFolderId = "";
var gPreviousContent = "";

function setupNotes(email, messageId){
  console.log("@8, start to set up notes");
  //var email = gmail.get.user_email();

  console.log("@45", email);

  if($("#sgn_input").length){
    //console.log("give up the set up");
    //return;
  }


  var injectionNode = $(".nH.if"); //hopefully this one is stable

  var textAreaNode = $("<textarea></textarea>", {
    "id": "sgn_input",
    "text": "",
    "disabled":"disabled"
  }).css({
    "width": "100%", 
    "height": "150px",
    "color": "gray",
    "margin": "5px",
  }).blur(function(){
    //var gdriveNoteId = $("#sgn_gdrive_note_id").val();
    //var gdriveFolderId = $("#sgn_gdrive_folder_id").val();
    var content = $(this).val();
    //console.log("@55", gdriveFolderId, gdriveNoteId);
    if(gPreviousContent != content){
      sendMessage({action:"post_note", email:email, messageId:messageId, 
            gdriveNoteId:gCurrentGDriveNoteId, gdriveFolderId:gCurrentGDriveFolderId, content:content});
    }

	  return true;
	});

  var logoutPrompt = $("<div id='sgn_prompt_logout'/></div>" )
      .html("Connected to Google Drive of '<span id='sgn_user'></span>'. " +
      "Click <a id='sgn_logout' class='sgn_action'>here</a> to disconnect.")
      .css({
      "display":"none",
      "color": "gray",
      "margin": "5px"
      });

  var loginPrompt = $("<div id='sgn_prompt_login'/></div>" )
      .html("Please <a id='sgn_login' class='sgn_action'>connect</a> to " +
        "your Google Drive account to start using Simple Gmail Notes." )
      .css({
      "display":"none",
      "color": "gray",
      "margin": "5px"
      });

  var emptyPrompt = $("<div id='sgn_padding'>&nbsp;<div>")
                      .css({"margin":"5px"});
  var errorPrompt = $("<div id='sgn_error'><div>")
                      .html("Error connecting to Google Drive <span id='sgn_error_timestamp'></span>, " +
                          "please try to <a id='sgn_reconnect' class='sgn_action'>connect</a> again. \n" +
                          "If error persists after 5 attempts, you may try to manually " +
                          "<a href='https://accounts.google.com/b/0/IssuedAuthSubTokens'>revoke</a> previous tokens.")
                      .css({"margin":"5px", "color":"red", "display":"none"});
  //var noteIdNode = $("<input type=hidden id='sgn_gdrive_note_id/>");
  //var folderIdNode = $("<input type=hidden id='sgn_gdrive_folder_id/>");

  //injectionNode.prepend(folderIdNode);
  //injectionNode.prepend(noteIdNode);
  //
  $("#sgn_input").remove();
  $("#sgn_prompt_login").remove();
  $("#sgn_prompt_logout").remove();

  injectionNode.prepend(errorPrompt);
  injectionNode.prepend(textAreaNode);
  injectionNode.prepend(loginPrompt);
  injectionNode.prepend(logoutPrompt);
  injectionNode.prepend(emptyPrompt);

  //chrome.runtime.sendMessage({action:"setup_email", email:email},  handleResponse)

  $(".sgn_action").css({
    "cursor":"pointer",
    "text-decoration":"underline"
  }).click(function(){
    var action = $(this).attr("id").substring(4);   //remove the sgn_ prefix
    sendMessage({action: action, email: email, messageId:messageId});
  });

  //load initial message
  console.log("@102");
  sendMessage({action:"initialize", email: email, messageId:messageId});
  console.log("@104");

  //auto-save every 5 seconds, change detection is done by backend
  /*
  setInterval(function(){
    if($("#sgn_input").is(":enabled")){
      chrome.runtime.sendMessage({action:"post_note", email:email}, handleResponse);
    };

  }, 50000);   
  */
}

/*  for messaging between background and content script */
/*
$(document).ready(function(){
  //gmailr by joscha
  Gmailr.init(function(G) {
    //set up notes if changed to conversatioview
    G.observe(G.EVENT_VIEW_CHANGED, function(type){
      console.log("@2, event triggered: ", type, G.currentView());
      //console.log("@84, ", G.email());
      if(type == Gmailr.VIEW_CONVERSATION){
        setupNotes();
      }
    });
  });
});
*/


function setupListeners(){
  chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      console.log(sender.tab ?
        "from a content script:" + sender.tab.url :
        "from the extension");
      console.log("@14, handle request", request);
      switch(request.action){
        case "disable_edit":
            disableEdit();
            break;
        case "enable_edit":
            enableEdit();
            showLogoutPrompt(request.gdriveEmail)
            break;
        case "show_log_out_prompt":
          showLogoutPrompt();
          break;
        case "show_log_in_prompt":
          console.log("@20, show login");
          showLoginPrompt();
          disableEdit();
          break;
        case "show_error":
          var errorMessage = request.message;
          console.log("Error in response:", errorMessage);
          var date = new Date();
          var timestamp = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
          //alert(errorMessage);
          $("#sgn_error_timestamp").text("(" +  timestamp + ")");
          $("#sgn_error").show();
          break;
        case "update_user":
          $("#sgn_user").text(request.email);
          break;
        case "update_content":
          gPreviousContent = request.content;
          $("#sgn_input").val(request.content);
          showLogoutPrompt(request.email);
					break;
        case "update_gdrive_note_info":
          console.log("@166", request.gdriveFolderId, request.gdriveFolderId);
          gCurrentGDriveFolderId = request.gdriveFolderId;
          gCurrentGDriveNoteId = request.gdriveNoteId;
          break;
      }

    }

  )

    /*
  window.addEventListener('message', function(event) {
      console.log('content_script.js got message:', event);
      // check event.type and event.data
  });
  */

  /*
  document.addEventListener('SGN_background_event', function(e) {
      var detail = e.detail
      console.log("@190", detail);
      //setupNotes(de);
  });
  */

  /*
window.addEventListener('message', function(event) {
    console.log('content_script.js got message:', event.type, event);
    // check event.type and event.data
});
*/
  
  // Event listener for page
  document.addEventListener('SGN_setup_notes', function(e) {
      var email = e.detail.email;
      var messageId = e.detail.messageId;
      
      setupNotes(email, messageId);
  });

}

function sendMessage(object)
{
    console.log("@184", chrome.runtime.id);
      chrome.runtime.sendMessage(object, function(response){
    console.log("response", response);
  });
}


function setupPage(){
    var j = document.createElement('script');
    j.src = chrome.extension.getURL('lib/jquery-1.11.3.min.js');
    (document.head || document.documentElement).appendChild(j);

    var j = document.createElement('script');
    j.src = chrome.extension.getURL('lib/gmail.js');
    (document.head || document.documentElement).appendChild(j);

    var j = document.createElement('script');
    j.src = chrome.extension.getURL('page.js');
    (document.head || document.documentElement).appendChild(j);


}

$(document).ready(function(){

    setupListeners();
    setupPage();
});

//disable logging
//console.log("checking version @ content @ simple gmail notes", chrome.runtime.getManifest().version);
if(chrome.runtime.getManifest().version != "0.0.0.1"){  
  console = {};
  console.log = function(){};
}
