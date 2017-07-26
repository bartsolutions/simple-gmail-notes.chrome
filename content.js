/*
 * Simple Gmail Notes 
 * https://github.com/walty8
 * Copyright (C) 2017 Walty Yeung <walty@bart.com.hk>
 * License: GPLv3
 *
 */

//use a shorter name as we won't have name conflict here
var SGNC = SimpleGmailNotes;
var settings = {
  MAX_RETRY_COUNT : 20
};

var sgnGmailDom = new SGNGmailDOM(jQuery);

var gLastPullTimestamp = null;
var gNextPullTimestamp = null;
var gConsecutiveRequests = 0;
var gConsecutiveStartTime = 0;
var g_oec = 0;    //open email trigger count
var g_lc = 0;     //local trigger count
var g_pnc = 0;    //pulled network trigger count
//network locking safe guard -- avoid disaster by over requests
var acquireNetworkLock = function() {
  var timestamp = Date.now(); 
  var resetCounter = false;

  if(gNextPullTimestamp){//if gNextPullTimestamp is set
      if(gNextPullTimestamp > timestamp) //skip the request
          return false;
      else {
          gNextPullTimestamp = null;
          return true;
      }
  }

  //avoid crazy pulling in case of multiple network requests
  //pull again in 3 seconds, for whatever reasons
  if(timestamp - gLastPullTimestamp < 3 * 1000)  
    gConsecutiveRequests += 1;
  else{
    resetCounter = true;
  }

  if(gConsecutiveRequests >= 20){
    //penalty timeout for 60 seconds
      gNextPullTimestamp = timestamp + 60 * 1000; 

      var message = "20 consecutive network requests detected from Simple Gmail Notes, " +
                    "the extension would be self-disabled for 60 seconds.\n\n" +
                    "Please try to close and reopen the browser to clear the cache of extension. " + 
                    "If the problem persists, please consider to disable/uninstall this extension " +
                    "to avoid locking of your Gmail account. " +
                    "This warning message is raised by the extension developer (not Google), " +
                    "just to ensure your account safety.\n\n" +
                    "If possible, please kindly send the following information to the extension bug report page, " +
                    "it would be helpful for the developer to diagnose the problem. Thank you!\n\n";
      message += "oec:" + g_oec;
      message += "; lc:" + g_lc;
      message += "; pnc:" + g_pnc;
      message += "; tt:" + Math.round(timestamp - gConsecutiveStartTime);

      //very intrusive, but it's still better then 
      //have the account locked up by Gmail!!!
      alert(message); 

      resetCounter = true;
  }

  if(resetCounter){
      gConsecutiveRequests = 0;
      gConsecutiveStartTime = timestamp;
      g_oec = 0;
      g_lc = 0;
      g_pnc = 0;
  }

  gLastPullTimestamp = timestamp;

  return true;
};

var sendBackgroundMessage = function(message){
  var networkActions = ["post_note", "initialize", "pull_notes", "delete"];
  var action = message.action;

  if(networkActions.includes(action) && !acquireNetworkLock()){
    var error = "Failed to get network lock: " + action;
    SGNC.appendLog(error);
    debugLog(error);
    if(action == "pull_notes"){
      g_pnc += 1;
    }
    else if(action == "initailize"){
      g_lc += 1;
    }
    else if(action == "post_note"){
      g_oec += 1;
    }

    return;
  }

  SGNC.getBrowser().runtime.sendMessage(message, function(response){
    debugLog("Message response", response);
  });
};

var setupBackgroundEventsListener = function(callback) {
  SGNC.getBrowser().runtime.onMessage.addListener(
      function(request, sender, sendResponse) {
        callback(request);
      }
  );
};

var addScript = function(scriptPath){
    var j = document.createElement('script');
    j.src = SGNC.getBrowser().extension.getURL(scriptPath);
    j.async = false;
    j.defer = false;
    (document.head || document.documentElement).appendChild(j);
};



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

