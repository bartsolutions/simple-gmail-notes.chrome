/*
 * Simple Gmail Notes
 * https://github.com/walty8
 * Copyright (C) 2015 Walty Yeung <walty8@gmail.com>
 *
 * This script is going to be shared for both Firefox and Chrome extensions.
 */

window.SimpleGmailNotes = window.SimpleGmailNotes || {};

SimpleGmailNotes.gdriveEmail = "";

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
  var gDebugInfoErrorTrace = "";
  //followings are for network request locking control
  var gLastPullTimestamp = null;
  var gNextPullTimestamp = null;
  var gConsecutiveRequests = 0;
  var gConsecutiveStartTime = 0;
  var g_oec = 0;    //open email trigger count
  var g_lc = 0;     //local trigger count
  var g_pnc = 0;    //pulled network trigger count

  SimpleGmailNotes.startHeartBeat = Date.now();
  SimpleGmailNotes.lastHeartBeat = SimpleGmailNotes.startHeartBeat;
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

        var message = "20 consecutive network requests detected from Simple Gmail Notes, the extension would be self-disabled for 60 seconds.\n\n" +
											"Please try to close and reopen the browser to clear the cache of extension. " + 
                      "If the problem persists, please consider to disable/uninstall this extension to avoid locking of your Gmail account. " +
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
    var debugInfo = "Browser Version: " + navigator.userAgent + "\n" + gDebugInfoSummary + "\n" + gDebugInfoDetail + "\nPE:" + gDebugInfoErrorTrace
    sendEventMessage('SGN_update_debug_page_info', {debugInfo:debugInfo});
  }

  var heartBeatAlertSent = false;

  var sendHeartBeat = function(){
    sendEventMessage("SGN_heart_beat_request");
    var warningMessage = SimpleGmailNotes.offlineMessage;

    if(isBackgroundDead()){
      if($(".sgn_input").is(":visible")){
          //there is something wrong with the extension
          $(".sgn_input").prop("disabled", true);
          var previousVal = $(".sgn_input").val();
          if(previousVal.indexOf(warningMessage)< 0){
            $(".sgn_input").css("background-color", "").css("font-size", "").css("color", "red");
            $(".sgn_input").val(warningMessage + "\n\n--\n\n" + previousVal); //just in case the user has put some note at that moment
          }
      }
      else {
        if(!heartBeatAlertSent && isLoggedIn()){
          //alert(warningMessage);    //may be do it later, the checking of current page is still a bit tricky
          heartBeatAlertSent = true;  //the alert is quite annoying, only do it once
        }
      }
    }
    else {  //back ground is alive
      if($(".sgn_input").is(":visible") && $(".sgn_input").val().indexOf(warningMessage) == 0){
        //network is just recovered
        $(".sgn_container:visible").remove();
        setupNoteEditorCatchingError();
      }
    }

  }

  var isBackgroundDead = function(){
      var currentTime = Date.now();
      var lastHeartBeat = SimpleGmailNotes.lastHeartBeat; //copy out to avoid race condition
      var isDead = (currentTime - lastHeartBeat > 5000);
      if(isDead){
        debugLog("background died");
      }

      return isDead;
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
    if($(".sgn_container:visible").length)  //text area already exist
    {
        addErrorToLog("textarea already exists");
        return;
    }

    var subject = $(".ha h2.hP:visible").text();
    var messageId = "";

    if(gmail.check.is_preview_pane()){
        var idNode = $("tr.zA.aps:visible[sgn_email_id]").first();
        if(idNode.length)
            messageId = idNode.attr("sgn_email_id");
    }

    if(!messageId)
        messageId = gmail.get.email_id();

    if(!messageId){  //do nothing
        addErrorToLog("message not found");
        return;
    }

    gDebugInfoDetail = "Is Conversation View: " + gmail.check.is_conversation_view();
    sendDebugInfo();

    var injenctionNode = $("<div></div>", { "class" : "sgn_container" }); 
    $(".nH.if").prepend(injenctionNode);  //hopefully this one is stable
    injenctionNode.show();

    if(!$(".sgn_container:visible").length)  //text area failed to create, may cause dead loop
    {
        addErrorToLog("Injection node failed to be found");
        return;
    }

    if(!acquireNetworkLock()){
        addErrorToLog("Network lock failed");
        debugLog("setupNoteEditor failed to get network lock");
        return;
    }

    sendEventMessage('SGN_setup_note_editor', {messageId:messageId});
    sendEventMessage('SGN_setup_email_info', {messageId:messageId, subject:subject});

    addErrorToLog("set up request sent");
    sendDebugInfo();

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
          var emailData = $.parseJSON(strippedString);
          email_list = gmail.tools.parse_view_data(emailData[0]);
        }
        else if(strippedString.indexOf('["stu"') > 0){
          var emailData = $.parseJSON(strippedString);
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

        if(line.indexOf('["tb"') < 0){
          continue;
        }

        var tempList = $.parseJSON(line);

        for(var j=0; j<tempList.length; j++){
          if(tempList[j][0] == 'tb'){
            resultList.push(tempList[j]);
          }
        }

        //resultList.push(tempList[0]);
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

    var viewData = $.parseJSON(strippedString);

    var email_list = gmail.tools.parse_view_data(viewData);

    for(var i=0; i< email_list.length; i++){
      var email = email_list[i];
      var emailKey = getEmailKey(email.title, email.sender, email.time);
      gEmailIdDict[emailKey] = email;
    }

    var temp = 0;
  }


  var lastPullDiff = 0;
  var lastPullHash = null;
  var lastPullItemRange = null;
  var lastPendingCount = 0;

  var lastAbstractSignature = "";
  SimpleGmailNotes.duplicateRequestCount = 0;

  var pullNotes = function(){
    if(!$("tr.zA").length ||
       (gmail.check.is_inside_email() && !gmail.check.is_preview_pane())){
      addErrorToLog("pull skipped");
      debugLog("Skipped pulling because no tr to check with");
      return;  
    }

    gDebugInfoSummary = "Last Summary Page URL: " + window.location.href;
    gDebugInfoSummary += "\nIs Vertical Split: " + gmail.check.is_vertical_split();
    gDebugInfoSummary += "\nIs Horizontal Split: " + gmail.check.is_horizontal_split();
    gDebugInfoSummary += "\nIs Preview Pane: " + gmail.check.is_preview_pane();
    gDebugInfoSummary += "\nIs Multiple Inbox: " + gmail.check.is_multiple_inbox();
    sendDebugInfo();

    if(isBackgroundDead()){
      addErrorToLog("background is dead.");
      return; //no need to pull
    }

    if(!isLoggedIn()){
      addErrorToLog("not logged in.");
      SimpleGmailNotes.duplicateRequestCount = 0;
      return;
    }

    var visibleRows = $("tr.zA[id]:visible");
    var unmarkedRows = visibleRows.filter(":not([sgn_email_id])");
    //rows that has been marked, but has no notes
    var pendingRows = visibleRows.filter("[sgn_email_id]:not(:has(div.sgn))");

    var thisPullDiff = visibleRows.length - unmarkedRows.length;
    var thisPullHash = window.location.hash;
    var thisPullItemRange = $(".Di .Dj:visible").text();
    var thisPendingCount = pendingRows.length;

    debugLog("@104", visibleRows.length, unmarkedRows.length, thisPullDiff);

    var thisAbstractSignature = thisPullDiff + "|" + thisPullHash + "|" + thisPullItemRange + "|" + thisPendingCount;

    /*
    if(thisPullDiff == lastPullDiff 
         && thisPullHash == lastPullHash
         && thisPullItemRange == lastPullItemRange
         && thisPendingCount == lastPendingCount){
      debugLog("Skipped pulling because of duplicate network requests");
      return;
    }
    */


    if(thisAbstractSignature == lastAbstractSignature){
      SimpleGmailNotes.duplicateRequestCount += 1;
    }
    else
      SimpleGmailNotes.duplicateRequestCount = 0;

    if(SimpleGmailNotes.duplicateRequestCount > 3){
      addErrorToLog("3 duplicate requests");
      return; //danger, may be endless loop here
    }

    if(unmarkedRows.length == 0 && pendingRows.length == 0){
      addErrorToLog("no need to check");
      return;
    }

    debugLog("@104, total unmarked rows", unmarkedRows.length);
    unmarkedRows.each(function(){
      var emailKey = getEmailKeyFromNode($(this));
      var email = gEmailIdDict[emailKey];
      if(email){
        //add email id to the TR element
        $(this).attr("sgn_email_id", email.id);
      }
    });

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



    /*
    lastPullDiff = thisPullDiff;
    lastPullHash = thisPullHash;
    lastPullItemRange = thisPullItemRange;
    lastPendingCount = thisPendingCount;
    */


    if(requestList.length  == 0){
      debugLog("no need to pull rows");
      addErrorToLog("no need to pull rows");
      return;
    }


    //this line MUST be above acquireNetworkLock, otherwise it would be point less
    lastAbstractSignature = thisAbstractSignature;

    debugLog("Simple-gmail-notes: pulling notes");
    g_pnc += 1;
    //the lock must be acaquired right before the request is issued
    if(!acquireNetworkLock()){
      addErrorToLog("pullNotes failed to get network lock");
      return;
    }

    sendEventMessage("SGN_pull_notes",
                     {email: gmail.get.user_email(), requestList:requestList});


    addErrorToLog("pull request sent");
    sendDebugInfo();
  }

  var isLoggedIn = function(){
    return SimpleGmailNotes.gdriveEmail && SimpleGmailNotes.gdriveEmail != ""
  }

  var addErrorToLog = function(err){
    if(gDebugInfoErrorTrace.length > 4096)  //better to give a limit 
      return;

    var result = "";

    if(err.message)
      result += err.message + ":\n"

    if(err.stack)
      result += err.stack + "\n--\n\n"

    if(!result)
      result += "[" + err + "]";  //this would cast err to string

    if(gDebugInfoErrorTrace.indexOf(result) < 0) //do not repeatly record
      gDebugInfoErrorTrace += result;
  }

  //I have to use try/catch instead of window.onerror because of restriction of
  //of same origin policy: http://stackoverflow.com/questions/28348008/chrome-extension-how-to-trap-handle-content-script-errors-globally
  var pullNotesCatchingError = function(){
    try{
      pullNotes();
    }
    catch(err){
      addErrorToLog(err)
    }
  }

  var setupNoteEditorCatchingError = function(){
    setTimeout(function(){
      try{
        setupNoteEditor();
      }
      catch(err){
        addErrorToLog(err)
      }
    }, 0);
  }

  var sendHeartBeatCatchingError = function(){
    try{
      sendHeartBeat();
    }
    catch(err){
      addErrorToLog(err)
    }
  }

  var main = function(){
    gmail = new Gmail(localJQuery);

    gmail.observe.on('open_email', function(obj){
      debugLog("simple-gmail-notes: open email event", obj);
      g_oec += 1;
      setupNoteEditorCatchingError();
    });

    gmail.observe.on('load', function(obj){
      debugLog("simple-gmail-notes: load event");
      g_lc += 1;
      setupNoteEditorCatchingError();
    });

    //id is always undefined
    gmail.observe.after('http_event', function(params, id, xhr) {
      debugLog("xhr:", xhr);
      updateEmailIdByJSON(xhr.responseText);
    });

    document.addEventListener('SGN_PAGE_heart_beat_response', function(e) {
      SimpleGmailNotes.lastHeartBeat = Date.now();
      SimpleGmailNotes.gdriveEmail = e.detail;
    });

    //use current DOM to update email ID of first page
    for(var i=0; i<document.scripts.length; i++){
      updateEmailIdByDOM(document.scripts[i].text);
    }

    setTimeout(pullNotesCatchingError, 0);
    setInterval(pullNotesCatchingError, 2000);
    setInterval(setupNoteEditorCatchingError, 1770); //better not to overlapp to much with the above one
    setInterval(sendHeartBeatCatchingError, 1400);


    setInterval(sendDebugInfo, 3000); //update debug info to back side

    //mainly for debug purpose
    SimpleGmailNotes.gmail = gmail;
  }

  main();

}(window.SimpleGmailNotes = window.SimpleGmailNotes || {}, jQuery.noConflict(true)));

} //end of SimpleGmailNotes.start

SimpleGmailNotes.start();


