/*
 * Simple Gmail Notes 
 * https://github.com/walty8
 * Copyright (C) 2015 Walty Yeung <walty8@gmail.com>
 * License: GPLv3
 *
 * This script is going to be shared for both Firefox and Chrome extensions.
 */

var settings = {
  MAX_RETRY_COUNT : 20
}

/*
 * Callback declarations
 */
sendBackgroundMessage = function(messge) {
  throw "sendBackgroundMessage not implemented";
}

setupBackgroundEventsListener = function(callback) {
  throw "setupBackgroundEventsListener not implemented";
}

getIconBaseUrl = function(){
  throw "getIconBaseUrl not implemented";
}

isDebug = function(callback) {
  //return true;  //turn on this only if u want to check initilization part
  return false;
}

sendEventMessage = function(eventName, eventDetail){
  if(eventDetail == undefined){
    eventDetail = {}
  }

  document.dispatchEvent(new CustomEvent(eventName,  {}));
}

//for shortcut
var debugLog = SimpleGmailNotes.debugLog;

disableEdit = function(retryCount)
{
  if(retryCount == undefined)
    retryCount = settings.MAX_RETRY_COUNT;

  $(".sgn_input").prop("disabled", true);
  $(".sgn_input").val("");

  //clear up the cache
  gEmailKeyNoteDict = {};

  //keep trying until it's visible
  if(!$(".sgn_input").is(":disabled") || $(".sgn_padding").is(":visible")){  
    debugLog("retry disable edit");
    retryCount = retryCount - 1;
    if(retryCount > 0 )
      setTimeout(disableEdit, 100, retryCount);
  }
}

enableEdit = function(retryCount)
{
  if(retryCount == undefined)
      retryCount = settings.MAX_RETRY_COUNT;

  $(".sgn_input").prop("disabled", false);
  if($(".sgn_input").is(":disabled")){  //keep trying until it's visible
    debugLog("retry enable edit");
    retryCount = retryCount - 1;
    if(retryCount > 0 )
        setTimeout(enableEdit, 100, retryCount);
  }
}

showLoginPrompt = function(retryCount){
  if(retryCount == undefined)
      retryCount = settings.MAX_RETRY_COUNT;

  $(".sgn_prompt_login").show();
  $(".sgn_prompt_logout").hide();
  $(".sgn_padding").hide();
  debugLog("Login prompt visible", $(".sgn_prompt_login").is(":visible"));
  if(!$(".sgn_prompt_login").is(":visible")){  //keep trying until it's visible
    debugLog("Retry to show login prompt");
    retryCount = retryCount - 1;
    if(retryCount > 0 )
      setTimeout(showLoginPrompt, 100, retryCount);
  }
}

showLogoutPrompt = function(email, retryCount){
  if(retryCount == undefined)
      retryCount = settings.MAX_RETRY_COUNT;

  $(".sgn_prompt_logout").show();
  $(".sgn_prompt_login").hide();
  $(".sgn_padding").hide();
  $(".sgn_error").hide();

  if(email)
    $(".sgn_prompt_logout").find(".sgn_user").text(email);

  $(".sgn_search").attr("href", getSearchNoteURL());

  $(".sgn_add_calendar").attr("href", getAddCalendarURL());

  if(!$(".sgn_prompt_logout").is(":visible")){  //keep trying until it's visible
    debugLog("Retry to show prompt");
    retryCount = retryCount - 1;
    if(retryCount > 0 )
        setTimeout(showLogoutPrompt, 100, email, retryCount);
  }
}

getGoogleAccountId = function(){
  var re = /mail\/u\/(\d+)/;
  var userId = "0";
  var match = window.location.href.match(re);
  if(match && match.length > 1)
    userId = match[1];

  return userId;
}

getSearchNoteURL = function(){
  //users may have logged into mutliple email addresses
  var userId = getGoogleAccountId();
  var searchUrl = "https://drive.google.com/drive/u/" + userId + "/folders/" + gCurrentGDriveFolderId;

  return searchUrl;
}

