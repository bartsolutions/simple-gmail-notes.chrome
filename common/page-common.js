/*
 * Simple Gmail Notes
 * https://github.com/walty8
 * Copyright (C) 2015 Walty Yeung <walty8@gmail.com>
 *
 * This script is going to be shared for both Firefox and Chrome extensions.
 */

window.SimpleGmailNotes = window.SimpleGmailNotes || {};

SimpleGmailNotes.refresh = function(f){
    if( (/in/.test(document.readyState)) || (undefined === window.Gmail)
        || (undefined === window.jQuery) ) {
      setTimeout(SimpleGmailNotes.refresh, 10, f);
    }
    else {
      f();
    }
}


SimpleGmailNotes.start = function(){

(function(SimpleGmailNotes, localJQuery){
  var $ = localJQuery;

  /* callback declarations */
  SimpleGmailNotes.isDebug = function(callback) {
    return false;
  }
  /* -- end -- */

  /* global variables (inside the closure)*/
  var gmail;
  var gEmailIdDict = {};
  var gDebugInfoDetail = "";
  var gDebugInfoSummary = "";
  var gLastHeartBeat = Date.now();
  //followings are for network request locking control
  var gLastPullTimestamp = null;
  var gNextPullTimestamp = null;
  var gConsecutiveRequests = 0;
  var gConsecutiveStartTime = 0;
  var g_oec = 0;    //open email trigger count
  var g_lc = 0;     //local trigger count
  var g_pnc = 0;    //pulled network trigger count
  /* -- end -- */
 
  var debugLog = function()
  {
    if (SimpleGmailNotes.isDebug()) {
        console.log.apply(console, arguments);
    }
  }

  var sendEventMessage = function(eventName, eventDetail){
    if(eventDetail == undefined){
      eventDetail = {};
    }

    eventDetail.email = gmail.get.user_email();
    document.dispatchEvent(new CustomEvent(eventName,  {detail: eventDetail}));
  }


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
    if(timestamp - gLastPullTimestamp < 3 * 1000)  //pull again in 3 seconds, for whatever reasons
      gConsecutiveRequests += 1;
    else{
      resetCounter = true;
    }

    if(gConsecutiveRequests >= 20){
        gNextPullTimestamp = timestamp + 60 * 1000; //penalty timeout for 60 seconds

        var message = "20 consecutive network requests detected from Simple Gmail Notes, the extension would be self-disabled for 60 seconds. " +
                      "Please consider to disable/uninstall this extension to avoid locking of your Gmail account. " +
                      "This warning message is raised by the extension developer (not Google), just to ensure your account safety.\n\n" +
                      "If possible, please kindly send the following information to the extension bug report page, " +
                      "it would be helpful for the developer to diagnose the problem. Thank you!\n\n";
        message += "oec:" + g_oec;
        message += "; lc:" + g_lc;
        message += "; pnc:" + g_pnc;
        message += "; tt:" + Math.round(timestamp - gConsecutiveStartTime);

        alert(message); //very intrusive, but it's still better then have the account locked up by Gmail

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
  }

  var sendDebugInfo = function(){
    var debugInfo = "Browser Version: " + navigator.userAgent + "\n" + gDebugInfoSummary + "\n" + gDebugInfoDetail;
    sendEventMessage('SGN_update_debug_page_info', {debugInfo:debugInfo});
  }

  var sendHeartBeat = function(){
    sendEventMessage("SGN_heart_beat_request");
  }

  var isBackgroundDead = function(){
      return Date.now() - gLastHeartBeat > 3000;
  }

  var htmlEscape = function(str) {
      return String(str)
              .replace(/&/g, '&amp;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#39;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');
  }

  var stripHtml = function(value){
    return value.replace(/<(?:.|\n)*?>/gm, '');
  }

  var getEmailKey = function(title, sender, time){
    var emailKey = sender + "|" + time + "|" + stripHtml(title);

    //in case already escaped
    emailKey = htmlEscape(emailKey);
    return emailKey;
  }

  var getTitle = function(mailNode){
    var hook = $(mailNode).find(".xT .y6");

    if(!hook.length)  //vertical split view
      hook = $(mailNode).next().find(".xT .y6");

    return hook.find("span").first().text();
  }

  var getTime = function(mailNode) {
    var hook = $(mailNode).find(".xW");

    if(!hook.length)  //vertical split view
      hook = $(mailNode).find(".apm");

    return hook.find("span").last().attr("title");
  }

  var getSender = function(mailNode) {
    return mailNode.find(".yW .yP, .yW .zF").last().attr("email");
  }

  var getEmailKeyFromNode = function(mailNode){
    var title = getTitle(mailNode);
    var sender = getSender(mailNode);
    var time = getTime(mailNode);
    var emailKey = getEmailKey(title, sender, time);

    debugLog("@249, email key:" + emailKey);

    return emailKey;
  }

  // I needed the opposite function today, so adding here too:
  var htmlUnescape = function(value){
      return String(value)
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&');
  }


  var isNumeric = function(str){
    var code, i, len;

    for (i = 0, len = str.length; i < len; i++) {
      code = str.charCodeAt(i);
      if (!(code > 47 && code < 58)){ // numeric (0-9)
        return false;
      }
    }
    return true;
  }

  //set up note editor in the email detail page
  var setupNoteEditor = function(){
    setTimeout(function(){
      if($(".sgn_container:visible").length)  //text area already exist
          return;

      var subject = $(".ha h2.hP").text();
      var messageId = "";

      if(gmail.check.is_preview_pane()){
          var idNode = $("tr.zA.aps:visible[sgn_email_id]").first();
          if(idNode.length)
              messageId = idNode.attr("sgn_email_id");
      }
      else
          messageId = gmail.get.email_id();

      if(!messageId)  //do nothing
          return;

      if(!acquireNetworkLock()){
          debugLog("setupNoteEditor failed to get network lock");
          return;
      }
       
      sendEventMessage('SGN_setup_note_editor', {messageId:messageId});
      sendEventMessage('SGN_setup_email_info', {messageId:messageId, subject:subject});

      gDebugInfoDetail = "Is Conversation View: " + gmail.check.is_conversation_view();
      sendDebugInfo();

    }, 0);  //setTimeout
  }

  var updateEmailIdByJSON = function(dataString){
    var startString = ")]}'\n\n";
    var totalLength = dataString.length;

    if(dataString.substring(0, startString.length) != startString){
      //not a valid view data string
      return;
    }

    var strippedString = dataString.substring(startString.length);

    var lineList = dataString.split("\n");
    var email_list = []

    if(lineList.length == 3){  //JSON data
        if(dataString.substring(totalLength-1, totalLength) != ']'){
          //not a valid format
          return;
        }

        if(strippedString.indexOf('["tb"') > 0){ //new email arrived for priority inbox view
          var emailData = eval(strippedString);
          email_list = gmail.tools.parse_view_data(emailData[0]);
        }
        else if(strippedString.indexOf('["stu"') > 0){
          var emailData = eval(strippedString);
          var newData = [];

          emailData = emailData[0];

          if(emailData[7] && emailData[7].length >= 3 && emailData[7][0] == "stu"
             && emailData[7][2] && emailData[7][2].length){
             var tempData = emailData[7][2];
             //to wrap up into a format that could be parsed by parse_view_data
             for(var i=0; i<tempData.length; i++){
                newData.push(["tb", "", [tempData[i][1]]]);
             }
          }

          email_list = gmail.tools.parse_view_data(newData);
        }
    }
    else if(lineList.length > 3){ //JSON data mingled with byte size
      if(dataString.substring(totalLength-2, totalLength-1) != ']'){
        //not a valid format
        return;
      }

      var firstByteCount = lineList[2];

      if(!isNumeric(firstByteCount)){
        return; //invalid format
      }

      if(strippedString.indexOf('["tb"') < 0){
        return; //invalid format
      }

      var tempString = "[null";
      var resultList = [];

      for(var i=3; i<lineList.length; i++){
        var line = lineList[i];
        if(isNumeric(line)){
          continue;
        }

        if(line.indexOf('[["tb"') != 0){
          continue;
        }

        var tempList = eval(line);

        resultList.push(tempList[0]);
      }

      email_list = gmail.tools.parse_view_data(resultList);
    }

    for(var i=0; i < email_list.length; i++){
      var email = email_list[i];
      var emailKey = getEmailKey(htmlUnescape(email.title), email.sender, email.time);
      gEmailIdDict[emailKey] = email;
    }
  }

  var updateEmailIdByDOM = function(dataString){
    var totalLength = dataString.length;

    var startString = "var GM_TIMING_START_CHUNK2=new Date().getTime(); var VIEW_DATA=";
    var endString = "; var GM_TIMING_END_CHUNK2=new Date().getTime();";


    if(dataString.substring(0, startString.length) != startString){
      //not a valid view data string
      return;
    }

    if(dataString.substring(totalLength - endString.length, totalLength) != endString){
      //not a valid view data string
      return;
    };

    var strippedString = dataString.substring(startString.length, totalLength-endString.length);

    var viewData = eval(strippedString);

    var email_list = gmail.tools.parse_view_data(viewData);

    for(var i=0; i< email_list.length; i++){
      var email = email_list[i];
      var emailKey = getEmailKey(email.title, email.sender, email.time);
      gEmailIdDict[emailKey] = email;
    }

    var temp = 0;
  }


  var pullNotes = function(){
    if(!$("tr.zA").length ||
       (gmail.check.is_inside_email() && !gmail.check.is_preview_pane())){
      debugLog("Skipped pulling because no tr to check with");
      return;  
    }

    if(isBackgroundDead()){
      return; //no need to pull
    }

    var visibleRows = $("tr.zA[id]:visible");

    var unmarkedRows = visibleRows.filter(":not([sgn_email_id])");
    debugLog("@104, total unmarked rows", unmarkedRows.length);
    unmarkedRows.each(function(){
      var emailKey = getEmailKeyFromNode($(this));
      var email = gEmailIdDict[emailKey];
      if(email){
        //add email id to the TR element
        $(this).attr("sgn_email_id", email.id);
      }
    });

    //rows that has been marked, but has no notes
    var pendingRows = visibleRows.filter("[sgn_email_id]:not(:has(div.sgn))");
    var requestList = [];
    pendingRows.each(function(){
      if(gmail.check.is_preview_pane() &&
        $(this).next().next().find(".apB .apu .sgn").length){
          //marked in preview pane
          var dummy = 1;
      }
      else{
        var email_id = $(this).attr("sgn_email_id");
        requestList.push(email_id);
      }
    });

    if(requestList.length  == 0){
      debugLog("no need to pull rows");
      return;
    }

    debugLog("Simple-gmail-notes: pulling notes");
    g_pnc += 1;
    if(!acquireNetworkLock()){
      debugLog("pullNotes failed to get network lock");
      return;
    }

    sendEventMessage("SGN_pull_notes",
                     {email: gmail.get.user_email(), requestList:requestList});
    gDebugInfoSummary = "Last Summary Page URL: " + window.location.href;
    gDebugInfoSummary += "\nIs Vertical Split: " + gmail.check.is_vertical_split();
    gDebugInfoSummary += "\nIs Horizontal Split: " + gmail.check.is_horizontal_split();
    gDebugInfoSummary += "\nIs Preview Pane: " + gmail.check.is_preview_pane();
    gDebugInfoSummary += "\nIs Multiple Inbox: " + gmail.check.is_multiple_inbox();
    sendDebugInfo();
  }

  var main = function(){
    gmail = new Gmail(localJQuery);

    gmail.observe.on('open_email', function(obj){
      debugLog("simple-gmail-notes: open email event", obj);
      g_oec += 1;
      setupNoteEditor();
    });

    gmail.observe.on('load', function(obj){
      debugLog("simple-gmail-notes: load event");
      g_lc += 1;
      setupNoteEditor();
    });

    //id is always undefined
    gmail.observe.after('http_event', function(params, id, xhr) {
      debugLog("xhr:", xhr);
      updateEmailIdByJSON(xhr.responseText);
    });

    document.addEventListener('SGN_PAGE_heart_beat_response', function(e) {
      gLastHeartBeat = Date.now();
    });

    //use current DOM to update email ID of first page
    for(var i=0; i<document.scripts.length; i++){
      updateEmailIdByDOM(document.scripts[i].text);
    }

    setTimeout(pullNotes, 0);
    setInterval(pullNotes, 2000);
    setInterval(setupNoteEditor, 1770); //better not to overlapp to much with the above one
    setInterval(sendHeartBeat, 1400);

    //mainly for debug purpose
    SimpleGmailNotes.gmail = gmail;
  }

  main();

}(window.SimpleGmailNotes = window.SimpleGmailNotes || {}, jQuery.noConflict(true)));

} //end of SimpleGmailNotes.start

SimpleGmailNotes.start();
