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

/* callback declarations */
var sendBackgroundMessage = function(messge) {
  throw "sendBackgroundMessage not implemented";
}

var setupBackgroundEventsListener = function(callback) {
  throw "setupBackgroundEventsListener not implemented";
}

var getIconBaseUrl = function(){
  throw "getIconBaseUrl not implemented";
}

var addScript = function(scriptPath){
  throw "addScript is not implemented";
}

var isDebug = function(callback) {
  //return true;  //turn on this only if u want to check initilization part
  return false;
}

/* -- end -- */

/* global variables to mark the status of current tab */
var gEmailIdNoteDict = {};

var gCurrentGDriveNoteId = "";
var gCurrentGDriveFolderId = "";
var gPreviousContent = "";

var gCurrentEmailSubject = "";
var gCurrentMessageId = "";

var gAbstractBackgroundColor = "";
var gAbstractFontColor = "";
var gAbstractFontSize = "";

var gLastHeartBeat = Date.now();
var gSgnEmtpy = "<SGN_EMPTY>";
/* -- end -- */

var htmlEscape = function(str) {
    return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
}

//http://stackoverflow.com/questions/4434076/best-way-to-alphanumeric-check-in-javascript#25352300
var isAlphaNumeric = function(str) {
  var code, i, len;

  for (i = 0, len = str.length; i < len; i++) {
    code = str.charCodeAt(i);
    if (!(code > 47 && code < 58) && // numeric (0-9)
        !(code > 64 && code < 91) && // upper alpha (A-Z)
        !(code > 96 && code < 123)) { // lower alpha (a-z)
      return false;
    }
  }
  return true;
};

//http://stackoverflow.com/questions/46155/validate-email-address-in-javascript#1373724
var isValidEmail = function(email) {
  var re = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i; 
  return re.test(email);
}
  
var sendEventMessage = function(eventName, eventDetail){
  if(eventDetail == undefined){
    eventDetail = {}
  }

  document.dispatchEvent(new CustomEvent(eventName,  {detail: eventDetail}));
}

var debugLog = function()
{
  var debugStatus = isDebug();
  if (debugStatus) {
      console.log.apply(console, arguments);
  }
}

var disableEdit = function(retryCount)
{
  if(retryCount == undefined)
    retryCount = settings.MAX_RETRY_COUNT;

  $(".sgn_input").prop("disabled", true);
  $(".sgn_input").val("");

  //clear up the cache
  gEmailIdNoteDict = {};

  //keep trying until it's visible
  if(!$(".sgn_input").is(":disabled") || $(".sgn_padding").is(":visible")){  
    debugLog("retry disable edit");
    retryCount = retryCount - 1;
    if(retryCount > 0 )
      setTimeout(disableEdit, 100, retryCount);
  }
}

var enableEdit = function(retryCount)
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

var showLoginPrompt = function(retryCount){
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

var showLogoutPrompt = function(email, retryCount){
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

var getCurrentGoogleAccountId = function(){
  var re = /mail\/u\/(\d+)/;
  var userId = "0";
  var match = window.location.href.match(re);
  if(match && match.length > 1)
    userId = match[1];

  return userId;
}

var getSearchNoteURL = function(){
  var userId = getCurrentGoogleAccountId();
  var searchUrl = "https://drive.google.com/drive/u/" + userId + "/folders/" + gCurrentGDriveFolderId;

  return searchUrl;
}

var getAddCalendarURL = function(){
  var userId = getCurrentGoogleAccountId();
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

var setupNoteEditor = function(email, messageId){
  debugLog("Start to set up notes");
  debugLog("Email", email);

  appendDebugInfo("startSetupNote");

  var injectionNode = $(".sgn_container");
  var message = gEmailIdNoteDict[messageId];

  var note = ""
  if(message && message.description)
    note = message.description;


  var textAreaNode = $("<textarea></textarea>", {
    "class": "sgn_input",
    "text": note,
    "disabled":"disabled"
  }).on("blur", function(){
    var currentInput = $(".sgn_input:visible");
    var emailSubject = gCurrentEmailSubject;
    var noteId = gCurrentGDriveNoteId;
    var folderId = gCurrentGDriveFolderId;

    setTimeout(function(){
      var isDisabled = currentInput.prop('disabled');
      var content = currentInput.val();

      if(!isDisabled && gPreviousContent != content){
        delete gEmailIdNoteDict[messageId];//delete the prevoius note
        sendBackgroundMessage({action:"post_note", email:email, messageId:messageId, 
                     emailTitleSuffix: emailSubject,
                     gdriveNoteId:noteId, 
                     gdriveFolderId:folderId, content:content});
      }
      return true;
    }, 200);  //save the note a bit later
  });


  var searchLogoutPrompt = $("<div class='sgn_prompt_logout'/></div>" )
      .html("<span class='sgn_current_connection'>Simple Gmail Notes connected to Google Drive of " +
              "'<span class='sgn_user'></span>' </span>" +
              "<a class='sgn_logout sgn_action' >" + 
              "<img title='Log Out' src='" + getIconBaseUrl() + "/logout.24.png'></a>" + 
              "<a class='sgn_open_options sgn_action'>" +
              "<img title='Preferences' src='" + getIconBaseUrl() + "/preferences.24.png'></a>" +
              "<a class='sgn_action sgn_delete' target='_blank'>" +
              "<img title='Delete' src='" + getIconBaseUrl() + "/delete.24.png'/></a> " +
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
                          "<a href='https://accounts.google.com/b/" + getCurrentGoogleAccountId() + 
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
          var request = {action: action, email: email, messageId:messageId, 
                         gdriveNoteId:gCurrentGDriveNoteId};

          if(action == "delete"){
            if(!confirm("Are you sure you want to delete this note?"))
              return;

            $(".sgn_input:visible").val("");  //remove the note in text area
            gPreviousContent = "";

            //check if note exists
            if(!gCurrentGDriveNoteId)
              return;

            delete gEmailIdNoteDict[messageId];//delete the prevoius note
            gCurrentGDriveNoteId = "";
          }


          sendBackgroundMessage(request);
      }
    });
  });


  //nothing to show now
  //sendBackgroundMessage({action:"update_debug_content_info", debugInfo: ""});

  //load initial message
  debugLog("Start to initailize");
  sendBackgroundMessage({action:"initialize", email: email, messageId: messageId});
}


