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

var gCRMLoggedInChecked = false;
var gCRMLoggedIn = false;
var gClassicGmailConversation = false;
var gLastPullTimestamp = null;
var gNextPullTimestamp = null;
var gConsecutiveRequests = 0;
var gConsecutiveStartTime = 0;
var gSyncFutureNotesEnabled = false; 
var gGmailWatchEnabled = false;
var gLastCRMShareURL = null;
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

  if(gConsecutiveRequests >= 40){
    //penalty timeout for 60 seconds
    gNextPullTimestamp = timestamp + 60 * 1000; 

    var message = "40 consecutive network requests detected from Simple Gmail Notes, " +
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


  if(isRuntimeAlive()){
    SGNC.getBrowser().runtime.sendMessage(message, function(response){
      //debugLog("Message response", response);
    });
  }
  else{
    showOfflineNotice();
  }
};


//https://stackoverflow.com/questions/25840674/chrome-runtime-sendmessage-throws-exception-from-content-script-after-reloading
var isRuntimeAlive = function(){
  return SGNC.getBrowser().runtime && !!SGNC.getBrowser().runtime.getManifest();
};

var setupBackgroundEventsListener = function(callback) {
  SGNC.getBrowser().runtime.onMessage.addListener(
      function(request, sender, sendResponse) {
        callback(request);
        return true;
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

var gCurrentBackgroundColor = "";

var gAbstractBackgroundColor = "";
var gAbstractFontColor = "";
var gAbstractFontSize = "";

var gCurrentPreferences = {};

var gLastHeartBeat = Date.now();
var gSgnUserEmail = "";
var gCrmUserEmail = "";
var gLastPreferenceString = "";

var gSgnEmtpy = "<SGN_EMPTY>";
var gSgnDeleted = "<SGN_DELETED>";

var gSgnCrmDeleted = 'sgn-crm-has-deleted';
var gSuccessDeleted = false;

var gSearchContent = "";



/* -- end -- */


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

var debugLog = function(){
  if (SGNC.isDebug()) {
    console.log.apply(console, arguments);
  }
};

var isTinyMCEEditable = function(){
  var tinymceContenteditable = $('.sgn_container .mce-tinymce').find("iframe").
                contents().find("body").attr("contenteditable");
  if(tinymceContenteditable == "true"){
    return true;
  }
  return false;
};

var disableEdit = function(retryCount){
  if(retryCount === undefined)
    retryCount = settings.MAX_RETRY_COUNT;

  if(!retryCount)
    return; 

  if(isRichTextEditor()){
    if(!isTinyMCEEditable())
      return;
    sendEventMessage('SGN_tinyMCE_disable'); 
    
  }else{
    $(".sgn_input").prop("disabled", true).css("background-color", "");
    $(".sgn_input").val("");
    //clear up the cache
    gEmailIdNoteDict = {};

    //keep trying until it's visible
    if($(".sgn_input").is(":disabled") && !$(".sgn_padding").is(":visible"))
      return;
  }

  debugLog("retry disable edit");
  retryCount = retryCount - 1;
  if(retryCount > 0 )
    setTimeout(disableEdit, 100, retryCount);
  
};

var enableEdit = function(retryCount){
  if(retryCount === undefined)
    retryCount = settings.MAX_RETRY_COUNT;
    
  if(!retryCount)
    return;
  

  if(isRichTextEditor()){
    if(isTinyMCEEditable())
      return;
    sendEventMessage('SGN_tinyMCE_enable');
    
  }else{
    $(".sgn_input").prop("disabled", false);
    if(!$(".sgn_input").is(":disabled"))  //keep trying until it's visible
      return;
  }
  debugLog("retry enable edit");
  retryCount = retryCount - 1;
  if(retryCount > 0 )
    setTimeout(enableEdit, 100, retryCount);
  
};

var isCRMEnabled = function() {
  var preferences = SimpleGmailNotes.preferences;
  var enabled = (preferences && preferences["showCRMButton"] !== "false");

  return enabled;
};

var existsOpportunityListOpener = function() {
  var existed = $(".sgn_opportunity_list_opener").length > 0;
  return existed;
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

var setBackgroundColorWithPicker = function(backgroundColor){
  var input = SGNC.getCurrentInput();
  if(isRichTextEditor()){
    sendEventMessage('SGN_tinyMCE_set_backgroundColor', {backgroundColor: backgroundColor});
    $(".mce-container").parents(".sgn_container").find(".sgn_color_picker_value").val(backgroundColor);
  }else{
    input.css('background-color', backgroundColor);
    input.parents(".sgn_container").find(".sgn_color_picker_value").val(backgroundColor);
  }

  gCurrentBackgroundColor = backgroundColor;
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
  var searchUrl = "https://drive.google.com/drive/folders/" + gCurrentGDriveFolderId;

  return searchUrl;
};

var getDisplayContent = function(content){
  var warningMessage = SGNC.offlineMessage;
  displayContent = content;

  if(displayContent.indexOf(warningMessage) === 0){
    displayContent = displayContent.substring(warningMessage.length); //truncate the warning message part
  }

  if(displayContent == gSgnEmtpy)
    displayContent = "";

  return displayContent;
};

//I use http instead of https here, because otherwise a new window will not be popped up
//in most cases, google would redirect http to https
var getHistoryNoteURL = function(messageId){
  var userId = getCurrentGoogleAccountId();
  var url = "http://mail.google.com/mail/u/" + userId + "/#all/" + messageId;
  return url;
};


var getAddCalendarURL = function(messageId){
  var userId = getCurrentGoogleAccountId();
  var emailUrl = getHistoryNoteURL(messageId);
  var details = emailUrl + "\n-----\n" + $(".sgn_input").val();
  var title = gCurrentEmailSubject;

  if(title.indexOf("Re:") < 0)
    title = "Re: " + title;

  var addCalendarURL = "https://calendar.google.com/calendar/b/" + userId + 
                            "/render?action=TEMPLATE" +
                            "&text=" + encodeURIComponent(title) + 
                            "&details=" + encodeURIComponent(details);

  return addCalendarURL;
};

var setPropertiesPublic = function(properties){
  var publicPropertyArray = [];
  for(var i=0; i<properties.length; i++){
    properties[i]["visibility"] = "PUBLIC";
    publicPropertyArray.push(properties[i]);
  }
  return publicPropertyArray;
};

var batchShareNotes = function(email, noteList){
  var commonProperties = [{"key" : "sgn-author", "value" : email}];
  var shareNotes = [];

  for(var i=0; i<noteList.length; i++){
    var properties = [];
    var shareNote = {};
    shareNote["noteId"] = noteList[i]["sgn-gdrive-note-id"];
    properties.push({"key" : "sgn-message-id", "value" : noteList[i]["message_id"]});
    properties.push({"key": "sgn-shared", "value": noteList[i]["sgn-shared"]});
    properties.push({"key": "sgn-opp-name", "value": noteList[i]["sgn-opp-name"]});
    properties.push({"key": "sgn-opp-id", "value": noteList[i]["sgn-opp-id"]});
    properties.push({"key": "sgn-opp-url", "value": noteList[i]["sgn-opp-url"]});
    properties.push({"key": "sgn-note-timestamp", "value": noteList[i]["sgn-note-timestamp"]});
    properties = setPropertiesPublic(properties);
    shareNote["metadata"] = {properties: properties};
    shareNotes.push(shareNote);
  }

  sendBackgroundMessage({action:"batch_share_crm", email: email,
                         shareNotes: shareNotes,
                         gdriveFolderId: gCurrentGDriveFolderId});    

};

var postNote = function(email, messageId, crmProp){

  //it's a message mis-match, not a callback from silent push
  if(messageId != gCurrentMessageId && !crmProp)
    return;
  var noteId, folderId, emailSubject, content;
  var container = SGNC.getContainer();

  var properties = [{"key" : "sgn-author", "value" : email},
                    {"key" : "sgn-message-id", "value" : messageId}];

  if(crmProp){
    folderId = crmProp["sgn-gdrive-folder-id"];
    noteId = crmProp["sgn-gdrive-note-id"];
    emailSubject = crmProp["sgn-subject"];
    content = crmProp["sgn-content"];

    properties.push({"key" : "sgn-background-color", "value" : crmProp["sgn-background-color"]});
    properties.push({"key": "sgn-shared", "value": crmProp["sgn-shared"]});
    properties.push({"key": "sgn-opp-name", "value": crmProp["sgn-opp-name"]});
    properties.push({"key": "sgn-opp-id", "value": crmProp["sgn-opp-id"]});
    properties.push({"key": "sgn-opp-url", "value": crmProp["sgn-opp-url"]});
    properties.push({"key": "sgn-note-timestamp", "value": crmProp["sgn-note-timestamp"]});
  }
  else {  // messageId == gCurrentMessageId
    folderId = gCurrentGDriveFolderId;
    noteId = gCurrentGDriveNoteId;
    emailSubject = gCurrentEmailSubject;
    content = SGNC.getCurrentContent();

    var backgroundColor = SGNC.getCurrentBackgroundColor();
    //a new timestamp is not provided
    var currentTimeStamp = container.attr("data-note-timestamp");

    if(!currentTimeStamp)
      currentTimeStamp = "";

    var versionNumber = 0;
    var timestampBase = currentTimeStamp;
    if(currentTimeStamp && currentTimeStamp.includes("-")){
      versionNumber = parseInt(currentTimeStamp.split("-")[1]);
      timestampBase = currentTimeStamp.split("-")[0];
    }
    versionNumber += 1;
    var newTimestamp = timestampBase + "-" + String(versionNumber);
    container.attr("data-note-timestamp", newTimestamp);
    //set up the default crm properties using the container node
    properties.push({"key": "sgn-note-timestamp", 
                     "value": container.attr("data-note-timestamp")});
    properties.push({"key": "sgn-opp-id",
                     "value": container.attr("data-sgn-opp-id")});
    properties.push({"key": "sgn-opp-name",
                     "value": container.attr("data-sgn-opp-name")});
    properties.push({"key": "sgn-opp-url",
                     "value": container.attr("data-sgn-opp-url")});
    properties.push({"key" : "sgn-background-color",
                     "value" : backgroundColor});

    properties.push({"key": gSgnCrmDeleted, "value": false});


    var sgnLastMessageId = sgnGmailDom.getLastMessageId();
    properties.push({"key" : "sgn-last-message-id", "value" : sgnLastMessageId});

    var threadId = sgnGmailDom.getCurrentThreadId();
    properties.push({"key": "sgn-thread-id", "value": threadId});
  }

  if (!folderId)
    folderId = gCurrentGDriveFolderId;

  properties = setPropertiesPublic(properties);
  //update the note
  sendBackgroundMessage({action:"post_note", 
                         email:email, 
                         messageId:messageId, 
                         emailTitleSuffix: emailSubject,
                         gdriveNoteId:noteId, 
                         gdriveFolderId:folderId,
                         content:content,
                         properties:properties});


  gPreviousContent = content;

  //always push the note to CRM (except from CRM succcess)
  //console.log("@373", properties);
  //if(container.hasClass('sgn-shared') && !skipCRMShare){
  //  shareToCRM(email, messageId, true);
  //}

};


var deleteMessage = function(messageId){    	
  $(".sgn_input:visible").val('');
  if(isRichTextEditor()){
    sendEventMessage('SGN_tinyMCE_delete_message');
  }
  gPreviousContent = '';
  if(!gCurrentGDriveNoteId){
  	return;
  }
  delete gEmailIdNoteDict[messageId];
  gCurrentGDriveNoteId = '';

};

var appendTemplateContent = function(email, messageId) {
  var preferences = SimpleGmailNotes.preferences;
  var note = SGNC.getCurrentContent() + preferences['templateContent'];
  $(".sgn_input:visible").val(note);
  if(isRichTextEditor()){
    sendEventMessage('SGN_tinyMCE_update_note', {content: note});
    SGNC.getCurrentInput().val(note);
  }
  delete gEmailIdNoteDict[messageId];
  postNote(email, messageId);
};

var updateGmailNotePosition = function(injectionNode, notePosition){
  var preferences = SimpleGmailNotes.preferences;
  //var logo = injectionNode.find(".sgn_bart_logo");
  var noticeNode = injectionNode.find(".sgn_notice");

  if(injectionNode.attr('data-note-position') === notePosition) {
    return;
  }

  if(notePosition == "side-top" || notePosition == "side-bottom"){
    //injectionNode.append(logo);

    //all the sidebart display logic are now done in css
    //
    //$(".sgn_prompt_logout").css("height", "30px");
    //var showConnectionPrompt = (preferences["showConnectionPrompt"] !== "false");
    //if(showConnectionPrompt){
    //  $(".mce-tinymce").css("margin-top", "20px");
    //}

    //logo.after(noticeNode);
    //var noteTimeStampDom = SimpleGmailNotes.getNoteTimeStampDom();
    //noteTimeStampDom.after(logo);
    //if($(".sgn_clear_right").length <= 0){
     // $("<div class='sgn_clear_right'></div>").insertAfter(noteTimeStampDom);
    //}
    //
  }
  else{
    if($(".sgn_clear_right").length > 0){
      $(".sgn_clear_right").remove();
    }
    //injectionNode.children('.sgn_bart_logo').remove();
    //injectionNode.children('.sgn_prompt_logout').prepend(logo);
    injectionNode.children('.sgn_prompt_logout').append(noticeNode);

  }

  if(isRichTextEditor() && injectionNode.is(":visible"))
    //for richtext editor, cannot prepend the node again, otherwise the iframe 
    //inside will have problem
    return;

  if(notePosition == "side-top" || notePosition == "side-bottom"){
    if(notePosition == "side-top"){
      SimpleGmailNotes.getSidebarNode().prepend(injectionNode);
    }else{
      SimpleGmailNotes.getSidebarNode().append(injectionNode);
    }
    injectionNode.css("width", "300px");
    injectionNode.parent().find(".y4").css("display", "none");


  }else{

    if(notePosition == "bottom"){
      $(".nH.aHU:visible").append(injectionNode);
    }else{
      $(".nH.if:visible, .nH.aBy:visible").prepend(injectionNode);  //hopefully this one is stable
    }
    injectionNode.css("width", "auto");
    //$(".sgn_prompt_logout").css("height", "auto");
    
  }

  injectionNode.attr("data-note-position", notePosition);

};

var isEnableFlexibleHeight = function(){
  var preferences = SimpleGmailNotes.preferences;
  if(!preferences)
    return false;

  var enableFlexibleHeight = (preferences["enableFlexibleHeight"] !== "false");
  return enableFlexibleHeight;

};

var isRichTextEditor = function(){
  var preferences = SimpleGmailNotes.preferences;
  if(!preferences)
    return false;

  var enableRichtextEditor = (preferences["enableRichtextEditor"] === "true");

  return enableRichtextEditor;
};


var isEnableNoDisturbMode = function(){
  var preferences = SimpleGmailNotes.preferences;
  var enableNoDisturbMode = (preferences["enableNoDisturbMode"] !== "false");

  return enableNoDisturbMode;
};

var getTinymceUrl = function(){
  var baseUrl = SGNC.getBrowser().extension.getURL('lib/tinymce');
  return baseUrl;
};

var setupOfflineNotice = function(){
  if($(".sgn_inactive_warning") && $(".sgn_inactive_warning").length > 0){
    return;
  }

  var warningMessage = SimpleGmailNotes.offlineMessage;
  var warningIconUrl = SimpleGmailNotes.getIconBaseUrl() + "/warning.3x.png";
  var warningNode = $("<div class='sgn_inactive_warning'><div class='sgn_offline_message'>" + 
                        "<img src='"+ warningIconUrl +"'>" +
                        warningMessage + "</div></div>");
  var warningNodeCount = $(".sgn_inactive_warning:visible");

  if(SimpleGmailNotes.isInbox()){
    var containerNode = $(".sgn_container:visible");
    if(containerNode.find("> .sgn_inactive_warning").length === 0){
      containerNode.prepend(warningNode);
    }

    var pageNode = $(".cM.bz");
    if(pageNode.find("> .sgn_inactive_warning").length === 0){
      pageNode.prepend(warningNode.clone());
    }
  }
  else{  //old and new gmail
    var hookNode = $("#\\:5");
    if(hookNode.find("> .sgn_inactive_warning").length === 0){
      hookNode.append(warningNode);
    }
  }
};


var getNoteHeight = function(){
  var preferences = SimpleGmailNotes.preferences;
  if(!preferences)  //ui not ready
    return;

  var noteHeight = parseInt(preferences["noteHeight"]);

  if(isEnableFlexibleHeight() && !isRichTextEditor()){
    var oldNoteHeight = noteHeight;
    noteHeight = 1;
    if($(".sgn_input") && $(".sgn_input").val()){
      var line = $(".sgn_input").val().split("\n");
      var lineBreaks = line.length;
      noteHeight = lineBreaks;
      if(lineBreaks > oldNoteHeight){
        noteHeight = oldNoteHeight;
      }
    }
  }

  if(noteHeight && SimpleGmailNotes.isInbox() && noteHeight > 4)
    noteHeight = 4;

  return noteHeight;
};

var updateUIByPreferences = function(){
  var preferences = SimpleGmailNotes.preferences;
  if(!preferences)  //ui not ready
    return;
  
  //the account is disabled
  var currentDisableList = JSON.parse(preferences["disabledAccounts"]);
  if(currentDisableList.indexOf(gSgnUserEmail) > 0){
    return;
  }

  
  var fontColor = preferences["fontColor"];
  if(fontColor)
    $(".sgn_input").css("color", htmlEscape(fontColor));

  /* 
  var backgroundColor = preferences["backgroundColor"];
  if(backgroundColor){
    $(".sgn_history_note").css("background-color", backgroundColor);
  }*/

  var fontSize = preferences["fontSize"];
  if(fontSize != "default"){
    $(".sgn_input").css("font-size", fontSize + "pt");
  }
  fontSize = parseInt($(".sgn_input").css("font-size"));

  var noteHeight = getNoteHeight();

  $(".sgn_input").css("height", noteHeight * fontSize * 1.2 + 6 + "px");
  var richTextNoteHeight = parseInt($(".sgn_input").css("height"));

  var firstVisible = $(".sgn_container:visible").first();
  $(".sgn_container:visible:not(:first)").hide();
  //avoid duplicates
  //$(".sgn_container").hide();
  //firstVisible.show();

  var notePosition = preferences["notePosition"];
  var baseUrl = getTinymceUrl();
  if(isRichTextEditor() && SimpleGmailNotes.getCurrentBackgroundColor()){
    backgroundColor = SimpleGmailNotes.getCurrentBackgroundColor();
  }
  var tinymceProperties = {
    baseUrl: baseUrl, 
    fontSize: fontSize,
    fontColor: fontColor,
    //backgroundColor: backgroundColor,
    height: richTextNoteHeight,
    cssUrl: SimpleGmailNotes.getCssBaseUrl() + '/style.css'
  };

  firstVisible.removeClass('sgn_position_top');
  firstVisible.removeClass('sgn_position_bottom');
  firstVisible.removeClass('sgn_position_side-top');
  firstVisible.removeClass('sgn_position_side-bottom');

  /*
  var showNoteTimeStamp = (preferences["showNoteTimeStamp"] !== "false");

  if(showNoteTimeStamp && SimpleGmailNotes.getNoteTimeStampDom().length > 0 &&
          SimpleGmailNotes.getNoteTimeStampDom().hasClass("sgn_is_hidden")){
    SGNC.getNoteTimeStampDom().removeClass("sgn_is_hidden");
  }*/

  if(!SimpleGmailNotes.isInbox()){
    updateGmailNotePosition(firstVisible, notePosition);
    //reset class attribute with current 'position' class
    firstVisible.addClass('sgn_position_' + notePosition);
    if(notePosition === "side-top" || notePosition === "side-bottom"){ //for move mail-address to top 
      var sgn_current_connection = $(".sgn_current_connection");
      $(".sgn_current_connection").remove();
      $(".sgn_prompt_logout").prepend(sgn_current_connection);
    }
  }else{
    //var noteTimeStampDom = SimpleGmailNotes.getNoteTimeStampDom();
    //if($(".sgn_clear_right").length <= 0){
      //$("<div class='sgn_clear_right'></div>").insertAfter(noteTimeStampDom);
    //}
  }
  if(isRichTextEditor()){
    sendEventMessage('SGN_tinyMCE_init', tinymceProperties);
  }

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
    
  var showCRMButton = (preferences["showCRMButton"] !== "false");
  if(!showCRMButton){
    $(".sgn_share").hide();
    $(".sgn_shared").hide();
  }

  var showPrintingNote = (preferences["showPrintingNote"] !== "false");
  if(!showPrintingNote) {
    removePrintInfo(gSgnUserEmail);
    /*
    var emailNote = SGNC.getCurrentContent();
    var properties = {"font-size": fontSize + "pt", 
                      "isRichTextEditor": isRichTextEditor()};
    setPrintInfo(emailNote, properties);
    */
  }

  var showTemplateButton = (preferences["templateContent"] !== "");
  if(!showTemplateButton){
    $(".sgn_template").hide();
  }

  debugLog("@470", preferences);
};

function rgb2hex(rgb) {
    if(!rgb)
      return '#000';

    rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    function hex(x) {
        return ("0" + parseInt(x).toString(16)).slice(-2);
    }
    return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
}

var getCRMShareEmailData = function(email, messageId, hideEmailInfo) {
  //get note
  var emailNote = SGNC.getCurrentContent();
  var container = SGNC.getContainer();
  
  //do not upload the HTML
  emailNote = stripHtml(emailNote);

  //get the contacts
  var contactElements =  $('span.gD, span.hb span');
  if (SGNC.isInbox()) {
    contactElements = $('div.n6 div.fX[email], div.n6 span[email]');
  }
  var contacts = [];

  var fromAddress = "";
  if(!hideEmailInfo){ //do not send the contacts for the silent share (privacy concern)
    var contactEmailList = [];
    contactElements.each(function() {
      var contactEmail = $(this).attr('email');
      if (!contactEmailList.includes(contactEmail) &&
          email !== contactEmail) {
        var name = $(this).attr('name');
        if (SGNC.isInbox()) {
          name = $(this).text();
        }
        if(!name.includes(' '))
          name += ' ';

        contacts.push({
          isUser: (email === contactEmail),
          name: name,
          firstName: name.split(' ')[0],
          lastName: name.split(' ')[1],
          email: contactEmail
        });

      }

      contactEmailList.push(contactEmail);

      if($(this).parents(".qu").length){
        fromAddress = $(this).parents(".qu").first().text(); //this one will be overwritten by others
      }

    });
  }

  //get the thread id
  var threadId = "";
  var sgnLastMessageId = "";
  if(SGNC.isNewGmail()){
    sgnLastMessageId = sgnGmailDom.getLastMessageId();
    threadId = sgnGmailDom.getCurrentThreadId();
  }
  else if(SGNC.isInbox()){
    threadId = sgnGmailDom.getCurrentMessageId();
  }
  else {  //classic gmail
    if(gClassicGmailConversation){
      threadId = sgnGmailDom.getCurrentMessageId();
    }
    else{
      //for classic gmail UI & non conversation mode, 
      //it seems impossible to get thread id
    }
  }
  

  //get email related stuff
  var subject = "";
  var excerpt = "";
  var fontColor = "";
  var backgroundColor = "";

  if(!hideEmailInfo){ 
    subject = gCurrentEmailSubject;

    //get the email excerpt, it would be available only if 
    var trNode = $("*[sgn_email_id='" + messageId + "']");
    if(trNode.length){
      excerpt = trNode.find("span.y2").text();
    }
  }

  var editorNode = $(".sgn_container:visible textarea");
  //var backgroundColor = rgb2hex(editorNode.css("background-color"));
  backgroundColor = gCurrentBackgroundColor;
  fontColor = rgb2hex(editorNode.css("color"));

  var hideSuccuess = "";
  if(SimpleGmailNotes.preferences["showCRMSuccessPage"] === "false")
    hideSuccuess = "1";

  var opportunityId = container.attr("data-sgn-opp-id");
  var noteTimestamp = container.attr("data-note-timestamp");
  var isConversation = sgnGmailDom.isConversationMode();
  //var autoSync = container.hasClass("sgn-auto-sync");

  //wrap up the data
  var data = {
    contacts: contacts.slice(0, 10),
    email: {
      id: messageId,
      email_address: email,
      note: emailNote,
      subject: subject,
      thread_id: threadId,
      latest_message_id: sgnLastMessageId,
      excerpt: excerpt,
      font_color: fontColor,
      background_color: backgroundColor,
      opportunity_id: opportunityId,
      //auto_sync: autoSync,
      note_timestamp: noteTimestamp,
      gdrive_note_id: gCurrentGDriveNoteId,
      gdrive_folder_id: gCurrentGDriveFolderId,
      from_address: fromAddress,
      is_conversation: isConversation
    },
    hide_success_page: hideSuccuess
  };


  //console.log("@633", data);
  return data;
};

var getStrWindowFeatures = function(newWindowWidth, newWindowHeight) {
  var dualScreenLeft = window.screenLeft !== undefined ? window.screenLeft : window.screenX;
  var dualScreenTop = window.screenTop !== undefined ? window.screenTop : window.screenY;
  var width = window.innerWidth;
  var height = window.innerHeight;
  var newWindowTop = (height - newWindowHeight) / 2 + dualScreenTop;
  var newWindowLeft = (width - newWindowWidth) / 2 + dualScreenLeft;
  var strWindowFeatures = ('innerHeight=' + newWindowHeight +
                           ', innerWidth=' + newWindowWidth +
                           ', top=' + newWindowTop + ', left=' + newWindowLeft);
  return strWindowFeatures;
};

var getCrmUser = function(email) {
  var crmUser = gCrmUserEmail;
  if (!crmUser)
    crmUser = email;
  return crmUser;
};

var openCRMSharePopup = function(url){
  sendEventMessage(
    'SGN_PAGE_open_popup',
    { url: url,
      windowName: 'sgn-share-popup',
      strWindowFeatures: getStrWindowFeatures(1000, 700)
    }
  );
};

var shareToCRM = function(email, messageId, isSilentShare, hideEmailInfo){
  //never silently share crm user not login
  if (isSilentShare && !gCRMLoggedIn)
    return;

  if(!messageId)
    return;

  var container = SGNC.getContainer();
  //do not do silent share if the share function is disabled
  if(isSilentShare && !container.find(".sgn_share:visible"))
    return;

  var emailData = getCRMShareEmailData(email, messageId, hideEmailInfo);
  if(isSilentShare)
    emailData['action'] = 'silent-share';
  else{
    emailData['action'] = 'click-share';
    emailData['show_prefs'] = '1';
    // For new login
    emailData['locli'] = 'crx';
  }

  
  var url = getCRMShareUrl(
    getCrmUser(email), emailData);

  if(isSilentShare){
    $.ajax({
      url: url,
      dataType: "jsonp",
      jsonpCallback: "SimpleGmailNotes.silentShareCallBack",
      success: function(response){
        // console.log("@389", response);
      },
      error: function(response){
        // even for timeout error, it would not return in this closure
        //console.log("Failed to connect to server");
      }
    });
  }
  else{
    gLastCRMShareURL = url;
    //it has to be done by page script
    openCRMSharePopup(url);
  }

};

var createTableLoading = function(){
  var modalLoadingUrl = SGNC.getIconBaseUrl() + '/modal-loading.gif';
  var modalLoadingImg = $('<img>', {
    src: modalLoadingUrl,
    alt: 'modal loading'
  });
  var modalLoading = $('<div></div>');
  modalLoading.addClass('sgn-modal-loading').append(modalLoadingImg);
  $('.sgn_show_table table').append(modalLoading);

};

var isSameContent = function(content1, content2){
  return getDisplayContent(content1) == getDisplayContent(content2);
};

var collectNoteProperties = function() {
  var properties = {};
  var collectProperties = ['font-size'];
  for (var i = 0; i<collectProperties.length; i++) {
    properties[collectProperties[i]] = $("textarea.sgn_input").css(collectProperties[i]);
  }

  return properties;
};

var getLogoNode = function(className){
   var imageNode = $("<img title='Powered By Bart Solutions'/>").attr("src", 
                   SGNC.getLogoImageSrc("ed"));
   return $("<a target='_blank'/>").attr("class",  className
          ).attr('href', SGNC.getOfficalSiteUrl("ed")).append(imageNode);
};

var setupNoteEditor = function(email, messageId){
  SGNC.appendLog("enterSetupNote");
  debugLog("Start to set up notes");
  debugLog("Email", email);

  var injectionNode = $("<div class='sgn_container'></div>");

  /*
  var moreButton = $(".hA").parents("div[role=button]:first");
  moreButton.css("background", "gray");
  moreButton.on('click', function() {
    console.log("@click");
  });
  bindPrintButtons();
  */
  
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
  }else{    //this works for both old and new gmail UI
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
  if(!$(".sgn_container:visible").length){
    SGNC.appendLog("Injection node failed to be found");
    return;
  }

  SGNC.appendLog("startSetupNote");

  //var injectionNode = SGNC.getContainer();
  //try to get the cached message
  var cachedMessage = gEmailIdNoteDict[messageId];
  var note = "";
  if(cachedMessage && cachedMessage.description)
    note = cachedMessage.description;
  
  var textAreaNode = $("<textarea></textarea>", {
    "class": "sgn_input",
    "text": note,
    "disabled":"disabled"
  }).on("blur paste", function(event){
    //var currentInput = $(".sgn_input:visible");
    //var emailSubject = gCurrentEmailSubject;
    //var noteId = gCurrentGDriveNoteId;
    //var folderId = gCurrentGDriveFolderId;

    var isDisabled = SGNC.getCurrentInput().prop('disabled');
    if(isRichTextEditor()){
      isDisabled = !isTinyMCEEditable();
    }

    var content = SGNC.getCurrentContent();
    var printInfoProperties = getPrintInfoProperties();
    setPrintInfo(gSgnUserEmail, content, printInfoProperties);

    //var content = currentInput.val();
    if(!isDisabled && !isSameContent(gPreviousContent, SGNC.getCurrentContent())){
      delete gEmailIdNoteDict[messageId];//delete the prevoius note
      //set up the share properties
      var skipShare = false;

      showNotice("Saving note ...", "note_saving");
      postNote(email, messageId);

      //do the auto push, only if used enabled auto sync or sync future
      if(!$(event.relatedTarget).is(".sgn_share.sgn_action") &&
      (gGmailWatchEnabled || gSyncFutureNotesEnabled))  
        shareToCRM(email, messageId, true);
    }

    return true;
  }).on("keyup", function(e){
    var fontSize = parseInt($(".sgn_input").css("font-size"));
    var lines = getNoteHeight();
    if(!isRichTextEditor() && isEnableFlexibleHeight()){
      $(this).css("height", (lines) * fontSize * 1.2 + 6 + "px");
    }
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
            "<a class='sgn_action sgn_current_connection'>SGN: " +
            "<span class='sgn_user'></span></a> " +
            "<a class='sgn_logout sgn_action sgn_button' >" + 
            "<img title='Log Out (" + email + ")' src='" + 
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
            "<a class='sgn_action sgn_modal_list_notes sgn_button' target='_blank'>" +
            "<img title='Search' src='" + 
              SGNC.getIconBaseUrl() + "/search.24.png'></a> " +
            "<a class='sgn_action sgn_color_picker sgn_button'>" +
            "<input type='hidden' class='sgn_color_picker_value' value='" + backgroundColor + "'>" +
            "<img title='Note Color' class='sgn_color_picker_button' src='" + 
              SGNC.getIconBaseUrl() + "/color-picker.24.png'></a> " +
            "<a class='sgn_action sgn_template sgn_button' style='margin-left: 10px;'>" +
            "<img title='Template' style='width:20.5px; height:23px;' src='" +
              SGNC.getIconBaseUrl() + "/template.png'></a> " +
            "<a class='sgn_share sgn_action sgn_button' >" +
            "<img class='sgn_share_img' title='Sync to Mobile' src='" +
             SGNC.getIconBaseUrl() + "/share.24.png'></a>" +
            "<a class='sgn_open_opportunity sgn_action' >" +
            "<div class='sgn_opp_name'></div></a>" +
            "<div class='sgn_notice sgn_cutom'></div>" +
            "")
    .hide();

  searchLogoutPrompt.prepend(getLogoNode("sgn_bart_logo_top"));

  if(gCrmUserEmail){
    searchLogoutPrompt.find(".sgn_share_img").attr("title", "Share to CRM (" + gCrmUserEmail + ")");
  }

  var loginPrompt = $("<div class='sgn_prompt_login'/></div>" )
    .html("Please <a class='sgn_login sgn_action'>login</a> " +
            "your Google Drive to start using Simple Gmail Notes" + 
            " <a class='sgn_disable_account sgn_action'>Disable extension for this Gmail Account</a>" )
    .hide();
  var emptyPrompt = $("<div class='sgn_padding'>&nbsp;<div>");
  var revokeErrorPrompt = $("<div class='sgn_error sgn_revoke'><div>")
                      .html("Error found with the existing token. " +
                          "Please try to <a class='sgn_reconnect sgn_action'>connect</a> again. \n" +
                          "If error persists, you may try to manually " +
                          "<a href='https://accounts.google.com/b/" + getCurrentGoogleAccountId() + 
                          "/IssuedAuthSubTokens'>revoke</a> previous tokens first.");
  var revokeCRMErrorPrompt = $("<div class='sgn_error sgn_revoke_crm'><div>")
                      .html("Error found with the CRM token. " +
                          "Please click the share button again to re-login Simple Mobile CRM. \n" +
                          "If error persists, you may try to manually " +
                          "<a href='https://accounts.google.com/b/" + getCurrentGoogleAccountId() + 
                          "/IssuedAuthSubTokens'>revoke</a> previous CRM tokens first.");


  var userErrorPrompt = $("<div class='sgn_error sgn_user'></div>")
                            .html("Failed to get Google Driver User");

  var loginErrorPrompt = $("<div class='sgn_error sgn_login'></div>")
                            .html("Failed to login Google Drive");

  var customErrorPrompt = $("<div class='sgn_error sgn_custom'></div>");


  var crmErrorPrompt = $("<div class='sgn_error sgn_crm'></div>");

  var noteTimeStamp = $("<div class='sgn_note_timestamp sgn_is_hidden'>" + 
                        "<img alt='note timestamp' src='"+ SGNC.getIconBaseUrl()+"/note-timestamp.png' />"+
                        "<span class='sgn_note_timestamp_content'></span>"+
                        "</div>");


  if(isRichTextEditor()){
    sendEventMessage('SGN_tinyMCE_remove');
  }

  if(SimpleGmailNotes.isInbox()){
    searchLogoutPrompt.find(".sgn_share").remove();
  }

  $(".sgn_input").remove();
  $(".sgn_note_timestamp").remove();
  $(".sgn_prompt_login").remove();
  $(".sgn_prompt_logout").remove();

  var textareaContainer = $("<div class='sgn_textarea_container'></div>");
  textareaContainer.append(textAreaNode);
  textareaContainer.append(noteTimeStamp);


  injectionNode.prepend(revokeErrorPrompt);
  injectionNode.prepend(revokeCRMErrorPrompt);
  injectionNode.prepend(userErrorPrompt);
  injectionNode.prepend(loginErrorPrompt);
  injectionNode.prepend(customErrorPrompt);
  injectionNode.prepend(crmErrorPrompt);
  injectionNode.prepend(textareaContainer);
  injectionNode.prepend(loginPrompt);
  injectionNode.prepend(searchLogoutPrompt);
  injectionNode.prepend(emptyPrompt);
  injectionNode.append(getLogoNode('sgn_bart_logo_bottom'));
  console.log("@1329");
  $(".sgn_error").hide();

  $('.sgn_modal_list_notes').featherlight('text',{
    width: 800,
   	height: 600,
    beforeOpen: function(event){
      $('.featherlight').css('overflow', 'scroll');
      $('.featherlight-content').empty();
      setupSearchModal(email);
    },
    afterOpen: function(event){
      createTableLoading();
      gSearchContent = "";
      var request = {action: 'search_notes', email: email, gdriveFolderId: gCurrentGDriveFolderId};
      sendBackgroundMessage(request);
    }
  });

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

          /*
          var container = SGNC.getContainer();
          var isShared = container.attr("data-sgn-opp-id");
          if(isShared){
            request["markCrmDeleted"] = true;
          }*/
        }

        if(action == "template"){
          appendTemplateContent(email, messageId);
        }

        if(action == "disable_account"){
          if(!confirm("Are you sure to disable Simple Gmail Notes for '" + email + "'?" +
                      "\n(You could re-enable it later from the preferences page.)"))
            return;

        }

        /*
        if (action === "shared") {
          alert("You have already shared the email.")
          return;
        }
        */

        if (action === "share" ) {
          shareToCRM(email, messageId);
          //var emailData = getCRMShareEmailData(email, messageId);
          //var url = getCRMShareUrl(gCrmUserEmail, emailData);

          //sendEventMessage('SGN_PAGE_open_popup', url);
          return;
        }

        if (action === "open_opportunity") {
          var opportunityId = SGNC.getContainer().attr("data-sgn-opp-id");
          if (!opportunityId)
            return;

          var container = SGNC.getContainer();
          var errorNode = container.find(".sgn_error.sgn_custom:visible");
          if (errorNode && errorNode.text())
            return;

          var url = getCRMOpportunityDetailUrl(
            getCrmUser(email), opportunityId);

          sendEventMessage(
            'SGN_PAGE_open_popup',
            {
              url: url,
              windowName: 'sgn-opportunity-popup',
              strWindowFeatures: getStrWindowFeatures(1000, 700)
            }
          );
        }

        if (action != "modal_list_notes"){
          sendBackgroundMessage(request);

          if (action == "disable_account"){
            alert("Please refresh browser to make the changes effective.");
          }
        }

      }
    });
  });


  $(".sgn_current_connection").attr("href", getSearchNoteURL());
  //$(".sgn_search").attr("href", getSearchNoteURL());
  
  /*$(".sgn_search").click(function(){
    sendBackgroundMessage({action: 'modal_list_notes', email: email, gdriveFolderId: gCurrentGDriveFolderId});
  });*/

  $(".sgn_add_calendar").attr("href", getAddCalendarURL(messageId));
  
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
                                   setBackgroundColorWithPicker('#' + hex); //set color of text area
                                   
                                   //immediate post the note again
                                   postNote(email, messageId);

                                   //notice background color update to CRM
                                   shareToCRM(email, messageId, true);
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
    container.find('.simpleColorChooser').css("margin-left", "-85px").css("z-index", 1);	//align back
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