var gCurrentPreferences = {};

var gLastHeartBeat = Date.now();
var gLastPreferenceString = "";

var gSgnEmtpy = "<SGN_EMPTY>";

/* -- end -- */

var htmlEscape = function(str) {
    return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
};

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
var gEmailRe = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i; 
var isValidEmail = function(email) {
  return gEmailRe.test(email);
};
  
var sendEventMessage = function(eventName, eventDetail){
  if(eventDetail === undefined){
    eventDetail = {};
  }

  document.dispatchEvent(new CustomEvent(eventName,  {detail: JSON.stringify(eventDetail)}));
};

var debugLog = function()
{
  if (SGNC.isDebug()) {
      console.log.apply(console, arguments);
  }
};

var disableEdit = function(retryCount)
{
  if(retryCount === undefined)
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
};

var enableEdit = function(retryCount)
{
  if(retryCount === undefined)
      retryCount = settings.MAX_RETRY_COUNT;

  $(".sgn_input").prop("disabled", false);
  if($(".sgn_input").is(":disabled")){  //keep trying until it's visible
    debugLog("retry enable edit");
    retryCount = retryCount - 1;
    if(retryCount > 0 )
        setTimeout(enableEdit, 100, retryCount);
  }
};

var showLoginPrompt = function(retryCount){
  if(retryCount === undefined)
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
};

var getNoteProperty = function(properties, propertyName){
  if(!properties){
    console.log("Warning, no property found");
    return "";
  }

  for(var i=0; i<properties.length; i++){
    if(properties[i]["key"] == propertyName){
      return properties[i]["value"];
    }
  }

  return "";
};

var setCurrentBackgroundColor = function(backgroundColor){
  var input = SGNC.getCurrentInput();
  input.css('background-color', backgroundColor);
  input.parents(".sgn_container").find(".sgn_color_picker_value").val(backgroundColor);
};

var showLogoutPrompt = function(email, retryCount){
  if(retryCount === undefined)
      retryCount = settings.MAX_RETRY_COUNT;

  $(".sgn_prompt_logout").show();
  $(".sgn_prompt_login").hide();
  $(".sgn_padding").hide();
  $(".sgn_error").hide();

  if(email)
    $(".sgn_prompt_logout").find(".sgn_user").text(email);


  if(!$(".sgn_prompt_logout").is(":visible")){  //keep trying until it's visible
    debugLog("Retry to show prompt");
    retryCount = retryCount - 1;
    if(retryCount > 0 )
        setTimeout(showLogoutPrompt, 100, email, retryCount);
  }
};

var getCurrentGoogleAccountId = function(){
  var re = /mail\/u\/(\d+)/;
  var userId = "0";
  var match = window.location.href.match(re);
  if(match && match.length > 1)
    userId = match[1];

  return userId;
};

var getSearchNoteURL = function(){
  var userId = getCurrentGoogleAccountId();
  var searchUrl = "https://drive.google.com/drive/u/" + userId + "/folders/" + gCurrentGDriveFolderId;

  return searchUrl;
};

//I use http instead of https here, because otherwise a new window will not be popped up
//in most cases, google would redirect http to https
var getHistoryNoteURL = function(messageId){
  var userId = getCurrentGoogleAccountId();
  var url = "http://mail.google.com/mail/u/" + userId + "/#all/" + messageId;
  return url;
};

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
};

var postNote = function(email, messageId){
    var emailSubject = gCurrentEmailSubject;
    var noteId = gCurrentGDriveNoteId;
    var folderId = gCurrentGDriveFolderId;
    var content = SGNC.getCurrentContent();
    var backgroundColor = SGNC.getCurrentBackgroundColor();
    var properties = [{"key" : "sgn-background-color", "value" : backgroundColor},
                      {"key" : "sgn-author", "value" : email}];
    

    sendBackgroundMessage({action:"post_note", 
                           email:email, 
                           messageId:messageId, 
                           emailTitleSuffix: emailSubject,
                           gdriveNoteId:noteId, 
                           gdriveFolderId:folderId, 
                           content:content,
                           properties:properties});
};