var updateNotesOnSummary = function(userEmail, pulledNoteList){
  var addAbstractNode = function(mailNode, abstractNode){
    var hook = $(mailNode).find(".xT .y6");

    if(!hook.length){ //vertical split view
      hook = $(mailNode).next().next().find(".apB .apu");
    }

    if(!hook.find(".sgn").length)
      hook.prepend(abstractNode);
  }

  var hasMarked = function(mailNode){
    return mailNode.find(".sgn").length > 0;
  }

  var markAbstract = function(mailNode, note, emailKey){
    var abstractNode;

    if(note && note.description && note.description != gSgnEmtpy){
      abstractNode = $('<div class="ar as sgn">' +
                            '<div class="at" title="Simple Gmail Notes: ' + htmlEscape(note.description) + '" style="background-color: #ddd; border-color: #ddd;">' + 
                            '<div class="au" style="border-color:#ddd"><div class="av" style="color: #666">' + htmlEscape(note.short_description) + '</div></div>' + 
                       '</div></div>');

      abstractNode.find(".at").css("background-color", gAbstractBackgroundColor)
                           .css("border-color", gAbstractBackgroundColor);
      abstractNode.find(".au").css("border-color", gAbstractBackgroundColor);
      abstractNode.find(".av").css("color", gAbstractFontColor);

      if(gAbstractFontSize != "default")
          abstractNode.find(".av").css("font-size", gAbstractFontSize + "pt");
                          
    }
    else {
      abstractNode = $('<div style="display:none" class="sgn"></div>');
    }

    addAbstractNode(mailNode, abstractNode);
  }

  if(pulledNoteList && pulledNoteList.length){
    debugLog("updated summary from pulled note, total count:", 
             pulledNoteList.length);

    $.each(pulledNoteList, function(index, item){
      gEmailIdNoteDict[item.id] = {"description": item.description, 
                                   "short_description": item.short_description};
    });
  }

  //loop for each email tr
  $("tr.zA[sgn_email_id]").each(function(){
    var emailId = $(this).attr("sgn_email_id")
    var emailNote = gEmailIdNoteDict[emailId];

    if(emailNote && emailNote.description && $(this).find(".sgn").css("display") == "none"){
      $(this).find(".sgn").remove();  //remove the element, so it would be filled later
      $(this).removeAttr("sgn_email_id");
    }

    if(!hasMarked($(this))){
      markAbstract($(this), emailNote, emailId);
    }

  });
}

var pullNotes = function(userEmail, requestList){
  var pendingPullList = [];

  debugLog("@418, pulling notes");

  //batch pull logic here
  if(requestList.length){
    sendBackgroundMessage({action:'pull_notes', email:userEmail, 
                           pendingPullList:requestList});
  }
  else{
    debugLog("no pending item, skipped the pull");
    updateNotesOnSummary(userEmail, [])
  }
}