getAddCalendarURL = function(){
  var userId = getGoogleAccountId();
  var details = window.location.href + "\n-----\n" + $(".sgn_input").val();
  var title = gCurrentEmailSubject;

  if(title.indexOf("Re:") < 0)
      title = "Re: " + title;

  var addCalendarURL = "https://calendar.google.com/calendar/b/" + userId + 
                            "/render?action=TEMPLATE" +
                            "&text=" + encodeURIComponent(title) + 
                            "&details=" + encodeURIComponent(details);

  return addCalendarURL;
}

//global variables to mark the status of current tab
var gCurrentGDriveNoteId = "";
var gCurrentGDriveFolderId = "";
var gPreviousContent = "";

var gCurrentEmailSubject = "";
var gCurrentEmailDatetime = "";
var gCurrentEmailSender = "";

var gAbstractBackgroundColor = "";
var gAbstractFontColor = "";
var gAbstractFontSize = "";

var gLastValidationTimeStamp = 0;

setupNotes = function(email, messageId){
  debugLog("Start to set up notes");
  debugLog("Email", email);

  $(".nH.if").prepend($("<div></div>", {
    "class" : "sgn_container"
  })); //hopefully this one is stable

  var injectionNode = $(".sgn_container");

  var note = "";


  //  get the last email sender, last email datet time and first email subject  
  var hook = null;

  //get date
  var time = $("gH g3[title]").last().attr("title");
  var sender = $("gk span[email]").last().attr("email");
  var title = $(".ha .hp").first().text();

  var emailKey = SimpleGmailNotes.getHashedKey(title, sender, time)

  //var email id
  var textAreaNode = $("<textarea></textarea>", {
    "class": "sgn_input",
    "text": note,
    "disabled":"disabled"
  }).on("blur", function(){
    var content = $(this).val();
    if(gPreviousContent != content){

      content = "URL: " + window.location.href + "\n" +
                  "-----" + "\n" +
                  content;
              
      var message = {id: messageId, key: emailKey, title: gCurrentEmailSubject, content:content};

      sendBackgroundMessage({action:"post_note", 
                             email:email, 
                             message:message,
                             gdriveNoteId:gCurrentGDriveNoteId, 
                             gdriveFolderId:gCurrentGDriveFolderId});
    }
	  return true;
  });

  var searchLogoutPrompt = $("<div class='sgn_prompt_logout'/></div>" )
      .html("<span class='sgn_current_connection'>Simple Gmail Notes connected to Google Drive of " +
              "'<span class='sgn_user'></span>' </span>" +
              "<a class='sgn_logout sgn_action' >" + 
              "<img title='Log Out' src='" + getIconBaseUrl() + "/logout.24.png'></a>" + 
              "<a class='sgn_open_options sgn_action'>" +
              "<img title='Preferences' src='" + getIconBaseUrl() + "/preferences.24.png'></a>" +
              "<a class='sgn_action sgn_add_calendar' target='_blank'>" +
              "<img title='Add to Google Calendar' src='" + getIconBaseUrl() + "/calendar.24.png'/></a> " +
              "<a class='sgn_action sgn_search' target='_blank'>" +
              "<img title='Search' src='" + getIconBaseUrl() + "/search.24.png'/></a> " +
              "")
      .hide();
  var loginPrompt = $("<div class='sgn_prompt_login'/></div>" )
      .html("Please <a class='sgn_login sgn_action'>connect</a> to " +
              "your Google Drive account to start using Simple Gmail Notes" )
      .hide();
  var emptyPrompt = $("<div class='sgn_padding'>&nbsp;<div>");
  var revokeErrorPrompt = $("<div class='sgn_error sgn_revoke'><div>")
                      .html("Error connecting to Google Drive <span class='sgn_error_timestamp'></span>, " +
                          "please try to <a class='sgn_reconnect sgn_action'>connect</a> again. \n" +
                          "If error persists after 5 attempts, you may try to manually " +
                          "<a href='https://accounts.google.com/b/" + getGoogleAccountId() + 
                          "/IssuedAuthSubTokens'>revoke</a> previous tokens.");

  var userErrorPrompt = $("<div class='sgn_error sgn_user'></div>")
                            .html("Failed to get Google Driver User");

  var loginErrorPrompt = $("<div class='sgn_error sgn_login'></div>")
                            .html("Failed to login Google Drive");

  var customErrorPrompt = $("<div class='sgn_error sgn_custom'></div>");


  $(".sgn_input").remove();
  $(".sgn_prompt_login").remove();
  $(".sgn_prompt_logout").remove();

  injectionNode.prepend(revokeErrorPrompt);
  injectionNode.prepend(userErrorPrompt);
  injectionNode.prepend(loginErrorPrompt);
  injectionNode.prepend(customErrorPrompt);

  injectionNode.prepend(textAreaNode);
  injectionNode.prepend(loginPrompt);
  injectionNode.prepend(searchLogoutPrompt);
  injectionNode.prepend(emptyPrompt);
  $(".sgn_error").hide();


  $(".sgn_action").click(function(){
    var classList =$(this).attr('class').split(/\s+/);
    $.each(classList, function(index, item){
      if(item != 'sgn_action'){  //for all other actions
          var action = item.substring(4);   //remove the 'sgn_' prefix
          sendBackgroundMessage({action: action, email: email, messageId:messageId});
      }
    });
  });


  setTimeout(function(){
     var timestamp = Date.now();

      if(Date.now() - gLastValidationTimeStamp > 3000){ 
          //there is something wrong with the extension
          //alert("extension problem");
          $(".sgn_input").text("WARNING! Simple Gmail Notes is not available.\n\n" +
                               "It's probably because the extension was disabled or updated, " +
                               "in either case please refresh this page to remove the warning. " +
                               "(Left click the address bar and press the 'Enter' key.)"
                               )
                           .css("color", "red")
                           .css("font-weight", "bold");
      }

  }, 2000);
  sendBackgroundMessage({action:"validate_background_alive", email: email});    //if background script died, exception raise from here

  var debugInfo = "";
  sendBackgroundMessage({action:"update_debug_content_info", debugInfo: debugInfo});

  //load initial message
  debugLog("Start to initailize");
  sendBackgroundMessage({action:"initialize", email: email, messageId: messageId});
}