var getNoteEditorInjectionNode = function(){
  var injectionNode = $(".sgn_container:visible");

  return injectionNode;
};

var deleteMessage = function(messageId){    	
    $(".sgn_input:visible").val('');
    gPreviousContent = '';
    if(!gCurrentGDriveNoteId){
  	return;
    }
    delete gEmailIdNoteDict[messageId];
    gCurrentGDriveNoteId = '';
};

var setupSidebarLayout = function(containerNode){
  var logo = containerNode.find(".sgn_bart_logo");

  containerNode.append(logo);
};

var updateGmailNotePosition = function(injectionNode, notePosition){
  if(notePosition == "bottom"){
    debugLog("@485, move to bottom");
    $(".nH.aHU:visible").append(injectionNode);
  } else if(notePosition == "side-top") {
    //$(".nH.adC").prepend(firstVisible);
    setupSidebarLayout(injectionNode);
    SimpleGmailNotes.getSidebarNode().prepend(injectionNode);
  } else if(notePosition == "side-bottom") {
    //$(".nH.adC .nH .u5").before(firstVisible);
    setupSidebarLayout(injectionNode);
    SimpleGmailNotes.getSidebarNode().append(injectionNode);
  } else {  //top
    $(".nH.if:visible").prepend(injectionNode);  //hopefully this one is stable
  }
};

var updateUIByPreferences = function(){
  var preferences = SimpleGmailNotes.preferences;
  if(!preferences)  //ui not ready
    return;
  
  var fontColor = preferences["fontColor"];
  if(fontColor)
    $(".sgn_input").css("color", htmlEscape(fontColor));

  var backgroundColor = preferences["backgroundColor"];
  if(backgroundColor){
    if(!SimpleGmailNotes.getCurrentBackgroundColor()){
      $(".sgn_input").css("background-color", backgroundColor);
    }

    $(".sgn_history_note").css("background-color", backgroundColor);
  }

  var fontSize = preferences["fontSize"];
  if(fontSize != "default"){
    $(".sgn_input").css("font-size", fontSize + "pt");
  }
  fontSize = parseInt($(".sgn_input").css("font-size"));

  var noteHeight = parseInt(preferences["noteHeight"]);
  if(noteHeight && SimpleGmailNotes.isInbox() && noteHeight > 4)
    noteHeight = 4;

  //noteHeight = parseInt(noteHeight);
  if(noteHeight){
    $(".sgn_input").css("height", noteHeight * fontSize * 1.2 + 6 + "px");
  }


  var firstVisible = $(".sgn_container:visible").first();
  $(".sgn_container:visible:not(:first)").hide();
  //avoid duplicates
  //$(".sgn_container").hide();
  //firstVisible.show();

  var notePosition = preferences["notePosition"];

  if(!SimpleGmailNotes.isInbox())
    updateGmailNotePosition(firstVisible, notePosition);

  //reset class attribute with current 'position' class
  firstVisible.removeClass('sgn_position_top');
  firstVisible.removeClass('sgn_position_bottom');
  firstVisible.removeClass('sgn_position_side-top');
  firstVisible.removeClass('sgn_position_side-bottom');
  firstVisible.addClass('sgn_position_' + notePosition);

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

  var showNoteColorPicker = (preferences["showNoteColorPicker"] !== "false");
  if(!showNoteColorPicker){
    $(".sgn_color_picker").hide();
  }

  debugLog("@470", preferences);
};

