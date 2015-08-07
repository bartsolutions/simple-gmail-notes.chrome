/*
 * Simple Gmail Notes 
 * https://github.com/walty8
 * Copyright (C) 2015 Walty Yeung <walty8@gmail.com>
 */

function disableEdit()
{
  $("#sgn_input").prop("disabled", true);
}

function enableEdit()
{
  $("#sgn_input").prop("disabled", false);
}

function showLoginPrompt(){
  $("#sgn_prompt_login").show();
  $("#sgn_prompt_logout").hide();
	disableEdit();
}

function showLogoutPrompt(){
  $("#sgn_prompt_logout").show();
  $("#sgn_prompt_login").hide();
	enableEdit();
}


var gEmailReg = /([\w-\.]+)@((?:[\w]+\.)+)([a-zA-Z]{2,4})/g;

function setupNotes(){
  console.log("@8, start to set up notes");
  var title = $(document).attr("title");
  var email = title.match(gEmailReg)[0];

  console.log("@45", email);

	var currentHref = window.location.href;
	var messageId = currentHref.substring(currentHref.lastIndexOf("/")+1);


  var injectionNode = Gmailr.$(".nH.if"); //hopefully this one is stable
  var textAreaNode = $("<textarea></textarea>", {
    "id": "sgn_input",
    "text": ""
  }).css({
    "width": injectionNode.width() + "px", 
    "height": "150px",
    "color": "gray",
    "margin": "5px"
  }).blur(function(){
    var gdriveNoteId = $("#sgn_gdrive_note_id").val();
    var gdriveFolderId = $("#sgn_gdrive_folder_id").val();
    var content = $(this).val();
		sendMessage({action:"post_message", messageId:messageId, 
            gdriveNoteId:gdriveNoteId, gdriveFolderId:gdriveFolderId, content:content});

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

  var noteIdNode = $("<input type=hidden id='sgn_gdrive_note_id/>");
  var folderIdNode = $("<input type=hidden id='sgn_gdrive_folder_id/>");

  injectionNode.prepend(folderIdNode);
  injectionNode.prepend(noteIdNode);
  injectionNode.prepend(textAreaNode);
  injectionNode.prepend(loginPrompt);
  injectionNode.prepend(logoutPrompt);

  //chrome.runtime.sendMessage({action:"setup_email", email:email},  handleResponse)

  $(".sgn_action").css({
    "cursor":"pointer",
    "text-decoration":"underline"
  }).click(function(){
    var action = $(this).attr("id").substring(4);   //remove the sgn_ prefix
    sendMessage({action: action, email: email});
  });

  //load initial message
  sendMessage({action:"initialize", email: email, messageId:messageId});

  //auto-save every 5 seconds, change detection is done by backend
  /*
  setInterval(function(){
    if($("#sgn_input").is(":enabled")){
      chrome.runtime.sendMessage({action:"post_message", email:email}, handleResponse);
    };

  }, 50000);   
  */
}

/*  for messaging between background and content script */
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


$(document).ready(function(){
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
					break;
        case "show_log_out_prompt":
          showLogoutPrompt();
          break;
        case "show_log_in_prompt":
          console.log("@20, show login");
          showLoginPrompt();
          break;
        case "show_error":
          var errorMessage = request.message;
          console.log("Error in response:", errorMessage);
          alert(errorMessage);
          break;
        case "update_user":
          $("#sgn_user").text(request.email);
          break;
        case "update_content":
          $("#sgn_input").val(request.content);
					break;
        case "update_gdrive_note_info":
          $("#sgn_gdrive_note_id").val(request.gdrive_note_id);
          $("#sgn_gdrive_folder_id").val(request.gdrive_folder_id);
          break;
      }

    }

  )

});

function sendMessage(object)
{
  chrome.runtime.sendMessage(object, function(response){
    console.log("response", response);
  });
}