var setupOpportunityListOpener = function(email) {
  if (!isCRMEnabled() || existsOpportunityListOpener()) {
    return;
  }

  $("#gbwa").before(
    '<div class="sgn_opportunity_list_opener"><a title="Opportunity List">' +
    '<img src="' + SGNC.getIconBaseUrl() + '/crm-logo.24.png"/></a></div>'
  );

  $(".sgn_opportunity_list_opener").click(function() {
    var url = getCRMOpportunityListUrl(email);

    sendEventMessage(
      'SGN_PAGE_open_popup',
      {
        url: url,
        windowName: 'sgn-opportunity-popup',
        strWindowFeatures: getStrWindowFeatures(1000, 700)
      }
    );
  });
};

var revokeSummaryNote = function(messageId){
  var emailId = messageId;

  //remove the note in cache, so the new notes would be collected next time
  var trNode = $("*[sgn_email_id='" + emailId + "']");


  if(trNode.is(".apv")){  //vertical split
    trNode.next().next().find(".sgn").remove();
  }
  else{
    trNode.find(".sgn").remove();
  }

  if(gEmailIdNoteDict[messageId])
    delete gEmailIdNoteDict[messageId];//delete the prevoius note

  debugLog("@447", emailId);
  debugLog("Requesting force reload");

  sendEventMessage("SGN_PAGE_force_reload");  //no effect to the page script now
};