var setupListeners = function(){
  /* Event listener for page */
  document.addEventListener('SGN_setup_note_editor', function(e) {
    var email = e.detail.email;
    var messageId = e.detail.messageId;

    if(!isAlphaNumeric(messageId)){
      debugLog("invalid message ID (setup note editor): " + messageId);
      return;
    }

    if(!isValidEmail(email)){
      debugLog("invalid email (setup note editor): " + email);
      return;
    }

    setupNoteEditor(email, messageId);
  });

  document.addEventListener('SGN_heart_beat_request', function(e){
    sendBackgroundMessage({action:"heart_beat_request", email:e.detail.email});    //if background script died, exception raise from here
  });

  document.addEventListener('SGN_setup_email_info', function(e) {
    var email = e.detail.email;
    var messageId = e.detail.messageId;

    if(!isAlphaNumeric(messageId)){
      debugLog("invalid message ID (setup email info): " + messageId);
      return;
    }

    if(!isValidEmail(email)){
      debugLog("invalid email (setup email info): " + email);
      return;
    }

    //for add to calendar use
    gCurrentEmailSubject = e.detail.subject;
    gCurrentMessageId = messageId;
  });


  document.addEventListener('SGN_pull_notes', function(e) {
    debugLog("Requested to pull notes");
    var email = e.detail.email;
    var requestList = e.detail.requestList;

    if(!isValidEmail(email)){
      debugLog("invalid email (pull notes): " + email);
      return;
    }

    $.each(requestList, function(_index, _emailId){
      if(!isAlphaNumeric(_emailId)){
        debugLog("invalid message ID (pull notes): " + _emailId);
        return;
      }
    });

    pullNotes(email, requestList);

  });

  document.addEventListener('SGN_update_debug_page_info', function(e) {
      debugLog("Got page debug info");
      var debugInfo = e.detail.debugInfo;
      sendBackgroundMessage({action: "update_debug_page_info", debugInfo: debugInfo});
  });
  /* -- end -- */

  /* handle events from background script */
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

        if(request.messageId == gCurrentMessageId){
          gPreviousContent = request.content;
          var displayContent = request.content;
          var warningMessage = SimpleGmailNotes.offlineMessage;
          if(displayContent.indexOf(warningMessage) == 0){
            displayContent = displayContent.substring(warningMessage.length); //truncate the warning message part
          }
          $(".sgn_input").val(displayContent);
          showLogoutPrompt(request.email);
        }


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
      case "revoke_summary_note":
        debugLog("Trying to revoke summary note", request);
        var emailId = request.messageId;

        //remove the note in cache, so the new notes would be collected next time
        $("tr[sgn_email_id='" + emailId + "'] .sgn").remove();

        debugLog("@447", emailId);
        debugLog("Requesting force reload");

        sendEventMessage("SGN_PAGE_force_reload");  //no effect to the page script now
        break;

      case "update_preferences":
        var preferences = request.preferences;

        var noteHeight = preferences["noteHeight"];
        if(noteHeight)
          $(".sgn_input").css("height", parseInt(noteHeight) * 18 +"px");

        var fontColor = preferences["fontColor"];
        if(fontColor)
          $(".sgn_input").css("color", htmlEscape(fontColor));

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
          $(".nH.aHU").append(firstVisible);
        } else if(notePosition == "side-top") {
          $(".nH.adC").prepend(firstVisible);
        } else if(notePosition == "side-bottom") {
          $(".nH.adC .nH .u5").before(firstVisible);
        }

        //reset class attribute with current 'position' class
        firstVisible.attr('class', 'sgn_container sgn_position_' + notePosition);

        var showConnectionPrompt = (preferences["showConnectionPrompt"] !== "false");
        if(!showConnectionPrompt){
          $(".sgn_current_connection").hide();
        }

        var showAddCalendar = (preferences["showAddCalendar"] !== "false");
        if(!showAddCalendar){
          $(".sgn_add_calendar").hide();
        }

        var showDeleteButton = (preferences["showDelete"] !== "false");
        if(!showDeleteButton){
          $(".sgn_delete").hide();
        }



        debugLog("@470", preferences);
        break;
      case "heart_beat_response":
        gLastHeartBeat = Date.now();
        sendEventMessage('SGN_PAGE_heart_beat_response', request.gdriveEmail);  
        break;
      default:
        debugLog("unknown background request", request);
    }
  });
}

var gDebugInfo = "";
var appendDebugInfo = function(message){
  if(gDebugInfo.indexOf(message) < 0){
    if(gDebugInfo)
      gDebugInfo += ", "

    gDebugInfo += message ;
    sendBackgroundMessage({action:"update_debug_content_info", debugInfo: gDebugInfo});
  }
}


//use for page script set up
var contentLoadStarted = false;
var contentLoadDone = false;

function setupPage(){
    addScript('lib/jquery-3.1.0.min.js');
    addScript('lib/gmail.js');
    addScript('common/shared-common.js');
    addScript('common/page-common.js');
    addScript('page.js');
}


function fireContentLoadedEvent() {
    if(contentLoadStarted){
        appendDebugInfo("skipLoading");
        return;
    }

    contentLoadStarted = true;
    appendDebugInfo("contentLoadStarted");

    setupListeners();
    setupPage();

    contentLoadDone = true;
    appendDebugInfo("contentLoadDone");
}

debugLog("Finished content script (common)");