updateNotesOnSummary = function(userEmail, pulledNoteList){
  setTimeout(function(){
    _updateNotesOnSummary(userEmail, pulledNoteList);
  }, 300);  //wait until gmail script processing finished
}


var gEmailKeyNoteDict = {};
_updateNotesOnSummary = function(userEmail, pulledNoteList){
  var addLabelToTitle = function(mailNode, labelNode){
    var hook = $(mailNode).find(".xT .y6");

    if(!hook.length){ //vertical split view
      hook = $(mailNode).next().next().find(".apB .apu");
    }

    if(!hook.find(".sgn").length)
      hook.prepend(labelNode);
  }

  var hasMarkedNote = function(mailNode){
    return mailNode.find(".sgn").length > 0;
  }

  var markNote = function(mailNode, note){
    //var titleNode = getTitleNode(mailNode);
    var labelNode;

    if(note && note.description){

      labelNode = $('<div class="ar as sgn">' +
                            '<div class="at" title="Simple Gmail Notes: ' + SimpleGmailNotes.htmlEscape(note.description) + 
                                '" style="background-color: #ddd; border-color: #ddd;">' + 
                            '<div class="au" style="border-color:#ddd"><div class="av" style="color: #666">' + 
                                 SimpleGmailNotes.htmlEscape(note.short_description) + '</div></div>' + 
                       '</div></div>');

      labelNode.find(".at").css("background-color", gAbstractBackgroundColor)
                           .css("border-color", gAbstractBackgroundColor);
      labelNode.find(".au").css("border-color", gAbstractBackgroundColor);
      labelNode.find(".av").css("color", gAbstractFontColor);

      if(gAbstractFontSize != "default")
          labelNode.find(".av").css("font-size", gAbstractFontSize + "pt");
                          
    }
    else {
      labelNode = $('<div style="display:none" class="sgn"></div>');
    }

    addLabelToTitle(mailNode, labelNode);
  }

  if(pulledNoteList && pulledNoteList.length){
    debugLog("updated summary from pulled note, total count:", 
             pulledNoteList.length);
    $.each(pulledNoteList, function(index, item){
      gEmailKeyNoteDict[email.key] = {"description": item.description, 
                                     "short_description": item.short_description};
    });
  }

  //loop for each email tr
  $("tr.zA[sgn_email_key]").each(function(){
    var emailKey = SimpleGmailNotes.getHashedKey($(this));
    var emailNote =  gEmailKeyNoteDict[emailKey];

    if(emailNote && emailNote.description && $(this).find(".sgn").css("display") == "none"){
        $(this).find(".sgn").remove();  //remove the element, so it would be filled later
        $(this).removeAttr("sgn_email_key");
    }

    //debugLog("Working on email:", emailKey);
    if(!hasMarkedNote($(this))){
      markNote($(this), emailNote, emailKey);
    }
  });
}