var setupNoteEditor = function(email, messageId){
  debugLog("Start to set up notes");
  debugLog("Email", email);

  var injectionNode = $("<div class='sgn_container'></div>");


  if(SimpleGmailNotes.isInbox()){
    var dataNode = sgnGmailDom.inboxDataNode();
    injectionNode.addClass("sgn_inbox");
    subject = dataNode.parent().text();

    debugLog("@317: " + messageId);

    injectionNode.on("click", function(event){
      //click of texarea would close the email 
      event.stopPropagation();
    });

    var hookNode = sgnGmailDom.inboxHookNode();
    //put the node inside the content
    hookNode.prepend(injectionNode);

    //hookNode.before(injectionNode);  //hopefully this one is stable
  }
  else{
    subject = $(".ha h2.hP:visible").text();
    var notePosition = "top";
    if(SimpleGmailNotes.preferences){
      notePosition = SimpleGmailNotes.preferences["notePosition"];
    }
    updateGmailNotePosition(injectionNode, notePosition);
  }

  injectionNode.hide();

  //hide all others
  $(".sgn_container:visible").remove();
  injectionNode.show();

  setupCalendarInfo(email, messageId, subject);

  //text area failed to create, may cause dead loop
  if(!$(".sgn_container:visible").length)  
  {
      SGNC.appendLog("Injection node failed to be found");
      return;
  }


  appendDebugInfo("startSetupNote");

  //var injectionNode = getNoteEditorInjectionNode();
  //try to get the cached message
  var cachedMessage = gEmailIdNoteDict[messageId];

  var note = "";
  if(cachedMessage && cachedMessage.description)
    note = cachedMessage.description;


  var textAreaNode = $("<textarea></textarea>", {
    "class": "sgn_input",
    "text": note,
    "disabled":"disabled"
  }).on("blur", function(){
    //var currentInput = $(".sgn_input:visible");
    //var emailSubject = gCurrentEmailSubject;
    //var noteId = gCurrentGDriveNoteId;
    //var folderId = gCurrentGDriveFolderId;

    var isDisabled = SGNC.getCurrentInput().prop('disabled');
    //var content = currentInput.val();

    if(!isDisabled && (gPreviousContent != SGNC.getCurrentContent())){
      delete gEmailIdNoteDict[messageId];//delete the prevoius note

      postNote(email, messageId);
    }

    return true;
  });


  var backgroundColor = "";

  if(cachedMessage && cachedMessage.properties){
    backgroundColor = getNoteProperty(cachedMessage.properties, 'sgn-background-color');
    if(backgroundColor){
      textAreaNode.css("background-color", backgroundColor);
    }
  }

  var searchLogoutPrompt = $("<div class='sgn_prompt_logout'/></div>" )
      .html("" + 
              "<a target='_blank' class='sgn_bart_logo' href='" + SGNC.getOfficalSiteUrl("ed") + "'>" + 
              "<img title='Powered By Bart Soluions' src='" + SGNC.getLogoImageSrc("ed") + "'></a>" + 
              "<a class='sgn_action sgn_current_connection'>SGN: " +
              "<span class='sgn_user'></span></a> " +
              "<a class='sgn_logout sgn_action sgn_button' >" + 
              "<img title='Log Out' src='" + 
                SGNC.getIconBaseUrl() + "/logout.24.png'></a>" + 
              "<a class='sgn_open_options sgn_action sgn_button'>" +
              "<img title='Preferences' src='" + 
                SGNC.getIconBaseUrl() + "/preferences.24.png'></a>" +
              "<a class='sgn_action sgn_delete sgn_button' target='_blank'>" +
              "<img title='Delete' src='" + 
                SGNC.getIconBaseUrl() + "/delete.24.png'></a> " +
              "<a class='sgn_action sgn_add_calendar sgn_button' target='_blank'>" +
              "<img title='Add to Google Calendar' src='" + 
                SGNC.getIconBaseUrl() + "/calendar.24.png'></a> " +
              "<a class='sgn_action sgn_search sgn_button' target='_blank'>" +
              "<img title='Search' src='" + 
                SGNC.getIconBaseUrl() + "/search.24.png'></a> " +
              "<a class='sgn_action sgn_color_picker sgn_button'>" +
              "<input type='hidden' class='sgn_color_picker_value' value='" + backgroundColor + "'>" +
              "<img title='Note Color' class='sgn_color_picker_button' src='" + 
                SGNC.getIconBaseUrl() + "/color-picker.24.png'></a> " +
              "")
      .hide();
  var loginPrompt = $("<div class='sgn_prompt_login'/></div>" )
      .html("Please <a class='sgn_login sgn_action'>log in</a> " +
              "your Google Drive account to start using Simple Gmail Notes" )
      .hide();
  var emptyPrompt = $("<div class='sgn_padding'>&nbsp;<div>");
  var revokeErrorPrompt = $("<div class='sgn_error sgn_revoke'><div>")
                      .html("Error found with the existing token. " +
                          "Please try to <a class='sgn_reconnect sgn_action'>connect</a> again. \n" +
                          "If error persists, you may try to manually " +
                          "<a href='https://accounts.google.com/b/" + getCurrentGoogleAccountId() + 
                          "/IssuedAuthSubTokens'>revoke</a> previous tokens first.");

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
            deleteMessage(messageId);
          }

          sendBackgroundMessage(request);
      }
    });
  });


  $(".sgn_current_connection").attr("href", getSearchNoteURL());
  $(".sgn_search").attr("href", getSearchNoteURL());
  $(".sgn_add_calendar").attr("href", getAddCalendarURL());
  
  //set up color picker
  $(".sgn_color_picker_value").simpleColor({columns:4, 
                                      cellWidth: 30,
                                      cellHeight: 30,
                                      cellMargin: 5,
                                      colors: [
                                          'D8EAFF', 'C7F6F5', 'FFFF99',
                                          'ACFDC1', 'E1E1E1', 'FED0C4', 'DAD3FE', 'F1CDEF'
                                      ],
                                      //colors: [
                                       // 'C8FBFE', 'CBFEF1', 'D6FFD1', 'E8FFC1', 'FAFDBB',
                                        //'FFEDC1', 'FFE0C7', 'FFD9D0', 'D7D6FE', 'F1CDFE'
                                       //],
                                      //colors : [
                                        //'34C8D0', '1ED6A8', '52C843', '87C31F', 'BEC42A',
                                        //'D39C16', 'D47325', 'D65234', '5C58E6', 'BD4CE7'
										//									],
                                 onSelect: function(hex, element){
                                   setCurrentBackgroundColor('#' + hex); //set color of text area

                                   //immediate post the note again
                                   postNote(email, messageId);
                                 } 
                              });


  $(".sgn_color_picker_button").click(function(e){
		  if(e.target != this){
				return;
			}

//$(this).parents(".sgn_color_picker").find(".simpleColorDisplay").click();
      e.stopPropagation();

      var picker = $(this).parents(".sgn_color_picker");
      var container = picker.find(".simpleColorContainer");
      var display = picker.find(".simpleColorDisplay");
      var colorChooser = picker.find(".simpleColorChooser");
      var input = picker.find(".sgn_color_picker_value");

      display.trigger('click', {input:input, display: display, container: container });
      container.find('.simpleColorChooser').css("margin-left", "-85px");	//align back
  });

  //nothing to show now
  //sendBackgroundMessage({action:"update_debug_content_info", debugInfo: ""});

  //load initial message
  debugLog("Start to initailize");
  sendBackgroundMessage({action:"initialize", email: email, 
                         messageId: messageId, title: gCurrentEmailSubject });

  updateUIByPreferences();
  //updateNoteByPreference();
};

