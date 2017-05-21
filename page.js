/*
 * Simple Gmail Notes
 * https://github.com/walty8
 * Copyright (C) 2017 Walty Yeung <walty@bart.com.hk>
 * License: GPLv3
 *
 * This script is going to be shared for both Firefox and Chrome extensions.
 */

SimpleGmailNotes.gdriveEmail = "";
SimpleGmailNotes.preferences = {};

SimpleGmailNotes.refresh = function(f){
    if( (/in/.test(document.readyState)) || (undefined === window.Gmail) || 
        (undefined === window.jQuery) ) {
      setTimeout(SimpleGmailNotes.refresh, 10, f);
    }
    else {
      f();
    }
};


SimpleGmailNotes.start = function(){

(function(SimpleGmailNotes, localJQuery){
  var $ = localJQuery;

  /* global variables (inside the closure)*/
  var sgnGmailDom;
  var sgnGmailPage;
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
  };

  var sendEventMessage = function(eventName, eventDetail){
    if(eventDetail === undefined){
      eventDetail = {};
    }

    eventDetail.email = sgnGmailPage.userEmail();
    document.dispatchEvent(new CustomEvent(eventName,  {detail: eventDetail}));
  };


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

  var getMessageId = function(){
    var messageId = '';
    if(sgnGmailDom.isPreviewPane()){
      var idNode = $("tr.zA.aps:visible[sgn_email_id]").first();

      if(idNode.length){
        messageId = idNode.attr("sgn_email_id");
      }else{
        messageId = "PREVIEW";
      }
    }

      if(!messageId){
          messageId = sgnGmailDom.emailId();
      }
      if(!messageId){
          addErrorToLog("message not found");
          return;
      }
      return messageId;
  };

  var deleteNote = function(){
      sendEventMessage('delete', {messageId: getMessageId()});
  };

  var resetPreferences = function(){
      sendEventMessage('reset_preferences');
  };

  var sendPreference = function(preferenceType, preferenceValue){
      sendEventMessage('send_preference',
        {preferenceType: preferenceType, preferenceValue: preferenceValue});
  };

  var sendDebugInfo = function(){
    var debugInfo = "Browser Version: " + navigator.userAgent + "\n" + 
                    gDebugInfoSummary + "\n" + gDebugInfoDetail + 
                    "\nPE:" + gDebugInfoErrorTrace;
    sendEventMessage('SGN_update_debug_page_info', {debugInfo:debugInfo});
  };

  var heartBeatAlertSent = false;

  var sendHeartBeat = function(){
    sendEventMessage("SGN_heart_beat_request");
    var warningMessage = SimpleGmailNotes.offlineMessage;

    if(isBackgroundDead()){
      var warningNode = $("<div class='sgn_inactive_warning'><div>" + 
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
      else{  //gmail page
        var hookNode = $("#\\:5");
        if(hookNode.find("> .sgn_inactive_warning").length === 0){
          $("#\\:5").append(warningNode);
        }
      }

      var inputNode = $(".sgn_input:visible");
      if(inputNode.length){
          //there is something wrong with the extension
          inputNode.prop("disabled", true);
          /*
          var previousVal = $(".sgn_input").val();
          if(previousVal.indexOf(warningMessage)< 0){
            inputNode.css("background-color", "")
                     .css("font-size", "")
                     .css("color", "red");
            //just in case the user has put some note at that moment
            inputNode.val(warningMessage + "\n\n--\n\n" + previousVal); 
          }
        */
      }
      else {
        if(!heartBeatAlertSent && isLoggedIn()){
          //alert(warningMessage);    
          //may be do it later, the checking of current page 
          //is still a bit tricky
          //the alert is quite annoying, only do it once
          heartBeatAlertSent = true;  
        }
      }
    }
    else {  
      //back ground is alive
      if($(".sgn_inactive_warning").length){
        $(".sgn_inactive_warning").remove();
        if($(".sgn_input").is(":visible")){
          setupNoteEditorCatchingError();
        }

      }

    }

  };

  var isBackgroundDead = function(){
      var thresholdTime = 5;
      var currentTime = Date.now();
      //copy out to avoid race condition
      var lastHeartBeat = SimpleGmailNotes.lastHeartBeat; 
      if(SimpleGmailNotes.isDebug())
        thresholdTime = 300;

      var isDead = (currentTime - lastHeartBeat > thresholdTime * 1000);
      if(isDead){
        debugLog("background died");
      }

      return isDead;
  };

  var htmlEscape = function(str) {
      return String(str)
              .replace(/&/g, '&amp;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#39;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');
  };

  var specialCharRe = new RegExp(String.fromCharCode(160), 'g');
  var stripHtml = function(value){
    return value.replace(/<(?:.|\n)*?>/gm, '')
                .replace(specialCharRe, ' ');
  };

  var getEmailKey = function(title, sender, time, excerpt){
    var emailKey = sender + "|" + time + "|" + stripHtml(title) + "|" + stripHtml(excerpt);

    debugLog("@209, generalted email key:" + emailKey);

    //in case already escaped
    emailKey = htmlEscape(emailKey);
    return emailKey;
  };

  // === GMAIL ONLY FUNCTION START ===
  var getGmailNodeTitle = function(mailNode){
    var hook = $(mailNode).find(".xT .y6");

    if(!hook.length)  //vertical split view
      hook = $(mailNode).next().find(".xT .y6");

    return hook.find("span").first().text();
  };

  var getGmailNodeTime = function(mailNode) {
    var hook = $(mailNode).find(".xW");

    if(!hook.length)  //vertical split view
      hook = $(mailNode).find(".apm");

    return hook.find("span").last().attr("title");
  };

  var getGmailNodeSender = function(mailNode) {
    return mailNode.find(".yW .yP, .yW .zF").last().attr("email");
  };

  var getGmailNodeExcerpt = function(mailNode){
    var excerpt = "";

    if($(mailNode).find(".xW").length){ //normal view
      excerpt = $(mailNode).find(".xT .y2").text().substring(3);  //remove " - "
    }
    else{ //vertical view
      excerpt = $(mailNode).next().next().find(".xY .y2").text();
    }

    return excerpt;
  };

  var getEmailKeyGmailNode = function(mailNode){
    var title = getGmailNodeTitle(mailNode);
    var sender = getGmailNodeSender(mailNode);
    var time = getGmailNodeTime(mailNode);
    var excerpt = getGmailNodeExcerpt(mailNode);
    var emailKey = getEmailKey(title, sender, time, excerpt);

    debugLog("@249, email key:" + emailKey);

    return emailKey;
  };
  // === GMAIL ONLY FUNCTIONS END ===

  // I needed the opposite function today, so adding here too:
  var htmlUnescape = function(value){
      return String(value)
          .replace(/&nbsp;/g, ' ')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&');
  };


  var isNumeric = function(str){
    var code, i, len;

    for (i = 0, len = str.length; i < len; i++) {
      code = str.charCodeAt(i);
      if (!(code > 47 && code < 58)){ // numeric (0-9)
        return false;
      }
    }
    return true;
  };

  var _dec2hexCached = {};
  //http://stackoverflow.com/questions/18626844/convert-a-large-integer-to-a-hex-string-in-javascript
  var dec2hex = function(str){ // .toString(16) only works up to 2^53
    if(_dec2hexCached[str])
      return _dec2hexCached[str];

    var dec = str.toString().split(''), sum = [], hex = [], i, s;
    while(dec.length){
        s = 1 * dec.shift();
        for(i = 0; s || i < sum.length; i++){
            s += (sum[i] || 0) * 10;
            sum[i] = s % 16;
            s = (s - sum[i]) / 16;
        }
    }
    while(sum.length){
        hex.push(sum.pop().toString(16));
    }

    var result = hex.join('');
    _dec2hexCached[str] = result;

    return result;
  }; 

  var getInboxEmailId = function(actionData){
    var messageId = $.parseJSON(actionData)[0][1][0];
    messageId = messageId.split(":")[1];
    //http://stackoverflow.com/questions/57803/how-to-convert-decimal-to-hex-in-javascript
    messageId = dec2hex(messageId);

    return messageId;
  };

  var setupSidebarLayout = function(containerNode){
    var logo = containerNode.find(".sgn_bart_logo");

    containerNode.append(logo);
  };

  var updateGmailNotePosition = function(injectionNode, notePosition){
    if(notePosition == "bottom"){
      debugLog("@485, move to bottom");
      $(".nH.aHU").append(injectionNode);
    } else if(notePosition == "side-top") {
      //$(".nH.adC").prepend(firstVisible);
      setupSidebarLayout(injectionNode);
      SimpleGmailNotes.getSidebarNode().prepend(injectionNode);
    } else if(notePosition == "side-bottom") {
      //$(".nH.adC .nH .u5").before(firstVisible);
      setupSidebarLayout(injectionNode);
      SimpleGmailNotes.getSidebarNode().append(injectionNode);
    } else {  //top
      $(".nH.if").prepend(injectionNode);  //hopefully this one is stable
    }
  };


  //set up note editor in the email detail page
  var setupNoteEditor = function(){
    if($(".sgn_container:visible").length)  //text area already exist
    {
      addErrorToLog("textarea already exists");
      return;
    }

    var injectionNode = $("<div class='sgn_container'></div>");
    var subject, messageId;

    if(SimpleGmailNotes.isInbox()){
      var hookNode = $(".gT.s2:visible");
      
      if(!hookNode.length)
        return;

      injectionNode.addClass("sgn_inbox");

      var actionData = hookNode.parent().attr("data-action-data");
      subject = hookNode.parent().text();
      messageId = getInboxEmailId(actionData);

      debugLog("@317: " + messageId);

      injectionNode.on("click", function(event){
        //click of texarea would close the email 
        event.stopPropagation();
      });

      hookNode.before(injectionNode);  //hopefully this one is stable
    }
    else{
      subject = $(".ha h2.hP:visible").text();
      messageId = getMessageId();

      var notePosition = "top";
      if(SimpleGmailNotes.preferences){
        notePosition = SimpleGmailNotes.preferences["notePosition"];
      }
      updateGmailNotePosition(injectionNode, notePosition);

      gDebugInfoDetail = "Is Conversation View: " + sgnGmailPage.isConversationView();
    }

    injectionNode.show();
    sendDebugInfo();

    //text area failed to create, may cause dead loop
    if(!$(".sgn_container:visible").length)  
    {
        addErrorToLog("Injection node failed to be found");
        return;
    }

    if(!acquireNetworkLock()){
        addErrorToLog("Network lock failed");
        debugLog("setupNoteEditor failed to get network lock");
        return;
    }

    sendEventMessage('SGN_setup_email_info', {messageId:messageId, subject:subject});
    sendEventMessage('SGN_setup_note_editor', {messageId:messageId});

    addErrorToLog("set up request sent");
    sendDebugInfo();

  };

  var updateEmailIdByJSON = function(dataString){
    var startString = ")]}'\n\n";
    var totalLength = dataString.length;

    if(dataString.substring(0, startString.length) != startString){
      //not a valid view data string
      return;
    }

    var strippedString = dataString.substring(startString.length);

    var lineList = dataString.split("\n");
    var email_list = [];
    var i;

    if(lineList.length == 3){  //JSON data
        if(dataString.substring(totalLength-1, totalLength) != ']'){
          //not a valid format
          return;
        }

        var emailData;
        //new email arrived for priority inbox view
        if(strippedString.indexOf('["tb"') > 0){ 
          emailData = $.parseJSON(strippedString);
          email_list = sgnGmailPage.parseViewData(emailData[0]);
        }
        else if(strippedString.indexOf('["stu"') > 0){
          var newData = [];
          emailData = $.parseJSON(strippedString);
          emailData = emailData[0];

          if(emailData[7] && emailData[7].length >= 3 && 
             emailData[7][0] == "stu" && 
             emailData[7][2] && emailData[7][2].length){
             var tempData = emailData[7][2];
             //to wrap up into a format that could be parsed by parseViewData
             for(i=0; i<tempData.length; i++){
                newData.push(["tb", "", [tempData[i][1]]]);
             }
          }

          email_list = sgnGmailPage.parseViewData(newData);
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

      for(i=3; i<lineList.length; i++){
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

      email_list = sgnGmailPage.parseViewData(resultList);
    }

    for(i=0; i < email_list.length; i++){
      var email = email_list[i];
      var emailKey = getEmailKey(htmlUnescape(email.title), email.sender, email.time, htmlUnescape(email.excerpt));
      gEmailIdDict[emailKey] = email;
    }
  };

  var updateEmailIdByDOM = function(dataString){
    var totalLength = dataString.length;
    var signatureString = "var GM_TIMING_START_CHUNK2=";

    //for better performance
    if(!dataString.startsWith(signatureString)){
      return;
    }

    if(dataString.indexOf("var VIEW_DATA=") < 0){
      return;
    }

    var startIndex = dataString.indexOf("[");
    var endIndex = dataString.lastIndexOf("]");

    if(startIndex < 0 || endIndex < 0 )
      return;

    var strippedString = dataString.substring(startIndex, endIndex+1);

    var viewData = $.parseJSON(strippedString);

    var email_list = sgnGmailPage.parseViewData(viewData);

    for(var i=0; i< email_list.length; i++){
      var email = email_list[i];
      var emailKey = getEmailKey(htmlUnescape(email.title), email.sender, email.time, htmlUnescape(email.excerpt));
      gEmailIdDict[emailKey] = email;
    }

  };


  var lastPullDiff = 0;
  var lastPullHash = null;
  var lastPullItemRange = null;
  var lastPendingCount = 0;

  var lastAbstractSignature = "";
  SimpleGmailNotes.duplicateRequestCount = 0;

  var pullNotes = function(){
    if(!SimpleGmailNotes.isInbox() && 
       (!$("tr.zA").length ||
         (sgnGmailDom.isInsideEmail() && !sgnGmailDom.isPreviewPane()))){
      addErrorToLog("pull skipped");
      debugLog("Skipped pulling because no tr to check with");
      return;  
    }

    gDebugInfoSummary = "Last Summary Page URL: " + window.location.href;
    gDebugInfoSummary += "\nIs Vertical Split: " + sgnGmailDom.isVerticalSplit();
    gDebugInfoSummary += "\nIs Horizontal Split: " + sgnGmailDom.isHorizontalSplit();
    gDebugInfoSummary += "\nIs Preview Pane: " + sgnGmailDom.isPreviewPane();
    gDebugInfoSummary += "\nIs Multiple Inbox: " + sgnGmailDom.isMultipleInbox();
    sendDebugInfo();

    if(isBackgroundDead()){
      addErrorToLog("background is dead.");
      return; //no need to pull
    }


    var visibleRows;
     
    if(SimpleGmailNotes.isInbox()){
      visibleRows = $(".an.b9[data-action-data]:visible");
    }
    else{
      visibleRows = $("tr.zA[id]:visible");
    }

    var unmarkedRows = visibleRows.filter(":not([sgn_email_id])");
    //rows that has been marked, but has no notes

    var pendingRows = $([]);
    
    if(sgnGmailDom.isPreviewPane()){
      visibleRows.each(function(){
        if($(this).next().next().is(":not(:has(div.sgn))"))
          pendingRows = pendingRows.add($(this));
      });
    }
    else
      pendingRows = visibleRows.filter("[sgn_email_id]:not(:has(.sgn))");

    var thisPullDiff = visibleRows.length - unmarkedRows.length;
    var thisPullHash = window.location.hash;
    var thisPullItemRange = $(".Di .Dj:visible").text();
    var thisPendingCount = pendingRows.length;

    debugLog("@104", visibleRows.length, unmarkedRows.length, thisPullDiff);

    var thisAbstractSignature = thisPullDiff + "|" + thisPullHash + "|" + 
                                thisPullItemRange + "|" + thisPendingCount;

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

    if(unmarkedRows.length === 0 && pendingRows.length === 0){
      addErrorToLog("no need to check");
      return;
    }

    debugLog("@104, total unmarked rows", unmarkedRows.length);
    //mark the email ID for each row
    unmarkedRows.each(function(){
      if(SimpleGmailNotes.isInbox()){
        var actionData = $(this).attr("data-action-data");
        var email_id = getInboxEmailId(actionData);
        $(this).attr("sgn_email_id", email_id);
      }
      else{
        var emailKey = getEmailKeyGmailNode($(this));
        var email = gEmailIdDict[emailKey];
        if(email){
          //add email id to the TR element
          $(this).attr("sgn_email_id", email.id);
        }
      }
    });

    if(!isLoggedIn()){
      addErrorToLog("not logged in, skipped pull requests");
      SimpleGmailNotes.duplicateRequestCount = 0;
      return;
    }

    var requestList = [];
    pendingRows.each(function(){
      if(sgnGmailDom.isPreviewPane() &&
        $(this).next().next().find(".apB .apu .sgn").length){
          //marked in preview pane
          var dummy = 1;
      }
      else{ //this apply to both normal gmail and inbox view
        var email_id = $(this).attr("sgn_email_id");
        if(email_id)
          requestList.push(email_id);
      }
    });



    /*
    lastPullDiff = thisPullDiff;
    lastPullHash = thisPullHash;
    lastPullItemRange = thisPullItemRange;
    lastPendingCount = thisPendingCount;
    */


    if(requestList.length === 0){
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
                     {email: sgnGmailPage.userEmail(), requestList:requestList});


    addErrorToLog("pull request sent");
    sendDebugInfo();
  };

  var isLoggedIn = function(){
    return SimpleGmailNotes.gdriveEmail && SimpleGmailNotes.gdriveEmail !== "";
  };

  var addErrorToLog = function(err){
    if(gDebugInfoErrorTrace.length > 4096)  //better to give a limit 
      return;

    var result = "";

    if(err.message)
      result += err.message + ":\n";

    if(err.stack)
      result += err.stack + "\n--\n\n";

    if(!result)
      result += "[" + err + "]";  //this would cast err to string

    if(gDebugInfoErrorTrace.indexOf(result) < 0) //do not repeatly record
      gDebugInfoErrorTrace += result;
  };

  //I have to use try/catch instead of window.onerror because of restriction of same origin policy: 
  //http://stackoverflow.com/questions/28348008/chrome-extension-how-to-trap-handle-content-script-errors-globally
  var pullNotesCatchingError = function(){
    try{
      pullNotes();
    }
    catch(err){
      addErrorToLog(err);
    }
  };

  var setupNoteEditorCatchingError = function(){
    setTimeout(function(){
      try{
        setupNoteEditor();
      }
      catch(err){
        addErrorToLog(err);
      }
    }, 0);
  };

  var sendHeartBeatCatchingError = function(){
    try{
      sendHeartBeat();
    }
    catch(err){
      addErrorToLog(err);
    }
  };

  var main = function(){
    SimpleGmailNotes.$ = $;

    //sgnGmailDom = new SimpleGmailNotes_Gmail(localJQuery);
    sgnGmailDom = new SGNGmailDOM(localJQuery);

    var sgnGmailPageOptions = {
      openEmailCallback: function(){  //no effect for inbox
        debugLog("simple-gmail-notes: open email event", obj);
        g_oec += 1;
        setupNoteEditorCatchingError();
      },
      httpEventCallback: function(params, responseText, readyState) { //no effect for inbox
        //debugLog("xhr:", xhr);
        updateEmailIdByJSON(responseText);
      },
      onloadCallback: function(){
        debugLog("simple-gmail-notes: load event");
        g_lc += 1;
        setupNoteEditorCatchingError();
      },
    };


    sgnGmailPage = new SGNGmailPage(localJQuery, sgnGmailPageOptions);

    /*
    sgnGmailDom.observe.on('open_email', function(obj){
      debugLog("simple-gmail-notes: open email event", obj);
      g_oec += 1;
      setupNoteEditorCatchingError();
    });

    sgnGmailDom.observe.on('load', function(obj){
      debugLog("simple-gmail-notes: load event");
      g_lc += 1;
      setupNoteEditorCatchingError();
    });

    //id is always undefined
    sgnGmailDom.observe.after('http_event', function(params, id, xhr) {
      debugLog("xhr:", xhr);
      updateEmailIdByJSON(xhr.responseText);
    });

    */
    document.addEventListener('SGN_PAGE_heart_beat_response', function(e) {
      SimpleGmailNotes.lastHeartBeat = Date.now();
      SimpleGmailNotes.gdriveEmail = JSON.parse(e.detail);
    });

    document.addEventListener('SGN_PAGE_update_preferences', function(e){
      var preferences = JSON.parse(e.detail);

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
        $(".sgn_current_connection").css("font-size", fontSize + "pt");
      }
      fontSize = parseInt($(".sgn_input").css("font-size"));

      var noteHeight = preferences["noteHeight"];
      if(SimpleGmailNotes.isInbox())
        noteHeight = 4;

      noteHeight = parseInt(noteHeight);
      if(noteHeight){
        $(".sgn_input").css("height", noteHeight * fontSize * 1.2 + 6 + "px");
      }


      var firstVisible = $(".sgn_container:visible").first();
      //avoid duplicates
      $(".sgn_container").hide();
      firstVisible.show();

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
      SimpleGmailNotes.preferences = e.detail;
    });

    //use current DOM to update email ID of first page
    for(var i=0; i<document.scripts.length; i++){
      updateEmailIdByDOM(document.scripts[i].text);
    }

    setTimeout(pullNotesCatchingError, 0);
    setInterval(pullNotesCatchingError, 2000);
    //better not to overlapp to much with the above one
    setInterval(setupNoteEditorCatchingError, 1770); 
    setInterval(sendHeartBeatCatchingError, 1400);


    setInterval(sendDebugInfo, 3000); //update debug info to back side

    //mainly for debug purpose
    SimpleGmailNotes._sgnGmailDom = sgnGmailDom;
    SimpleGmailNotes._sgnGmailPage = sgnGmailPage;
    SimpleGmailNotes._sendPreference = sendPreference;
    SimpleGmailNotes._resetPreferences = resetPreferences;
    SimpleGmailNotes._deleteNote = deleteNote;
  };

  main();

}(window.SimpleGmailNotes = window.SimpleGmailNotes || 
                            {}, jQuery.noConflict(true)));

}; //end of SimpleGmailNotes.start

SimpleGmailNotes.start();

