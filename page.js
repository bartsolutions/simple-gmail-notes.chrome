/*
 * Simple Gmail Notes
 * https://github.com/walty8
 * Copyright (C) 2017 Walty Yeung <walty@bart.com.hk>
 * License: GPLv3
 *
 * This script is going to be shared for both Firefox and Chrome extensions.
 */

var gIsWindowFocused;
$(window).focus(function() {
  gIsWindowFocused = true;
}).blur(function() {
  gIsWindowFocused = false;
});

SimpleGmailNotes.start = function(){

(function(SimpleGmailNotes, localJQuery){
  var $ = localJQuery;

  /* global variables (inside the closure)*/
  var sgnGmailDom;
  var sgnGmailPage;
  var gEmailIdDict = {};
  var gDebugInfoDetail = "";
  var gDebugInfoSummary = "";
  //var gDebugInfoErrorTrace = "";
  //followings are for network request locking control
  var sgn = SimpleGmailNotes;

  sgn.gdriveEmail = "";
  sgn.preferences = {};
  sgn.startHeartBeat = Date.now();
  sgn.lastHeartBeat = sgn.startHeartBeat;
  /* -- end -- */
 
  //send message to content script
  var sendContentMessage = function(eventName, eventDetail){
    if(eventDetail === undefined){
      eventDetail = {};
    }

    eventDetail.email = sgnGmailPage.userEmail();
    document.dispatchEvent(new CustomEvent(eventName,  {detail: eventDetail}));
  };

  //utils
  var debugLog = function()
  {
    if (sgn.isDebug()) {
        console.log.apply(console, arguments);
    }
  };

  var debugDeleteNote = function(){
      sendContentMessage('delete', {messageId: getCurrentMessageId()});
  };

  var debugResetPreferences = function(){
      sendContentMessage('reset_preferences');
  };

  var debugSendPreference = function(preferenceType, preferenceValue){
      sendContentMessage('send_preference',
        {preferenceType: preferenceType, preferenceValue: preferenceValue});
  };

  var sendDebugInfo = function(){
    var debugInfo = "Browser Version: " + navigator.userAgent + "\n" + 
                    gDebugInfoSummary + "\n" + gDebugInfoDetail + 
                    "\nPE:" + sgn.debugLog;
    sendContentMessage('SGN_update_debug_page_info', {debugInfo:debugInfo});
  };


  var htmlEscape = function(str) {
      return String(str)
              .replace(/&/g, '&amp;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#39;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');
  };

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


  var specialCharRe = new RegExp(String.fromCharCode(160), 'g');
  var stripHtml = function(value){
    return value.replace(/<(?:.|\n)*?>/gm, '')
                .replace(specialCharRe, ' ');
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


	
  //heartbeat checking, background script will die after long idle / upgrade
  var isBackgroundDead = function(){
      var thresholdTime = 8;
      var currentTime = Date.now();
      //copy out to avoid race condition
      var lastHeartBeat = sgn.lastHeartBeat; 
      if(sgn.isDebug())
        thresholdTime = 300;

      var isDead = (currentTime - lastHeartBeat > thresholdTime * 1000);
      if(isDead){
        debugLog("background died");
      }

      return isDead;
  };

  var heartBeatAlertSent = false;
  var sendHeartBeat = function(){
  sgn.executeCatchingError(function(){
    sendContentMessage("SGN_heart_beat_request");
    var warningMessage = sgn.offlineMessage;

    if(isBackgroundDead() && gIsWindowFocused){
      var warningNode = $("<div class='sgn_inactive_warning'><div>" + 
                            warningMessage + "</div></div>");
      var warningNodeCount = $(".sgn_inactive_warning:visible");

      if(sgn.isInbox()){
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


    if(!isBackgroundDead()){  
      if($(".sgn_inactive_warning").length){
        //background is back to alive
        $(".sgn_inactive_warning").remove();
        if($(".sgn_input").is(":visible")){
          setupNoteEditor();
        }
      }
    }

  });
  };

  // === GMAIL ONLY FUNCTION START ===
  var getEmailKey = function(title, sender, time, excerpt){
    var emailKey = sender + "|" + time + "|" + stripHtml(title) + "|" + stripHtml(excerpt);

    debugLog("@209, generalted email key:" + emailKey);

    //in case already escaped
    emailKey = htmlEscape(emailKey);
    return emailKey;
  };

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

  // === INBOX ONLY FUNCTIONS START ====
  var getInboxEmailId = function(actionData){
    if(!actionData){
      return "";
    }

    var messageId = $.parseJSON(actionData)[0][1][0];
    messageId = messageId.split(":")[1];
    //http://stackoverflow.com/questions/57803/how-to-convert-decimal-to-hex-in-javascript
    messageId = dec2hex(messageId);

    return messageId;
  };
  // === INBOX ONLY FUNCTIONS END ===

  // mail gmail related logic
  var getCurrentMessageId = function(){
    var messageId = '';
    if(sgn.isInbox()){
      var actionData = sgnGmailDom.inboxDataNode().parent().attr("data-action-data");
      messageId = getInboxEmailId(actionData);
    }
    else{
      if(sgnGmailDom.isPreviewPane()){
        var idNode = $("tr.zA.aps:visible[sgn_email_id]").first();

        if(idNode.length){
          messageId = idNode.attr("sgn_email_id");
        }else{
          messageId = "PREVIEW";
        }
      }
    }
    if(!messageId){
      messageId = sgnGmailDom.emailId();
    }
    if(!messageId){
      sgn.appendLog("message not found");
      return;
    }
    return messageId;
  };

  //set up note editor in the email detail page
  var setupNoteEditor = function(){
  sgn.executeCatchingError(function(){
    //No email selected, happened when page up or page down
    if(!sgn.isInbox() && !$(".nH.aHU:visible").length && sgnGmailDom.isPreviewPane()){
      sgn.appendLog("No email selected");
      return;
    }

    var visible_container = $(".sgn_container:visible");
    if(visible_container.length && visible_container.height())  
    {
      sgn.appendLog("textarea already exists");
      return;
    }

    var messageId = getCurrentMessageId();
    if(!messageId){
      sgn.appendLog("message not found");
      return;
    }

    //if(!acquireNetworkLock()){
        //sgn.appendLog("Network lock failed");
        //debugLog("setupNoteEditor failed to get network lock");
        //return;
    //}

    sendContentMessage('SGN_setup_note_editor', {messageId:messageId});

    sgn.appendLog("set up request sent");
    sendDebugInfo();
  });
  };

  var updateEmailIdDictByJSON = function(dataString){
  sgn.executeCatchingError(function(dataString){
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
  }, dataString);
  };

  var updateEmailIdDictByJS = function(dataString){
  sgn.executeCatchingError(function(dataString){
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
  }, dataString);
  };

  var isLoggedIn = function(){
    return sgn.gdriveEmail && sgn.gdriveEmail !== "";
  };

  var lastPullDiff = 0;
  var lastPullHash = null;
  var lastPullItemRange = null;
  var lastPendingCount = 0;
  var lastAbstractSignature = "";
  sgn.duplicateRequestCount = 0;
  var markAbstracts = function(){
  sgn.executeCatchingError(function(){
    if(!sgn.isInbox() && 
       (!$("tr.zA").length ||
         (sgnGmailDom.isInsideEmail() && !sgnGmailDom.isPreviewPane()))){
      sgn.appendLog("mark email id skipped");
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
      sgn.appendLog("background is dead.");
      return; //no need to pull, walty temp
    }

    var visibleRows;
    if(sgn.isInbox()){
      visibleRows = $(".an.b9[data-action-data]:visible");
    }
    else{
      visibleRows = $("tr.zA[id]:visible");
    }
     
    var unmarkedRows = visibleRows.filter(":not([sgn_email_id])");
    //rows that has been marked, but has no notes

    var pendingRows = $([]);
    if(sgnGmailDom.isPreviewPane() && sgnGmailDom.isVerticalSplit()){
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

    if(thisAbstractSignature == lastAbstractSignature){
      sgn.duplicateRequestCount += 1;
    }
    else
      sgn.duplicateRequestCount = 0;

    if(sgn.duplicateRequestCount > 3){
      sgn.appendLog("3 duplicate requests");
      return; //danger, may be endless loop here
    }

    if(unmarkedRows.length === 0 && pendingRows.length === 0){
      sgn.appendLog("no need to check");
      return;
    }

    debugLog("@104, total unmarked rows", unmarkedRows.length);
    //mark the email ID for each row
    unmarkedRows.each(function(){
      if(sgn.isInbox()){
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
      sgn.appendLog("not logged in, skipped pull requests");
      sgn.duplicateRequestCount = 0;
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
      sgn.appendLog("no need to pull rows");
      return;
    }


    //this line MUST be above acquireNetworkLock, otherwise it would be point less
    lastAbstractSignature = thisAbstractSignature;

    debugLog("Simple-gmail-notes: pulling notes");
    //g_pnc += 1;
    //the lock must be acaquired right before the request is issued
    //if(!acquireNetworkLock()){
    //  sgn.appendLog("markAbstracts failed to get network lock");
    //  return;
    //}
    sendContentMessage("SGN_pull_notes",
                     {email: sgnGmailPage.userEmail(), requestList:requestList});


    sgn.appendLog("pull request sent");
    sendDebugInfo();
  });
  };


  var main = function(){
    sgn.$ = $;

    //sgnGmailDom = new SimpleGmailNotes_Gmail(localJQuery);
    sgnGmailDom = new SGNGmailDOM(localJQuery);

    var sgnGmailPageOptions = {
      openEmailCallback: function(){  //no effect for inbox
        debugLog("simple-gmail-notes: open email event");
        //g_oec += 1;
        setupNoteEditor();
      },
      httpEventCallback: function(params, responseText, readyState) { //no effect for inbox
        //debugLog("xhr:", xhr);
        updateEmailIdDictByJSON(responseText);
      },
      onloadCallback: function(){
        debugLog("simple-gmail-notes: load event");
        //g_lc += 1;
        setupNoteEditor();
      },
    };

    sgnGmailPage = new SGNGmailPage(localJQuery, sgnGmailPageOptions);

    document.addEventListener('SGN_PAGE_heart_beat_response', function(e) {
      sgn.lastHeartBeat = Date.now();
      sgn.gdriveEmail = JSON.parse(e.detail);
    });

    /*
    */

    //use current DOM to update email ID of first page
    for(var i=0; i<document.scripts.length; i++){
      updateEmailIdDictByJS(document.scripts[i].text);
    }

    //https://stackoverflow.com/questions/6685396/execute-the-setinterval-function-without-delay-the-first-time
    setInterval(function _run(){
      //exeception in one call should not affect others
      sendHeartBeat();
      markAbstracts();
      setupNoteEditor();
      sendDebugInfo();
      return _run;
    }(), 1500);

    //setTimeout(pullNotesCatchingError, 0);
    //setInterval(pullNotesCatchingError, 2000);

    //better not to overlapp to much with the above one
    //setInterval(setupNoteEditorCatchingError, 1770); 
    //setInterval(sendDebugInfo, 3000); //update debug info to background

    //======= FOR DEBUG =======
    sgn._sgnGmailDom = sgnGmailDom;
    sgn._sgnGmailPage = sgnGmailPage;
    sgn._sendPreference = debugSendPreference;
    sgn._resetPreferences = debugResetPreferences;
    sgn._deleteNote = debugDeleteNote;
  };

  main();

}(window.SimpleGmailNotes = window.SimpleGmailNotes || 
                            {}, jQuery.noConflict(true)));

}; //end of SimpleGmailNotes.start

SimpleGmailNotes.start();