var revokeSummaryNote = function(messageId){
  var emailId = messageId;

  //remove the note in cache, so the new notes would be collected next time
  var trNode = $("*[sgn_email_id='" + emailId + "']");


  if(trNode.is(".apv"))  //vertical split
      trNode.next().next().find(".sgn").remove();
  else
      trNode.find(".sgn").remove();

  debugLog("@447", emailId);
  debugLog("Requesting force reload");

  sendEventMessage("SGN_PAGE_force_reload");  //no effect to the page script now
};

var updateNotesOnSummary = function(userEmail, pulledNoteList){
  var addAbstractNode = function(mailNode, abstractNode){
    var hook;
    if(SGNC.isInbox()){
      hook = $(mailNode).find("div.bg");
    }
    else{
      hook = $(mailNode).find(".xT .y6");

      if(!hook.length){ //vertical split view
        hook = $(mailNode).next().next().find(".apB .apu");
      }

    }

    if(!hook.find(".sgn").length)
      hook.prepend(abstractNode);
  };

  var hasMarked = function(mailNode){
    return mailNode.find(".sgn").length > 0;
  };

  var markAbstract = function(mailNode, note, emailKey){
    var abstractNode;

    if(note && note.description && note.description != gSgnEmtpy){
      if(SGNC.isInbox()){
        abstractNode = $('<span class="sgn sgn_inbox">' +
                            '<span class="" title="' + htmlEscape(note.description) + '" style="">' + 
                            htmlEscape(note.short_description) + '</span></span>' );
      }
      else{
        abstractNode = $('<div class="ar as bg sgn">' +
                            '<div class="at" title="' + htmlEscape(note.description) + 
                            '" style="background-color: #ddd; border-color: #ddd;">' + 
                            '<div class="au" style="border-color:#ddd"><div class="av" style="color: #666">' + 
                            htmlEscape(note.short_description) + '</div></div>' + 
                       '</div></div>');
      }


      var backgroundColor = gAbstractBackgroundColor;
      var customNoteColor = getNoteProperty(note.properties, 'sgn-background-color');
      if(customNoteColor)
        backgroundColor = customNoteColor;

      if(SGNC.isInbox()){
        abstractNode.css("display", "inline-block")
                                       .css("margin-right", "2px")
                                       .css("background-color", backgroundColor)
                                       .css("border-color", backgroundColor)
                                       .css("color", gAbstractFontColor);
        if(gAbstractFontSize != "default")
          abstractNode.css("font-size", gAbstractFontSize + "pt");
      }
      else{
        abstractNode.find(".at").css("background-color", backgroundColor)
                                .css("border-color", backgroundColor);
        abstractNode.find(".au").css("border-color", backgroundColor);
        abstractNode.find(".av").css("color", gAbstractFontColor);
        if(gAbstractFontSize != "default")
          abstractNode.find(".av").css("font-size", gAbstractFontSize + "pt");
      }
    }
    else {
      abstractNode = $('<div style="display:none" class="sgn"></div>');
    }

    addAbstractNode(mailNode, abstractNode);
  };

  if(pulledNoteList && pulledNoteList.length){
    debugLog("updated summary from pulled note, total count:", 
             pulledNoteList.length);

    $.each(pulledNoteList, function(index, item){
      gEmailIdNoteDict[item.id] = {"description": item.description, 
                                   "short_description": item.short_description,
                                   "properties": item.properties};
    });
  }

  //loop for each email tr
  $("*[sgn_email_id]").each(function(){
    var emailId = $(this).attr("sgn_email_id");
    var emailNote = gEmailIdNoteDict[emailId];

    if(emailNote && emailNote.description && $(this).find(".sgn").css("display") == "none"){
      $(this).find(".sgn").remove();  //remove the element, so it would be filled later
      $(this).removeAttr("sgn_email_id");
    }


    if(!hasMarked($(this))){
      markAbstract($(this), emailNote, emailId);
    }

  });
};

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
    updateNotesOnSummary(userEmail, []);
  }
};