var updateNotesOnSummary = function(userEmail, pulledNoteList){
  var preferences = SimpleGmailNotes.preferences;
  var addAbstractNode = function(mailNode, abstractNode){
    var hook;
    if(SGNC.isInbox()){
      hook = $(mailNode).find("div.bg");
    } else if (preferences["abstractStyle"] === "inbox_reminder") {
      hook = $(mailNode).find("div.xS");
    } else{   //both old and new gmail
      hook = $(mailNode).find(".xT .yi"); //new gmail

      if(!hook.length){ //vertical split view
        hook = $(mailNode).next().next().find(".apB .apu");
      }

      if(!hook.length){
        $(mailNode).find(".xT .y6").before("<div class='yi'>");
        hook = $(mailNode).find(".xT .yi"); //new gmail
      }

    }
    if(!hook.find(".sgn").length)
      if (preferences["abstractPosition"] === "before-labels"
          && preferences["abstractStyle"] !== "inbox_reminder") {
        hook.prepend(abstractNode);
      } else {
        hook.append(abstractNode);
      }
  };

  var hasMarked = function(mailNode, timestamp){
    var sgnNode = mailNode.find(".sgn");
    if(sgnNode.length == 0)
      return false;

    var nodeTimestamp = sgnNode.attr("data-sgn-timestamp");
    if(timestamp && !nodeTimestamp)
      return false;

    if(timestamp && timestamp > nodeTimestamp)
      return false;

    return true;
  };

  var markAbstract = function(mailNode, note, emailKey, timestamp){
    var abstractNode;

    if(note && note.description && note.description != gSgnEmtpy){
      if(SGNC.isInbox()){
        abstractNode = $('<span class="sgn sgn_inbox">' +
                            '<span class="" title="' + htmlEscape(note.description) + '" style="">' + 
                            htmlEscape(note.short_description) + '</span></span>' );
      } else {    //old and new gmail
        var abstractNote = note.short_description;
        if (preferences["abstractStyle"] === "inbox_reminder")
          abstractNote = note.description;

        abstractNode = $('<div class="ar as bg sgn">' +
                            '<div class="at" title="' + htmlEscape(note.description) + 
                            '" style="background-color: #ddd; border-color: #ddd;">' + 
                            '<div class="au" style="border-color:#ddd"><div class="av" style="color: #666">' + 
                            htmlEscape(abstractNote) + '</div></div>' +
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
      }else{    //both old and new gmail
        abstractNode.find(".at").css("background-color", backgroundColor)
                                .css("border-color", backgroundColor);
        abstractNode.find(".au").css("border-color", backgroundColor);
        abstractNode.find(".av").css("color", gAbstractFontColor);
        if(gAbstractFontSize != "default")
          abstractNode.find(".av").css("font-size", gAbstractFontSize + "pt");
      }
    }else{
      abstractNode = $('<div style="display:none" class="sgn"></div>');
    }

    if(timestamp)
      abstractNode.attr("data-sgn-timestamp", timestamp);

    addAbstractNode(mailNode, abstractNode);
  };

  if(pulledNoteList && pulledNoteList.length){
    debugLog("updated summary from pulled note, total count:", 
             pulledNoteList.length);

    $.each(pulledNoteList, function(index, item){
      var currentItem = gEmailIdNoteDict[item.id];

      if(currentItem && item){
        var currentTimestamp = getNoteProperty(currentItem.properties, "sgn-note-timestamp");
        var newTimestamp = getNoteProperty(item.properties, "sgn-note-timestamp");

        //console.log("@1558", currentTimestamp, newTimestamp);

        //current note have a better timestamp
        if(currentTimestamp && newTimestamp && newTimestamp <= currentTimestamp)
          return;
      }

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

    var timestamp = "";

    if(emailNote && emailNote.properties){
      timestamp = getNoteProperty(emailNote.properties, 'sgn-note-timestamp');
    }

    if(!timestamp.startsWith("20")) //invalid timestamp format
      timestamp = "";

    //console.log("@1587", timestamp);
    if(!hasMarked($(this), timestamp)){
      markAbstract($(this), emailNote, emailId, timestamp);
    }

  });
};

var gPendingCRMPullList = [];
var gCRMPullHistoryDict = {};
var batchPullCRMNoteList = function(userEmail, requestList){
  if(!gCRMLoggedIn){
    if(gPendingCRMPullList.length < 500){  //CRM unlikely to be used in future
      gPendingCRMPullList = gPendingCRMPullList.concat(requestList);
      requestList = [];
    }
  }
  else{
    requestList = gPendingCRMPullList.concat(requestList);
    gPendingCRMPullList = [];
  }

  if(!userEmail || !requestList || requestList.length == 0)
    return;
    
  var finalRequestList = [];

  //make sure the request was not done before
  for(var i=0; i<requestList.length; i++){
    var emailId = requestList[i];
    if(!(emailId in gCRMPullHistoryDict)){
      finalRequestList.push(emailId);
      gCRMPullHistoryDict[emailId] = 1;
    }
  }

  if(!finalRequestList.length)
    return;

  var url = getBatchPullNotesUrl(userEmail, finalRequestList);


  $.ajax({
    url: url,
    dataType: "jsonp",
    jsonpCallback: "SimpleGmailNotes.batchPullNotesCallBack",
    timout: 3000,
    success: function(response){
      //console.log("@389", response);
    },
    error: function(){
      //timeout found
      //console.log("timeout for pull note request");
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

    batchPullCRMNoteList(userEmail, requestList);
  }else{
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

var makeSearchBold = function(matches, content){
  for(var j=0; j<matches.length; j++){
    var replaceString = "<strong>" + matches[j] + "</strong>";
    var reItem = new RegExp(matches[j], 'g');
    content = content.replace(reItem, replaceString);
  }
  return content;
};


var showDeleteMessage = function(type, email){
  $(".sgn-modal-input").prop('disabled', false);
  var message = "";
  if(type === "success"){
    message = "Notes deleted successfully";
    showDeleteNotice(message, type);
    $('.sgn_show_table table').empty();
    createTableLoading();
    sendBackgroundMessage({action:"search_notes", email: email, 
                           searchContent: gSearchContent, 
                           gdriveFolderId: gCurrentGDriveFolderId});    
  }else{
    message = "Failed to delete the notes";
    showDeleteNotice(message, type);
  }

};

var showSearchResult = function(notes, email){
  var table = $('.sgn_show_table table');
  table.empty();
  var thRow = $('<thead id="sgn_table_thead"><tr><th><input type="checkbox" id="sgn-select-all"></th><th>TITLE</th><th>NOTE</th><th>LAST UPDATED</th></tr></thead>');
  var tbody = $('<tbody id="sgn_table_tbody"></tbody>');
  table.append(thRow);

  for(var i=0; i<notes.length; i++){
    var modifiedDate = notes[i].modifiedDate;
    var modifiedTime = notes[i].modifiedTime;
    var emailUrl = getHistoryNoteURL(notes[i].messageId); 
    var properties = notes[i].properties;
    var modalNoteColor = getNoteProperty(properties, 'sgn-background-color');
    var preferences = SimpleGmailNotes.preferences;
    if(!modalNoteColor){
      modalNoteColor = preferences["backgroundColor"];  
    }

    var threadId = getNoteProperty(properties, 'sgn-thread-id');
    var sgnLastMessageId = getNoteProperty(properties, 'sgn-last-message-id');

    var title = notes[i].title;
    var subject = title;
    var shortDescription = htmlEscape(notes[i].shortDescription);

    if(gSearchContent){
      var re = new RegExp(gSearchContent, 'gi');
      var descriptionMatches = shortDescription.match(re);
      var titleMatches = title.match(re);
      if(descriptionMatches){
       shortDescription = makeSearchBold(descriptionMatches, shortDescription); 
      }
        
      if(titleMatches){
        title = makeSearchBold(titleMatches, title);
      }

    }
       
    var aLink = $('<a>', {
      href: emailUrl,
      target: "_blank"
    });
    aLink.html(title);

    var spanTag = $('<span>').html(shortDescription)
                              .css('background-color', modalNoteColor);
    var row = $('<tr></tr>');
    row.attr("noteId", notes[i].noteId);
    row.attr("emailId", notes[i].messageId);
    row.attr("lastEmailId", sgnLastMessageId);
    row.attr("threadId", threadId);
    row.attr("backgroundColor", modalNoteColor);
    row.attr("subject", subject);
    row.attr("content", notes[i].content);
    row.attr("crmOppId", getNoteProperty(properties, "sgn-opp-id"));
    row.attr("crmNoteTimeStamp", getNoteProperty(properties, "sgn-note-timestamp"));
    var td2 = $('<td></td>').append(aLink);
    var td3 = $('<td></td>').append(spanTag);
    var td4 = $('<td></td>').text(modifiedTime);
    var td1 = $('<td></td>').append("<input type='checkbox'>");
    row.append(td1)
        .append(td2)
        .append(td3)
        .append(td4);
    tbody.append(row);

  }
  table.append(tbody);

  var final_height = $("#sgn-featherlight-content").innerHeight() - 
                        $(".sgn-modal-title").outerHeight() - 
                        $(".sgn-modal-search").outerHeight() - 
                        $("#sgn_table_thead").outerHeight() - 50;
  tbody.css("height", final_height);

  $("#sgn-select-all").on('change', function(e){
    var isSelectAll = $(this).prop("checked");
    $("#sgn_table_tbody > tr").each(function(){
      $(this).find('input[type="checkbox"]').prop("checked", isSelectAll);
    });
    switchThead(email);
  });

  $("#sgn_table_tbody > tr input[type='checkbox']").on('change', function(e){
    var allCheckBoxCount = $("#sgn_table_tbody").find('input[type="checkbox"]').length;
    var selectedCount = $("#sgn_table_tbody").find('input[type="checkbox"]:checked').length;
    if(allCheckBoxCount > selectedCount){
      $("#sgn-select-all").prop("checked", false);
    }
    else if(selectedCount === allCheckBoxCount){
      $("#sgn-select-all").prop("checked", true);
    }
    switchThead(email);
  });
};


var getCRMShareEmailListData = function(email){
  var fontColor = SimpleGmailNotes.preferences["fontColor"];
  var hideSuccuess = "";
  if(SimpleGmailNotes.preferences["showCRMSuccessPage"] === "false")
    hideSuccuess = "1";

  var crmData = getSelectedNotesData();
  var dataList = [];

  for(var i=0; i<crmData.length; i++){
    var data = {
      contacts: "",
      email:{
        id: crmData[i].emailId,
        email_address: email,
        note: crmData[i].content,
        subject: crmData[i].subject,
        thread_id: crmData[i].threadId,
        excerpt: "",
        font_color: fontColor,
        background_color: crmData[i].backgroundColor,
        opportunity_id: crmData[i].crmOppId,
        note_timestamp: crmData[i].crmNoteTimeStamp,
        gdrive_note_id: crmData[i].noteId,
        latest_message_id: crmData[i].latest_message_id,
        gdrive_folder_id: gCurrentGDriveFolderId,
      },
      hide_success_page: hideSuccuess
    };
    dataList.push(data);
  }
  return dataList;

};

var filterEmailIds = function(notesData){
  var emailIds = [];
  for(var i=0; i<notesData.length; i++){
      if(notesData[i]["emailId"]){
        emailIds.push(notesData[i]["emailId"]);
      }
    }
  return emailIds;
};

var switchThead = function(email){
  var selectedCount = $("#sgn_table_tbody").find('input[type="checkbox"]:checked').length;
  if(selectedCount > 0){
    if($(".sgn-crm-modal-button").length){
      return;
    }
    $("#sgn_table_thead > tr > th").not(":first").remove();
    var iconTh = $("<th></th>");

    var sgnDeleteNotesImageUrl = SGNC.getIconBaseUrl() + "/delete.24.png";
    var sgnDeleteNotesImage = $('<img/>', {
      id: "sgn-delete-notes-button",
      src: sgnDeleteNotesImageUrl,
      alt: 'delete notes'
    });

    var sgnDeleteNotesImagePosition = $('<span id="sgn-delete-notes" class="sgn-delete-notes sgn-action"></span>')
                                      .prepend(sgnDeleteNotesImage);

    var sgnShareNotesImageUrl = SGNC.getIconBaseUrl() + "/share.24.png";
    var sgnShareNotesImage = $('<img/>', {
      src: sgnShareNotesImageUrl,
      alt: 'share notes'
    });

    var sgnShareNotesImagePosition = $('<span class="sgn-dropdown sgn-action" style="display:none">' +
                                           'Sync to Mobile' +
                                           '<div class="sgn-sync-type">' +
                                               '<div class="sgn-crm-share-notes" data-sgn-sync-type="auto">' +
                                                   'Create / Update Multiple Opportunities' +
                                               '</div>' +
                                               '<hr>' +
                                               '<div class="sgn-crm-share-notes" data-sgn-sync-type="manually">' +
                                                   'Add to Single Opportunity' +
                                               '</div>' +
                                           '</div>' +
                                       '</span>').prepend(sgnShareNotesImage);

    //var sgnCrmManagement = $('<span></span>').text("Email Management:");
    var sgnCrmManagement = $('<span></span>').text("");
    var sgnCrmTh = $('<th id="sgn-crm-modal-button">Actions:</th>').append(sgnCrmManagement)
                    .append(sgnShareNotesImagePosition)
                    .append(sgnDeleteNotesImagePosition);
    $("#sgn_table_thead > tr").append(sgnCrmTh);

    $(".sgn-crm-share-notes").on('click', function(){
      var emailIds = [];
      var notesData = getSelectedNotesData();
      emailIds = filterEmailIds(notesData);
      if(emailIds.length === 0){
        alert("please select notes");
        return;
      }

      var syncType = $(this).attr("data-sgn-sync-type");
      var url = getCRMMultipleShareNotesUrl(
        getCrmUser(email), syncType);
      sendEventMessage("SGN_PAGE_open_popup",
                {url: url,
                windowName: 'sgn-share-notes-popup',
                strWindowFeatures: getStrWindowFeatures(816, 766)
                });
    });

    $("#sgn-delete-notes").on('click', function(event){
      var notesData = getSelectedNotesData();
      var noteInfos = [];
      var emailIds = filterEmailIds(notesData);
      for(var i=0; i<notesData.length; i++){
        var noteInfo = {};
        /*
        if(notesData[i]["emailId"]){
          emailIds.push(notesData[i]["emailId"]);
        }*/

        if(notesData[i]["noteId"]){
          noteInfo["noteId"] = notesData[i]["noteId"];
          if(notesData[i]["sgn-opp-id"]){
            noteInfo["crmDeleteTag"] = true;
            //mark the deleted notes for crm
            var properties = [{"key" : gSgnCrmDeleted, "value" : true, "visibility": "PUBLIC"}];
            noteInfo["metadata"] = {properties:properties, description:gSgnDeleted};
          }
          noteInfos.push(noteInfo);
        }
      }
      //var searchContent = $(".sgn-modal-input").val();
      gSearchContent = $(".sgn-modal-input").val();
      if(notesData.length === 0){
        alert("please select notes");
        return;
      }
      $(".sgn-modal-input").prop('disabled', true);
      var deleteConfirmMessage = "Are you sure you want to delete " + notesData.length + " note(s)?";
      if(!confirm(deleteConfirmMessage))
        return;

      deleteNotes(noteInfos, emailIds, email);
      event.stopPropagation();
    });

  }else{
    //recover table;
    if($("#sgn_table_thead > tr:contains('TITLE')").length > 0){
      return;
    }
    $("#sgn_table_thead > tr > th").not(":first").remove();
    var thTitle = $("<th>TITLE</th>");
    var thNote = $("<th>NOTE</th>");
    var thDate = $("<th>LAST UPDATED</th>");
    $("#sgn_table_thead > tr").append(thTitle)
                        .append(thNote)
                        .append(thDate);
  }
};

var setupSearchModal = function(email){
  
  var closeButton = $('<button/>').addClass('sgn-modal-close featherlight-close')
                                  .attr('aria-label', 'Close')
                                  .text('x');
  var sgnModalTitle = $('<div></div>').text('Simple Gmail Notes').addClass('sgn-modal-title')
                              .append(closeButton);

  var sgnModalSearch = $('<div id="sgn-modal-search-div"></div>').addClass('sgn-modal-search');
  var sgnModalSearchDivContent = $('<div class="sgn-modal-search"></div>');
  var sgnModalInput = $('<input/>').addClass('sgn-modal-input')
                                    .attr({
                                      type: 'text',
                                      placeholder: 'Search'
                                    });
  var sgnGoogleDriveImageUrl = SGNC.getIconBaseUrl() + '/Google-Drive-icon.png';
  var sgnALinkToGDUrl = getSearchNoteURL();

  var sgnGoogleDriveImage = $('<img/>',{
    src: sgnGoogleDriveImageUrl,
    alt: 'google drive folder url'
  });
  var sgnAlink = $('<a></a>').append(sgnGoogleDriveImage).attr('href', sgnALinkToGDUrl);

  var sgnGoogleDriveImagePosition = $('<div></div>').addClass('sgn-googledrive-folder')
                                                    .prepend(sgnAlink);

  sgnModalSearchDivContent.append(sgnModalInput).append(sgnGoogleDriveImagePosition);
  sgnModalSearch.append(sgnModalSearchDivContent);

  var row = $('<tr><th>TITLE</th><th>NOTE</th><th>LAST UPDATED</th></tr>');
  
  var table = $('<table></table>');
  table.append(row);
  
  var sgnShowTable = $('<div></div>').append($('<div></div>')
                                              .addClass('sgn_show_table')
                                              .append(table));
  $('.featherlight-content').append(sgnModalTitle)
                            .append(sgnModalSearch)
                            .append(sgnShowTable);
                                 
  $('div.featherlight-content').attr('id', 'sgn-featherlight-content');
  var searchMagnifierUrl = SGNC.getIconBaseUrl() + "/search.24.png";
  $('.sgn-modal-input').css({"background-image": "url("+ searchMagnifierUrl +")"});
  
  $(".sgn-modal-input").on('keyup', function(){
    gSearchContent = this.value;
    searchModalNotes(email);
  });


};

var showDeleteNotice = function(message, type){
  if($("#sgn-modal-search-div").length){
    $('<div class="sgn-show-delete-notice"></div>').insertAfter($("#sgn-modal-search-div"));
    if(type === "success"){
      $(".sgn-show-delete-notice").addClass("sgn-delete-success-notes");
    }else{
      $(".sgn-show-delete-notice").addClass("sgn-delete-fail-notes");
    }
    $(".sgn-show-delete-notice").text(message);

    setTimeout(function(){
      $(".sgn-show-delete-notice").remove();
    }, 2000);
  }
};

var deleteCrmNotes = function(email, noteList){
  //var emailIds = [];
  var correspondedIds = [];
  var lastedMessageId = "";
  for(var i=0; i<noteList.length; i++){
    var correspondedId = {};
    var properties = noteList[i]["properties"];
    for(var j=0; j<properties.length; j++){
      if(properties[j]["key"] === "sgn-opp-id"){
        // emailIds.push(noteList[i]["messageId"]);
        lastedMessageId = getNoteProperty(properties, "sgn-last-message-id");
        correspondedIds.push({"message_id": noteList[i]["messageId"],
                              "latest_message_id": lastedMessageId});
        break;
      }
    } 
  }
  if(correspondedIds && correspondedIds.length > 0){
    var url = getCRMDeleteNotesUrl(
      getCrmUser(email), JSON.stringify(correspondedIds));
    $.ajax({
      url: url,
      dataType: 'jsonp',
      jsonpCallback: "SimpleGmailNotes.deleteNoteCallBack",
      success: function(data){
        debugLog("delete successfully in crm");
      },
      error: function(data){
        debugLog("failed to delete");
      }
    });
  }
};

var deleteNotes = function(noteInfos, emailIds, email){
  for(var i=0; i<emailIds.length; i++){
    if(gCurrentMessageId === emailIds[i]){
      // delete current email note
      deleteMessage(emailIds[i]);
    }else{
      delete gEmailIdNoteDict[emailIds[i]];
    }
  }
  gSuccessDeleted = false;
  sendBackgroundMessage({action:"delete_notes", email: email,
                         noteInfos: noteInfos,
                         gdriveFolderId: gCurrentGDriveFolderId});    
};

var getSelectedNotesData = function(){
  var crmData = [];
  $("#sgn_table_tbody > tr").each(function(){
    var checkResult;
    var idObject = {};
    checkResult = $(this).find('input[type="checkbox"]').is(":checked");
    if(checkResult){
      idObject["noteId"] = $(this).attr("noteId");
      idObject["threadId"] = $(this).attr("threadId");
      idObject["emailId"] = $(this).attr("emailId");
      idObject["latest_message_id"] = $(this).attr("lastEmailId");
      idObject["backgroundColor"] = $(this).attr("backgroundColor");
      idObject["subject"] = $(this).attr("subject");
      idObject["content"] = $(this).attr("content");
      idObject["sgn-opp-id"] = $(this).attr("crmOppId");
      idObject["sgn-note-timestamp"] = $(this).attr("crmNoteTimeStamp");
      crmData.push(idObject);
    }
  });

  return crmData;
};


var updateDeletedIcon = function(){
    $(".sgn_share").empty();
    $(".sgn_open_opportunity").remove();

    //var sgnShareImageUrl = SGNC.getIconBaseUrl() + '/share.24.png';
    //var sgnShareImage = $('<img/>',{
      //src: sgnShareImageUrl,
      //alt: 'Sync to Mobile'
    //});
    //sgnShareImage.addClass("sgn_share_img");
    //$(".sgn_share.sgn_action").append(sgnShareImage);
  //
    updateShareIcon("default", "Sync to Mobile");
    
    $(".sgn_error.sgn_custom").empty();
};

var updateShareIconMeta = function(messageId, shareInfo){
  if(messageId != gCurrentMessageId)  //page flipped since request
    return;

  var isShared, autoSync, opportunityId, opportunityName, noteTimestamp;
   
  if(shareInfo instanceof Array){ //from SGN note
    isShared = getNoteProperty(shareInfo, "sgn-shared");
    autoSync = getNoteProperty(shareInfo, "sgn-auto-sync");
    opportunityId = getNoteProperty(shareInfo, "sgn-opp-id");
    opportunityName = getNoteProperty(shareInfo, "sgn-opp-name");
    opportunityUrl = getNoteProperty(shareInfo, "sgn-opp-url");
    noteTimestamp = getNoteProperty(shareInfo, "sgn-note-timestamp");
  }
  else {  //from CRM
    isShared = true;
    autoSync = shareInfo["sgn-auto-sync"];
    opportunityId = shareInfo["sgn-opp-id"];
    opportunityName = shareInfo["sgn-opp-name"];
    opportunityUrl = shareInfo["sgn-opp-url"];
    noteTimestamp = shareInfo["sgn-note-timestamp"];
  }

  if (isShared) {
    var container = $("div.sgn_container:visible");
      
    if(gCRMLoggedIn && !gSyncFutureNotesEnabled){ 
      updateShareIcon("shared", "Note Shared to Mobile");
    }

    
    container.attr("data-sgn-opp-id", opportunityId);
    container.attr("data-sgn-opp-name", opportunityName);
    container.attr("data-sgn-opp-url", opportunityUrl);
    container.attr("data-note-timestamp", noteTimestamp);

    container.find(".sgn_opp_name").text(opportunityName);
    container.find(".sgn_open_opportunity")
      .attr("title", "Click to view more details: " + opportunityName)
      .css('display', 'flex');

    SGNC.getContainer().find(".sgn_error.sgn_custom").text("");
  }

};

var delayTimer;
var searchModalNotes = function(email){
  clearTimeout(delayTimer);
  delayTimer = setTimeout(function(){
    sendBackgroundMessage({action:"search_notes", email: email, 
                           searchContent: gSearchContent, 
                           gdriveFolderId: gCurrentGDriveFolderId});    
  }, 300);

};

var showError = function(errorMessage, type){
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
};

var showOfflineNotice = function(){
  setupOfflineNotice();
  disableEdit();
};

var showNoteModifiedTime = function(modifiedTime){

  var preferences = SimpleGmailNotes.preferences;
  if(!preferences)  //ui not ready
    return;

  var showNoteTimeStamp = (preferences["showNoteTimeStamp"] !== "false");

  if(showNoteTimeStamp && SimpleGmailNotes.getNoteTimeStampDom().length > 0 &&
          SimpleGmailNotes.getNoteTimeStampDom().hasClass("sgn_is_hidden")){
    SGNC.getNoteTimeStampDom().removeClass("sgn_is_hidden");
  }

  var displayTime = modifiedTime.substring(5, 16);
  SGNC.getNoteTimeStampDom().find(".sgn_note_timestamp_content")
                              .text(displayTime);
};

var showNotice = function(message, type, duration){
  var preferences = SimpleGmailNotes.preferences;
  if(preferences['showSavingStatus'] === 'false' && type =='note_saving')
    return;

  $(".sgn_notice").hide();

  var noticeDiv = SGNC.getContainer().find(".sgn_notice");
  noticeDiv.show().text(message);
  if(duration){
    setTimeout(function(){
      noticeDiv.text("");
      noticeDiv.hide();
    }, duration);
  }
};

var logoutCRM = function(){
    gCrmUserEmail = "";
    sendBackgroundMessage({action:"update_crm_user_email", 
                           email: ""});
    $(".sgn_opportunity_list_opener").remove();
    gCRMLoggedIn = false;

    updateShareIcon("default");
    //SGNC.getContainer().find("a.sgn_share img").removeClass("sgn_shared").attr("title", "").attr("src", 
     //   SGNC.getIconBaseUrl() + "/share.24.png");
};

var updateShareIcon = function(sharedStatus, title){
  if(!title)
    title = "";

  if(sharedStatus == "default"){
    icon = "share.24.png";
  }
  else if(sharedStatus == "shared"){
    icon = "shared.24.png";
  }
  else if(sharedStatus == "auto"){
    icon = "share-auto.24.png";
  }

  var img = SGNC.getContainer().find("a.sgn_share img");
  img.removeClass("sgn_shared").attr("src", SGNC.getIconBaseUrl() + "/" + icon);

  if(sharedStatus == "shared")
    img.addClass("sgn_shared");
};


var pullCRMStatus = function(email){
    if (isCRMEnabled()) {
      gCRMLoggedInChecked = true;
      $.ajax({
        url: getCheckCRMLoggedInUrl(email),
        dataType: "jsonp",
        jsonpCallback: "SimpleGmailNotes.checkCRMLoggedInCallBack",
        success: function(response) {},
        error: function(response) {}
      });
    }
};

var getCRMDeleteNotesUrl = function(userEmail, data){
  var url = SimpleGmailNotes.getCRMBaseUrl() + '/crm/delete_note/?crm_user_email=' +
                userEmail + '&data=' + encodeURIComponent(data) + "&format=json";

  return url;
};

var getCRMLoginURL = function(userEmail, idToken){
  var url = SimpleGmailNotes.getCRMBaseUrl() + 
            '/crm/sgncrx_login/?crm_user_email=' + userEmail + 
            '&id_token=' + idToken;

  return url;
};

var getCRMLogoutURL = function(userEmail) {
  var url = SimpleGmailNotes.getCRMBaseUrl() + '/crm/google_logout/' + userEmail + '/?is_crx=1';

  return url;
};

var getCRMMultipleShareNotesUrl = function(userEmail, syncType){
  var url = SimpleGmailNotes.getCRMBaseUrl() +
            '/crm/multiple_share_email/?crm_user_email=' + userEmail +
            '&sync_type=' + syncType;
  return url;
};


var getCRMShareUrl = function(userEmail, data){
  var url = SimpleGmailNotes.getCRMBaseUrl() + '/crm/share_email/?crm_user_email=' +
               userEmail + '&data=' + encodeURIComponent(JSON.stringify(data));
  return url;
};

var getCRMPullUrl = function(userEmail, messageId, noteTimestamp, 
                                          sgnLastMessageId, sgnThreadId, 
                                          isConversation){

  var url = SimpleGmailNotes.getCRMBaseUrl() + '/crm/pull_note/?crm_user_email=' +
               userEmail + '&message_id=' + messageId + '&note_timestamp=' + 
               noteTimestamp;

  if(sgnLastMessageId){
    url = url + "&latest_message_id=" + sgnLastMessageId;
  }

  if(sgnThreadId){
    url = url + "&thread_id=" + sgnThreadId;
  }

  if(isConversation){
     url = url + '&is_conversation=1';
  }


  return url;
};

var getCRMOpportunityDetailUrl = function(userEmail, opportunityId){
  var url = SimpleGmailNotes.getCRMBaseUrl() + '/crm/opportunity_detail/' +
    opportunityId + '/?crm_user_email=' + userEmail;
  return url;
};

var getCRMOpportunityListUrl = function(userEmail){
  var url = SimpleGmailNotes.getCRMBaseUrl() +
    '/crm/opportunity_list/?crm_user_email=' + userEmail;
  return url;
};

var getCheckCRMLoggedInUrl = function(userEmail) {
  return SimpleGmailNotes.getCRMBaseUrl() +
         "/crm/ajax_check_crm_logged_in/?crm_user_email=" +
         userEmail + "&action=check_crm_logged_in";
};

var getBatchPullNotesUrl = function(userEmail, requestList) {
  var url = SimpleGmailNotes.getCRMBaseUrl() + 
              "/crm/batch_pull_notes/?crm_user_email=" + userEmail +
              "&request_list=" + encodeURIComponent(JSON.stringify(requestList));

  if(sgnGmailDom.isConversationMode()){
     url = url + '&is_conversation=1';
  }

  return url;
};

//for more information digging, check this:
//https://developers.google.com/gmail/api/v1/reference/users/messages/get
var getCRMUpdateMailInfoURL = function(userEmail, messageId, emailData){
  var url = SimpleGmailNotes.getCRMBaseUrl() + 
              "/crm/update_email_info/?crm_user_email=" + userEmail +
              "&message_id=" + messageId + "&thread_id=" + emailData["threadId"];

  return url;
};

var updateCRMEmailThreadId = function(userEmail, emailId) {
  //no need to do that any more, gmail exposed thread id now
  return;

  if(!sgnGmailDom.isConversationMode()){
    //trigger thread ID update logic
    sendBackgroundMessage({action:"update_crm_email_thread_id", email:userEmail, 
      messageId: emailId});    
  }
};



var setupListeners = function(){


  /* Event listener for page */


  document.addEventListener('SGN_setup_note_editor', function(e) {
    SGNC.appendLog("eventSetupNote");
    var email = e.detail.email;
    var messageId = e.detail.messageId;
    var message = e.detail.message;
    var debugMessage = "";

    if(!isAlphaNumeric(messageId)){
      debugMessage = "invalid message ID (setup note editor): " + messageId;
      debugLog(debugMessage);
      SGNC.appendLog(debugMessage);
      return;
    }

    if(!isValidEmail(email)){
      debugMessage = "invalid email (setup note editor): " + email;
      debugLog(debugMessage);
      SGNC.appendLog(debugMessage);
      return;
    }

    SGNC.executeCatchingError(function(){
      setupNoteEditor(email, messageId);
    });

    sendDebugLog();
    /*
    if(SGNC.getLog()){
      SGNC.appendLog(SGNC.getLog());
    }*/
    
  });

  document.addEventListener('SGN_check_crm_logged_in', function(e){
    if(!gCRMLoggedInChecked)
      pullCRMStatus(e.detail.email);
  });

  document.addEventListener('SGN_crm_logged_in_success', function(e){
    gCRMLoggedIn = true;
    setupOpportunityListOpener(e.detail.email);
    gGmailWatchEnabled = e.detail.auto_sync_enabled;
    gSyncFutureNotesEnabled = e.detail.sync_future_notes_enabled;

    if(gCRMLoggedIn && gSyncFutureNotesEnabled)
      updateShareIcon("auto");


    var currentMessageId = sgnGmailDom.getCurrentMessageId();
    //simply pull note, don't send the email info (better privacy)
    shareToCRM(e.detail.email, currentMessageId, true, true);

    batchPullCRMNoteList(e.detail.email, []);
  });

  document.addEventListener('SGN_show_offline_notice', function(e){
    showOfflineNotice();
  });

  document.addEventListener('SGN_save_content', function(e){
    $('.sgn_input').trigger('blur');
  });


  document.addEventListener('SGN_heart_beat_request', function(e){
    //if background script died, exception raise from here
    sendBackgroundMessage({action:"heart_beat_request", email:e.detail.email});    
    sendDebugLog();
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

  document.addEventListener('SGN_batch_pull_notes', function(e) {
    var emailList = e.detail['email_list'];
    //console.log("@2432: " + emailList);
    //package result for updateSummary
    var pulledNoteList = [];
    for(var i=0; i < emailList.length; i++){
      var email = emailList[i];
      var email_id = "";
      
      if(sgnGmailDom.isConversationMode())
        email_id = email["thread_id"];
      else
        email_id = email["email_id"];

      var description = email["note"];
      var timestamp = email["timestamp"];
      var backgroundColor = email["background_color"];
      var short_description = SimpleGmailNotes.getSummaryLabel(description, 
                                SimpleGmailNotes.preferences);
      var properties = [{"key": "sgn-background-color", "value": backgroundColor},
                        {"key": "sgn-note-timestamp", "value": timestamp}];
      pulledNoteList.push({"id": email_id,  
                             "description": description,
                             "short_description": short_description,
                             "timestamp": timestamp, 
                             "properties": properties});
    }

    updateNotesOnSummary(e.detail.email, pulledNoteList);
  });

  document.addEventListener('SGN_update_debug_page_info', function(e) {
    //debugLog("Got page debug info");
    var debugInfo = e.detail.debugInfo;
    sendBackgroundMessage({action: "update_debug_page_info", debugInfo: debugInfo});
  });

  document.addEventListener('SGN_send_preference', function(e) {
    var preferenceType = e.detail.preferenceType;
    var preferenceValue = e.detail.preferenceValue;
    sendBackgroundMessage({action: "send_preference",
	preferenceType: preferenceType, preferenceValue: preferenceValue});
  });

  document.addEventListener('SGN_reset_preferences', function(e){
    sendBackgroundMessage({action: "reset_preferences"});
  });

  document.addEventListener('SGN_delete', function(e){
    var email = e.detail.email;
    var messageId = e.detail.messageId;
    deleteMessage(messageId);
    sendBackgroundMessage({action: 'delete', messageId: messageId,
        email: email, gdriveNoteId:gCurrentGDriveNoteId});
  });

  document.addEventListener('SGN_set_classic_gmail_conversation', function(e){
    gClassicGmailConversation = true; //this is a one-way road
    //console.log("@1284, clasic gmail conversation", gClassicGmailConversation);
  });

  document.addEventListener('SGN_delete_notes', function(e){
    var data = e.detail;
    var editorNode = SGNC.getContainer();
    var errorNode = editorNode.find(".sgn_error.sgn_custom");
    if(data["status"] == 'failed'){
      //:todo need to show error
    }else{
      errorNode.hide();
      errorNode.text("");
      var noteUpdateArray = data["email_info_list"];
      var messageId = "";
      var email = data["email"];
      for(var i=0; i<noteUpdateArray.length; i++){
        messageId = noteUpdateArray[i]["message_id"];
        if(messageId == gCurrentMessageId){
          SGNC.getCurrentInput().val(""); 
          if(isRichTextEditor()){
            sendEventMessage('SGN_tinyMCE_update_note', {content: ""});
          }
        }
      }
    }
  });

  document.addEventListener('SGN_silent_share', function(e){
    var data = e.detail;
    var editorNode = SGNC.getContainer();
    var errorNode = editorNode.find(".sgn_error.sgn_custom");

    if(data['status'] == 'failed'){
      // possible error message:
      // 1. 
      var errorMessage = data['message'];
      errorNode.text(errorMessage);
      errorNode.show();

      editorNode.find("a.sgn_share img").attr("title", "Auto-Sync Failed").attr("src", 
        SGNC.getIconBaseUrl() + "/share-outdated.24.png");
    }
    else{
      errorNode.hide();
      errorNode.text("");

      if(data['update_info']){  //need to push the latest note into gdrive
        var updateInfo = data['update_info'];


        //it's possible email page changed during the network response
        var email = e.detail.email;
        var messageId = updateInfo["message_id"];
        var content = updateInfo['sgn-content'];

        if(messageId == gCurrentMessageId && updateInfo["note_updated"]){
          SGNC.getCurrentInput().val(getDisplayContent(content));
          if(isRichTextEditor()){
            sendEventMessage('SGN_tinyMCE_update_note', {content: content});
          }

        }

        updateShareIconMeta(messageId, updateInfo);
        setBackgroundColorWithPicker(updateInfo["sgn-background-color"]);
        postNote(email, messageId, updateInfo);
        updateCRMEmailThreadId(email, messageId);
      }
    }

  });
  /* -- end -- */

  /* handle events from background script */
  setupBackgroundEventsListener(function(request){
    //debugLog("Handle request", request);
    var preferences = {};
    var displayContent, properties, warningMessage, customNoteColor;
    var backgroundColor, showCRMButton;

    switch(request.action){
      case "approve_setup":
        _setupPage();
        break;
      case "show_search_result":
        showSearchResult(request.notes, request.email);
        break;
      case "show_success_delete_message":
        if(!gSuccessDeleted){
          showDeleteMessage("success", request.email);
        }
        gSuccessDeleted = true;
        break;
      case "show_error_delete_message":
        //alert("failed to delete notes");
        showDeleteMessage("error");
        break;
      case "disable_edit":
        disableEdit();
        break;
      case "enable_edit":
        enableEdit();
        preferences = SimpleGmailNotes.preferences;
        updateUIByPreferences();
        backgroundColor = preferences["backgroundColor"];
        if(request.messageId && request.messageId == gCurrentMessageId){
          gPreviousContent = request.content;
          //displayContent = request.content;
          var content = SGNC.getCurrentContent();
          properties = request.properties;

          var printInfoProperties = getPrintInfoProperties();
          setPrintInfo(gSgnUserEmail, content, printInfoProperties);
          //warningMessage = SGNC.offlineMessage;
          customNoteColor = getNoteProperty(properties, 'sgn-background-color');
          
          //var isShared = getNoteProperty(properties, "sgn-shared");
          //showCRMButton = (preferences["showCRMButton"] !== "false");
          //push and pull and merged into one now
          /*
          if(isShared && showCRMButton){ //get back the note
            //var url = getCRMPullUrl(request.email, 
             //           request.messageId);
            $.ajax({
              url: url,
              dataType: "jsonp",
              jsonpCallback: "SimpleGmailNotes.silentPullCallBack",
              timout: 3000,
              success: function(response){
                //console.log("@389", response);
              },
              error: function(){
                //timeout found
                console.log("timeout for pull note request");
            //    if(request.messageId == gCurrentMessageId){
                //  enableEdit();
            var injectionNode = SGNC.getContainer();
            injectionNode.find(".sgn_error.sgn_crm").text("sync failed").show();
             //   }
              }
            });
          }
          */
          
          if(customNoteColor){
            backgroundColor = customNoteColor;
            setBackgroundColorWithPicker(customNoteColor);
          }

          /*
          updateShareIconMeta(request.messageId, properties);
          if(isMarkCrmDeleted(properties)){
            var noteList = [];
            noteList.push({"messageId":request.messageId, "properties": properties});
            deleteCrmNotes(request.gdriveEmail, noteList);
          }
          */
        }

        if(isEnableNoDisturbMode() && !request.content){
          backgroundColor = "";
        }
          
        SGNC.getCurrentInput().css('background-color', backgroundColor);
        if(isRichTextEditor()){
          sendEventMessage('SGN_tinyMCE_set_backgroundColor', {backgroundColor: backgroundColor});
        }
        gCurrentBackgroundColor = backgroundColor;
        showLogoutPrompt(request.gdriveEmail);

        if(gCRMLoggedIn && gSyncFutureNotesEnabled)
          updateShareIcon('auto');

        if (request.messageId && request.messageId == gCurrentMessageId) {
          updateShareIconMeta(request.messageId, properties);
          /*
          if(isMarkCrmDeleted(properties)){
            var noteList = [];
            noteList.push({"messageId":request.messageId, "properties": properties});
            deleteCrmNotes(request.gdriveEmail, noteList);
          }
          */

          if (gCRMLoggedIn) {
            var currentMessageId = sgnGmailDom.getCurrentMessageId();


            //simply pull note, don't send the email info (better privacy)
            shareToCRM(request.gdriveEmail, currentMessageId, true, true);

            /*
            var container = SGNC.getContainer();
            var currentMessageId = sgnGmailDom.getCurrentMessageId();
            var noteTimestamp = container.attr("data-note-timestamp");
            var sgnLastMessageId = sgnGmailDom.getLastMessageId();
            var sgnThreadId = sgnGmailDom.getCurrentThreadId();
            var isConversation = sgnGmailDom.isConversationMode();
            var noteContent = request.content;

            $.ajax({
              url: getCRMPullUrl(request.gdriveEmail, currentMessageId, 
                        noteTimestamp, sgnLastMessageId, sgnThreadId, isConversation),
              dataType: "jsonp",
              jsonpCallback: "SimpleGmailNotes.silentShareCallBack",
              success: function(response){
                debugLog("get note from crm successfully");
              },
              error: function(response){
                debugLog("get note from crm failed");
              }
            });
            */
          }
        }

        break;
      case "delete_crm_notes":
        var notes = request.noteList;
        var email = request.email;
        deleteCrmNotes(email, notes);
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
        showError(request.message, request.type);
        break;
      case "show_timestamp_and_notice":
        if(request.messageId && request.messageId == gCurrentMessageId){
          showNotice("Note saved", "note_saving", 2000);
          showNoteModifiedTime(request.modifiedTime);
        }
        break;
      case "update_user":
        $(".sgn_user").text(request.email);
        $("div.sgn").remove();  //clean up all those outdated div
        break;
      case "crm_user_logged_in":
        var idToken = request.idToken;
        //send ID tokent backend to set up session
        var url = getCRMLoginURL(getCrmUser(request.email), idToken);
        $.ajax({
          url: url,
          dataType: "jsonp",
          jsonpCallback: "SimpleGmailNotes.crmLoggedInCallBack",
          success: function(response){
            // console.log("@389", response);
          },
          error: function(response){
            // even for timeout error, it would not return in this closure
            //console.log("Failed to connect to server");
          }
        });
        break;
      case "logout_crm":
        var url = getCRMLogoutURL(getCrmUser(request.email));
        $.ajax({
          url: url,
          dataType: "jsonp",
          jsonpCallback: "SimpleGmailNotes.crmLoggedOutCallBack",
          success: function(response){
            // console.log("@389", response);
          },
          error: function(response){
            // even for timeout error, it would not return in this closure
            //console.log("Failed to connect to server");
          }
        });
        logoutCRM();
        break;
      case "update_content":
        updateUIByPreferences();
        if(request.messageId == gCurrentMessageId){
          displayContent = getDisplayContent(request.content);
          //properties = request.properties;
          warningMessage = SGNC.offlineMessage;
          //customNoteColor = getNoteProperty(properties, 'sgn-background-color');
          //updateShareIconMeta(properties);

          gPreviousContent = request.content;

          var printInfoProperties = getPrintInfoProperties();
          setPrintInfo(gSgnUserEmail, displayContent, printInfoProperties);
          SGNC.getCurrentInput().val(displayContent);
          showNoteModifiedTime(request.modifiedTime);
          if(isRichTextEditor()){
            sendEventMessage('SGN_tinyMCE_update_note', {content: displayContent});
          }
        }

        break;

      case "update_history":
        preferences = request.preferences;
        if(SGNC.isInbox())  //no history for inbox
          break;

        //work for both new and old gmail
        if(request.title == gCurrentEmailSubject){
          var history = request.data;

          if(!history.length)
            break;

          //alert(JSON.stringify(request.data));
          $(".sgn_history").remove(); //hide all previous history
          //var historyInjectionNode = $(".nH.adC:visible");
          var historyInjectionNode = SGNC.getSidebarNode();
          var historyNode = $("<div class='sgn_history'><div class='sgn_history_header'><b>SGN History</b>" +
                                  "<a class='sgn_show_all'><img title='Show All' src='" + SGNC.getIconBaseUrl() + 
                                  "/chat.24.png'></a></div></div>");
          historyInjectionNode.append(historyNode);
          var isDisplayHistoryPosition = $('.Bs.nH .Bu.y3 .y4').is(":visible");
          if(isDisplayHistoryPosition){
            $('.Bs.nH .Bu.y3 .y4').css('height', '0px'); //change history position in main page
          }

          for(var i=0; i<history.length; i++){
            var note = history[i];
            var customColor = getNoteProperty(note.properties, 'sgn-background-color');
            var noteDate = new Date(note.createdDate);
            var description = note.description;

            backgroundColor = preferences["backgroundColor"];
            if(customColor){
              backgroundColor = customColor;
            }
            if(description.length == 500){   //postNote function sub 500 string in background script
              description = description + '...';
            }

            var node = $("<div class='sgn_history_note'>" +
                                      "<a target='_blank' href='" + getHistoryNoteURL(note.id) + "'>"  + 
                                      noteDate.toString().substring(0, 24) + "</a><br/><br/>" + 
                                      description + "</div>");

            node.css("background-color", backgroundColor).css("color", preferences["fontColor"]);
            historyNode.append(node);
            

            //historyNode.find(".sgn_history_note").css("background-color", backgroundColor)
            //                                     .css("color", preferences["fontColor"]);

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
        //$(".sgn_search").attr("href", getSearchNoteURL());
        break;
      case "update_summary":
        debugLog("update summary from background call", request.email);
        var updateNoteList = request.noteList;
        updateNotesOnSummary(request.email, updateNoteList);
        updateUIByPreferences();
        break;
      case "revoke_summary_note":
        revokeSummaryNote(request.messageId);
        debugLog("Trying to revoke summary note", request);
        if(request.messageId == gCurrentMessageId){
          //better not to risk the folder ID change here
          //gCurrentGDriveFolderId = request.gdriveFolderId;
          gCurrentGDriveNoteId = request.gdriveNoteId;
        }

        break;

      //case "update_preferences":    //not to be used
       // sendEventMessage('SGN_PAGE_update_preferences', preferences);  
        //gAbstractBackgroundColor = preferences["abstractBackgroundColor"];
        //gAbstractFontColor = preferences["abstractFontColor"];
        //gAbstractFontSize = preferences["abstractFontSize"];
        //break;

      case "heart_beat_response":

        gLastHeartBeat = Date.now();
        if(request.crmUserEmail)
          gCrmUserEmail = request.crmUserEmail;

        preferences = request.preferences;


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

        gSgnUserEmail = request.gdriveEmail;

        sendEventMessage('SGN_PAGE_heart_beat_response', request.gdriveEmail);  

        break;
      case "alert_message":

        var messageNode = $("<div class='sgn_message'>");
        var message = request.message.replace(/\n/g, "<br/>");
        messageNode.html(message);
        messageNode.popup("show");
        break;
      case "get_crm_thread_id_success":
        var emailData = request.emailData;
        var threadId = emailData["threadId"];
        var messageId = request.messageId;
        var url = getCRMUpdateMailInfoURL(getCrmUser(request.email), messageId, emailData);
        $.ajax({
          url: url,
          dataType: "jsonp",
          jsonpCallback: "SimpleGmailNotes.dummyCallBack",
          succcess: function(response){
          },
          error: function(response){
          }
        });
        break;
      default:
        debugLog("unknown background request", request);
        break;
    }
  });

  // Event listener for share email
  window.addEventListener('message', function(e) {
    if (typeof e.data !== 'string' || !e.data.startsWith("sgncrm"))
      return;
    
    var shareSuccessPrefix = "sgncrm:share_success:";
    // var sharePageLoaded = "sgncrm:sgn_share_loaded:";
    var sharePageLoaded = "sgncrm:sgn_share_loaded";

    //get id token
    //
    if (e.data.startsWith(shareSuccessPrefix)) {
      var jsonData = e.data.substring(shareSuccessPrefix.length);
      /*
      var updateInfo = JSON.parse(jsonData);
      var messageId = updateInfo["message_id"];
      var email = updateInfo["email"];  //should be same as gCrmUserEmail
      if(messageId){
        postNote(gSgnUserEmail, messageId, updateInfo);
        updateShareIconMeta(messageId, updateInfo);
      }*/
      gLastCRMShareURL = null;
      var updateInfo = JSON.parse(jsonData);
      var messageId = "";
      if(Array.isArray(updateInfo)){
        for(var i=0; i<updateInfo.length; i++){
          messageId = updateInfo[i]["message_id"];
          if(messageId === gCurrentMessageId){
            updateShareIconMeta(messageId, updateInfo[i]);
          } 
          // postNote(gSgnUserEmail, messageId, updateInfo[i]);
        }
        batchShareNotes(gSgnUserEmail, updateInfo);
      }
      else{
        messageId = updateInfo["message_id"];
        if(messageId === gCurrentMessageId){
          updateShareIconMeta(messageId, updateInfo);
        } 
        postNote(gSgnUserEmail, messageId, updateInfo);
        updateCRMEmailThreadId(gSgnUserEmail, messageId);
      }
    }
    else if(e.data.startsWith('sgncrm:login_success')){
      var crm_user_email= e.data.split(":")[2];
      gCrmUserEmail = crm_user_email;
      sendBackgroundMessage({action:"update_crm_user_email", 
                             email: crm_user_email});

      gCRMLoggedIn = true;
      setupOpportunityListOpener(gSgnUserEmail);
      pullCRMStatus(gSgnUserEmail);
    }
    else if(e.data.startsWith('sgncrm:logout_success')){
      logoutCRM();
    }
    else if(e.data.startsWith('sgncrm:hide_success_page')){
      sendBackgroundMessage({action: "send_preference",
        preferenceType: "showCRMSuccessPage", preferenceValue: false});
    }
    else if(e.data.startsWith('sgncrm:show_success_page')){
      sendBackgroundMessage({action: "send_preference",
        preferenceType: "showCRMSuccessPage", preferenceValue: true});
    }
    else if(e.data.startsWith('sgncrm:enable_sync_future_notes')){
      if(e.data.endsWith('true')){
        gSyncFutureNotesEnabled = true;
        updateShareIcon("auto");
       }
       else{
        gSyncFutureNotesEnabled = false;
        updateShareIcon("default");
       }
    }
    else if(e.data.startsWith('sgncrm:locli_oauth')){
      sendBackgroundMessage({action: "crm_oauth", email: sgnGmailDom.userEmail()});
    }
    else if(e.data.startsWith(sharePageLoaded)){
      var email = e.data.substring(sharePageLoaded.length + 1).trim();
      var data = getCRMShareEmailListData(email);
      sendEventMessage(
        'SGN_PAGE_share_notes',{
          data: data
        });
    }
  }, true);


};

var gPreviousDebugLog = "";
var sendDebugLog = function(){
  var debugLog = SGNC.getLog();
  if(debugLog && debugLog != gPreviousDebugLog){
    sendBackgroundMessage({action:"update_debug_content_info", debugInfo: debugLog});
    gPreviousDebugLog = debugLog;
  }
};


//use for page script set up
var contentLoadStarted = false;
var contentLoadDone = false;

var setupPrintNote = function(printInfo) {
  var note = printInfo['note'];
  var properties = printInfo['properties'];
  var showPrintingNote = properties["showPrintingNote"];
  if (note && showPrintingNote) {
    var isRichTextEditor = false;
    console.log("@3215 properties", properties);
    if (!$.isEmptyObject(properties)) {
      var printNoteNode = $("<div class='gmail-note'></div>");
      $("div.maincontent").prepend(printNoteNode);
      Object.entries(properties).forEach(function(property) {
        if (property[0] === "isRichTextEditor") {
          isRichTextEditor = property[1];
          return;
        }
        $("div.gmail-note").css(property[0], property[1]);
      });
    }
    if (!isRichTextEditor) {
        $("div.gmail-note").text(note);
        $("div.gmail-note").css("white-space", "pre-wrap");
    } else {
        $("div.gmail-note").append(note);
    }
    $("div.gmail-note").addClass("sgn_print_note");

  }
};

var _setupPage = function(){
  addScript('lib/jquery-3.1.0.min.js');
  addScript('lib/lru.js');
  addScript('common/gmail-sgn-page.js');
  addScript('common/gmail-sgn-dom.js');
  addScript('common/shared-common.js');
  addScript('page.js');
};

var setupPage = function(retryCount){

  
  if(retryCount === undefined)
    retryCount = 600;//600 * 100 = 60 seconds for maximum loading time

  if(retryCount <= 0) //give up
    return; 

  // this is print email with note
  if (isGmailPrintView()) {
    var printEmail = sgnGmailDom.getPrintPageEmail();
    var printInfo = getPrintInfo(printEmail);
    if (!$.isEmptyObject(printInfo)) {
      setupPrintNote(printInfo);
    }
    return;
  }

  var email = sgnGmailDom.userEmail();

  if(email){
    var request = {action: 'request_setup'};
                   sendBackgroundMessage({action: 'request_setup', 
                         email: sgnGmailDom.userEmail()});
  }
  else
    setTimeout(setupPage, 100, retryCount-1);
};


var fireContentLoadedEvent = function() {
  if(contentLoadStarted){
    console.log("@3190 content");
    SGNC.appendLog("skipLoading");
    return;
  }

  contentLoadStarted = true;
  SGNC.appendLog("contentLoadStarted");

  setupListeners();

  setupPage();

  contentLoadDone = true;

  SGNC.appendLog("contentLoadDone");
};

$(document).ready(function(){

  SimpleGmailNotes.executeCatchingError(function(){
    SimpleGmailNotes.$ = $;
    SGNC.appendLog("documentReady");
    //if(SGNC.isInbox())
     // sgnInbox.fireContentLoadedEvent();

    fireContentLoadedEvent();
  });

  sendDebugLog();
});

debugLog("Finished content script (common)");