pullNotes = function(userEmail, requestList){
  debugLog("@418, pulling notes");
  //batch pull logic here
  sendBackgroundMessage({action:'pull_notes', 
         		 email:userEmail, 
			 pendingPullList:requestList});
}

setupListeners = function(){
  setupBackgroundEventsListener(function(request){
    debugLog("Handle request", request);
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
        debugLog("Show login");
        showLoginPrompt();
        disableEdit();
        break;
      case "show_error":
        var errorMessage = request.message;
        var type = request.type;

        debugLog("Error in response:", errorMessage);
        var date = new Date();
        var timestamp = date.getHours() + ":" + date.getMinutes() + ":" + 
                          date.getSeconds();
        $(".sgn_error_timestamp").text("(" +  timestamp + ")");
        $(".sgn_error").hide();
        $(".sgn_error.sgn_" + type).show();
        if(type == "custom"){
          $(".sgn_error.sgn_custom").text(errorMessage);
        }

        break;
      case "update_user":
        $(".sgn_user").text(request.email);

        $("div.sgn").remove();  //clean up all those outdated div
        break;
      case "update_content":
        var content = request.content;
        var lineList = content.split("\n");
        //remove all contents above separator
        while(lineList.length){
          var line = lineList.shift();

          if(line.indexOf("-----") == 0){
            break;
          }
        }
        content = lineList.join("\n")

        gPreviousContent = content;
        $(".sgn_input").val(content);
        showLogoutPrompt(request.email);
        break;
      case "update_gdrive_note_info":
        debugLog("Update google drive note info", 
                      request.gdriveFolderId, request.gdriveFolderId);
        gCurrentGDriveFolderId = request.gdriveFolderId;
        gCurrentGDriveNoteId = request.gdriveNoteId;
        break;
      case "set_debug":
        debugLog("Trying to set debug: " + request.value);
        isDebugCache = request.value;
        //settings.DEBUG = false;
        break;
      case "update_summary":
        debugLog("update summary from background call", request.email);
        var noteList = request.noteList;
        updateNotesOnSummary(request.email, noteList);
        break;
      //remove the note in cache, so the new notes would be collected next time
      case "revoke_summary_note":
        debugLog("Trying to revoke summary note", request);
        //var emailId = request.messageId;
        var emailKey = request.messageKey;
        var sgnId = "sgn_" + SimpleGmailNotes.hashFnv32a(emailKey, true);

        $(".sgn[sgn_id='" + sgnId + "']").remove();

        debugLog("@447", emailKey);

        //gEmailKeyNoteDict = {};
        delete gEmailKeyNoteDict[emailKey];

        debugLog("Requesting force reload");
        sendEventMessage("SGN_force_reload");

        break;

      case "update_preferences":
        var preferences = request.preferences;

        var noteHeight = preferences["noteHeight"];
        if(noteHeight)
          $(".sgn_input").css("height", parseInt(noteHeight) * 18 +"px");

        var fontColor = preferences["fontColor"];
        if(fontColor)
          $(".sgn_input").css("color", SimpleGmailNotes.htmlEscape(fontColor));

        var backgroundColor = preferences["backgroundColor"];
        if(backgroundColor)
          $(".sgn_input").css("background-color", backgroundColor);

        var fontSize = preferences["fontSize"];
        if(fontSize != "default"){
          $(".sgn_input").css("font-size", fontSize + "pt");
          $(".sgn_current_connection").css("font-size", fontSize + "pt");
        }

        gAbstractBackgroundColor = preferences["abstractBackgroundColor"];
        gAbstractFontColor = preferences["abstractFontColor"];
        gAbstractFontSize = preferences["abstractFontSize"];

        var firstVisible = $(".sgn_container:visible").first();
        //avoid duplicates
        $(".sgn_container").hide();
        firstVisible.show();

        var notePosition = preferences["notePosition"];
        if(notePosition == "bottom"){
          debugLog("@485, move to bottom");
          //$(".nH.aHU").find(".sgn_container").remove();
          $(".nH.aHU").append(firstVisible);
        }

        var showConnectionPrompt = (preferences["showConnectionPrompt"] !== "false");
        if(!showConnectionPrompt){
          $(".sgn_current_connection").hide();
        }

        var showAddCalendar = (preferences["showAddCalendar"] !== "false");
        if(!showAddCalendar){
          $(".sgn_add_calendar").hide();
        }

        debugLog("@470", preferences);
        break;
      case "update_validation_timestamp":
        gLastValidationTimeStamp = Date.now();
        break;
      default:
        debugLog("unknown background request", request);
    }
  });

  // Event listener for page
  document.addEventListener('SGN_setup_notes', function(e) {
    var email = e.detail.email;
    var messageId = e.detail.messageId;

    if(!SimpleGmailNotes.isAlphaNumeric(messageId)){
      debugLog("invalid message ID (setup notes): " + messageId);
      return;
    }

    if(!SimpleGmailNotes.isValidEmail(email)){
      debugLog("invalid email (setup notes): " + email);
      return;
    }
    setupNotes(email, messageId);
  });

  document.addEventListener('SGN_setup_email_info', function(e) {
    var email = e.detail.email;
    var messageId = e.detail.messageId;

    if(!SimpleGmailNotes.isAlphaNumeric(messageId)){
      debugLog("invalid message ID (setup email info): " + messageId);
      return;
    }

    if(!SimpleGmailNotes.isValidEmail(email)){
      debugLog("invalid email (setup email info): " + email);
      return;
    }

    //for future post note use
    gCurrentEmailSubject = e.detail.subject;
    gCurrentEmailDatetime = e.detail.datetime;
    gCurrentEmailSender = e.detail.sender;
  });


  document.addEventListener('SGN_pull_notes', function(e) {
    debugLog("Requested to pull notes");
    var email = e.detail.email;
    var emailList = e.detail.emailList;

    if(!SimpleGmailNotes.isValidEmail(email)){
      debugLog("invalid email (pull notes): " + email);
      return;
    }

    $.each(emailList, function(_index, _email){
      if(!SimpleGmailNotes.isAlphaNumeric(_email.id)){
        debugLog("invalid message ID (pull notes): " + _email.id);
        return;
      }
    });

    pullNotes(email, emailList);

  });

  document.addEventListener('SGN_update_debug_page_info', function(e) {
      debugLog("Got page debug info");
      var debugInfo = e.detail.debugInfo;
      sendBackgroundMessage({action: "update_debug_page_info", debugInfo: debugInfo});
  });
}

debugLog("Finished content script (common)");