var setupCalendarInfo = function(email, messageId, subject){
 // var email = e.detail.email;
 // var messageId = e.detail.messageId;

  if(!isAlphaNumeric(messageId)){
    debugLog("invalid message ID (setup email info): " + messageId);
    return;
  }

  if(!isValidEmail(email)){
    debugLog("invalid email (setup email info): " + email);
    return;
  }

  if(messageId == "PREVIEW"){
    return;
  }

    //if(gCurrentMessageId.length > 0 && gCurrentMessageId.length < 5 &&
         //messageId.length > 5){  //for first time message loading after login, inside split view
      //sendBackgroundMessage({action:"initialize", email: email, messageId: messageId, title: e.detail.subject });
    //}

    //for add to calendar use
  gCurrentEmailSubject = subject;
  gCurrentMessageId = messageId;
};

var setupListeners = function(){
  /* Event listener for page */
  document.addEventListener('SGN_setup_note_editor', function(e) {
    var email = e.detail.email;
    var messageId = e.detail.messageId;
    var message = e.detail.message;

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
    //if background script died, exception raise from here
    sendBackgroundMessage({action:"heart_beat_request", email:e.detail.email});    
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

  document.addEventListener('send_preference', function(e) {
      var preferenceType = e.detail.preferenceType;
      var preferenceValue = e.detail.preferenceValue;
      sendBackgroundMessage({action: "send_preference",
	  preferenceType: preferenceType, preferenceValue: preferenceValue});
  });

  document.addEventListener('reset_preferences', function(e){
      sendBackgroundMessage({action: "reset_preferences"});
  });

  document.addEventListener('delete', function(e){
      var email = e.detail.email;
      var messageId = e.detail.messageId;
      deleteMessage(messageId);
      sendBackgroundMessage({action: 'delete', messageId: messageId,
        email: email, gdriveNoteId:gCurrentGDriveNoteId});
  });
  /* -- end -- */

  /* handle events from background script */
  setupBackgroundEventsListener(function(request){
    debugLog("Handle request", request);
    var preferences = {};
    switch(request.action){
      case "disable_edit":
        disableEdit();
          break;
      case "enable_edit":
          enableEdit();
          showLogoutPrompt(request.gdriveEmail);
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
          var displayContent = request.content;
          var properties = request.properties;
          var warningMessage = SGNC.offlineMessage;
          var customNoteColor = getNoteProperty(properties, 'sgn-background-color');

          gPreviousContent = request.content;

          if(displayContent.indexOf(warningMessage) === 0){
            displayContent = displayContent.substring(warningMessage.length); //truncate the warning message part
          }
          SGNC.getCurrentInput().val(displayContent);
          //showLogoutPrompt(request.email);
          if(customNoteColor){
            setCurrentBackgroundColor(customNoteColor);

          }

        }

        updateUIByPreferences();
        break;

      case "update_history":
        preferences = request.preferences;
        if(SGNC.isInbox())  //no history for inbox
          break;

        if(request.title == gCurrentEmailSubject){
          var history = request.data;
          //alert(JSON.stringify(request.data));
          $(".sgn_history").remove(); //hide all previous history
          //var historyInjectionNode = $(".nH.adC:visible");
          var historyInjectionNode = SGNC.getSidebarNode();
          var historyNode = $("<div class='sgn_history'><div class='sgn_history_header'><b>SGN History</b>" +
                                  "<a class='sgn_show_all'><img title='Show All' src='" + SGNC.getIconBaseUrl() + 
                                  "/chat.24.png'></a></div></div>");
          historyInjectionNode.append(historyNode);

          for(var i=0; i<history.length; i++){
            var note = history[i];
            var noteDate = new Date(note.createdDate);


            historyNode.append("<div class='sgn_history_note'>" +
                                      "<a target='_blank' href='" + getHistoryNoteURL(note.id) + "'>"  + 
                                      noteDate.toString().substring(0, 24) + "</a><br/><br/>" + 
                                      note.description + "</div>");

            historyNode.find(".sgn_history_note").css("background-color", preferences["backgroundColor"])
                                                 .css("color", preferences["fontColor"]);

            if(i >= 20) //show a max of 20 note history
              break;
          }

          var fullHistoryNode = historyNode.clone();
          fullHistoryNode.find('.sgn_history_header').remove();

          historyInjectionNode.append(fullHistoryNode);
          fullHistoryNode.popup();

          historyNode.find('.sgn_show_all').click(function(event){
              fullHistoryNode.popup('show');
          });

        }

        updateUIByPreferences();
        break;
      case "update_gdrive_note_info":
        debugLog("Update google drive note info", 
                      request.gdriveFolderId, request.gdriveFolderId);
        gCurrentGDriveFolderId = request.gdriveFolderId;
        gCurrentGDriveNoteId = request.gdriveNoteId;

        //the search note URL depends on gCurrentGDriveFolderId
        $(".sgn_current_connection").attr("href", getSearchNoteURL());
        $(".sgn_search").attr("href", getSearchNoteURL());
        break;
      case "update_summary":
        debugLog("update summary from background call", request.email);
        var noteList = request.noteList;
        updateNotesOnSummary(request.email, noteList);
        updateUIByPreferences();
        break;
      case "revoke_summary_note":
        revokeSummaryNote(request.messageId);
        debugLog("Trying to revoke summary note", request);
        break;

      //case "update_preferences":    //not to be used
       // sendEventMessage('SGN_PAGE_update_preferences', preferences);  
        //gAbstractBackgroundColor = preferences["abstractBackgroundColor"];
        //gAbstractFontColor = preferences["abstractFontColor"];
        //gAbstractFontSize = preferences["abstractFontSize"];
        //break;

      case "heart_beat_response":
        preferences = request.preferences;
        gLastHeartBeat = Date.now();
        preferences["debugPageInfo"] = "";
        preferences["debugContentInfo"] = "";
        preferences["debugBackgroundInfo"] = "";

        preferenceNames = Object.keys(preferences).sort();
	var preferenceString = '';
        for (var index=0; index<preferenceNames.length; index++) {
          preferenceName = preferenceNames[index];
          preferenceString += preferences[preferenceName];
        }

        if(preferenceString != gLastPreferenceString){
          SimpleGmailNotes.preferences = preferences;
          gAbstractBackgroundColor = preferences["abstractBackgroundColor"];
          gAbstractFontColor = preferences["abstractFontColor"];
          gAbstractFontSize = preferences["abstractFontSize"];
          updateUIByPreferences();
          gLastPreferenceString = preferenceString;
        }

        sendEventMessage('SGN_PAGE_heart_beat_response', request.gdriveEmail);  

        break;
      case "alert_message":

        var messageNode = $("<div class='sgn_message'>");
        var message = request.message.replace(/\n/g, "<br/>");
        messageNode.html(message);
        messageNode.popup("show");
        break;
      default:
        debugLog("unknown background request", request);
        break;
    }
  });
};

var gDebugInfo = "";
var appendDebugInfo = function(message){
  if(gDebugInfo.indexOf(message) < 0){
    if(gDebugInfo)
      gDebugInfo += ", ";

    gDebugInfo += message ;
    sendBackgroundMessage({action:"update_debug_content_info", debugInfo: gDebugInfo});
  }
};


//use for page script set up
var contentLoadStarted = false;
var contentLoadDone = false;

var setupPage = function(){
    addScript('lib/jquery-3.1.0.min.js');
    addScript('common/gmail-sgn-page.js');
    addScript('common/gmail-sgn-dom.js');
    addScript('common/shared-common.js');
    addScript('page.js');
};


var fireContentLoadedEvent = function() {
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
};

$(document).ready(function(){
    SimpleGmailNotes.$ = $;

    appendDebugInfo("documentReady");

    //if(SGNC.isInbox())
     // sgnInbox.fireContentLoadedEvent();

    fireContentLoadedEvent();
});

debugLog("Finished content script (common)");
