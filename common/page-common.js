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
    } else {
      f();
    }
}


SimpleGmailNotes.start = function(){

(function(SimpleGmailNotes, localJQuery){
  var $ = localJQuery;
 // alert("@11: " + localJQuery);


//  var $ = localJQuery;
//  alert("@12: " + $);

  /* 
   * callback declarations 
   */
  SimpleGmailNotes.isDebug = function(callback) {
    return false;
  }
  /*** end of callback implementation ***/

  var debugLog = function()
  {
    if (SimpleGmailNotes.isDebug()) {
        console.log.apply(console, arguments);
    }
  }

  var gmail;
  
  var sendEventMessage = function(eventName, eventDetail){
    if(eventDetail == undefined){
      eventDetail = {};
    }

    eventDetail.email = gmail.get.user_email();
    document.dispatchEvent(new CustomEvent(eventName,  
                                           {detail: eventDetail}
    ));
  }

  var lastPullTimeStamp = null;
  var nextPullTimeStamp = null;
  var consecutiveRequests = 0;
  var consecutiveStartTime = 0;
  var g_oec = 0;    //open email trigger count
  var g_lc = 0;     //local trigger count
  var g_pnc = 0;    //pulled network trigger count

  var acquireNetworkLock = function() {
     var timestamp = Date.now() / 1000;
     var resetCounter = false;

    if(nextPullTimeStamp){//if nextPullTimeStamp is set
        if(nextPullTimeStamp > timestamp) //skip the request
            return false;
        else {
            nextPullTimeStamp = null;
            return true;
        }
    }


    //avoid crazy pulling in case of multiple network requests
    if(timestamp - lastPullTimeStamp < 3)  //pull again in 3 seconds, for whatever reasons
      consecutiveRequests += 1;
    else{
      resetCounter = true;
    }


    if(consecutiveRequests >= 20){
        nextPullTimeStamp = timestamp + 60; //penalty timeout for 60 seconds

        var message = "20 consecutive network requests detected from Simple Gmail Notes, the extension would be self-disabled for 60 seconds. Please consider to disable/uninstall this extension to avoid locking of your Gmail account. Currently the developer (me) cannot reproduce this problem and therefore has no idea how to fix it, sorry.\n\nHowever, if possible, please kindly send the following information to the extension bug report page, it would be helpful for the developer to diagnose the problem. Thank you!\n\n";
        message += "oec:" + g_oec;
        message += "; lc:" + g_lc; 
        message += "; pnc:" + g_pnc;
        message += "; tt:" + Math.round(timestamp - consecutiveStartTime);

        alert(message); //very intrusive, but it's a very serious problem

        resetCounter = true;
    }

    if(resetCounter){
        consecutiveRequests = 0;
        consecutiveStartTime = timestamp;
        g_oec = 0;
        g_lc = 0;
        g_pnc = 0;
    }

    lastPullTimeStamp = timestamp;

    return true;
  }

  var sendDebugInfo = function(){
    var debugInfo = "Browser Version: " + navigator.userAgent + "\n" + debugInfoSummary + "\n" + debugInfoDetail;
    sendEventMessage('SGN_update_debug_page_info', { debugInfo:debugInfo });

  }

  var setupNotes = function(){
    setTimeout(function(){
      if($(".sgn_container:visible").length)  //text area already exist
          return;

      var currentPageMessageId = "";

      if(gmail.check.is_preview_pane()){
          var idNode = $("tr.zA.aps:visible[sgn_email_id]").first();

          if(idNode.length)
              currentPageMessageId = idNode.attr("sgn_email_id"); 
      }
      else
          currentPageMessageId = gmail.get.email_id();

      if(!currentPageMessageId)  //do nothing
          return;
     

      if(!acquireNetworkLock()){
          debugLog("sestupNotes failed to get network lock");
          return;
      }
        
      sendEventMessage('SGN_setup_notes', {messageId:currentPageMessageId});

      
      //update the email info to the content page
      //gmail.get.email_data_async(currentPageMessageId, function(data){
       // var messageData = data["threads"][currentPageMessageId];

        //var datetime = messageData["datetime"];
        //var subject = messageData["subject"];
        //var sender = messageData["from_email"];

        var subject = $(".ha h2.hP").text();
        var sender = $("h3 span.gD").last().attr("email");
        var datetime = $(".gK .g3").last().attr("title");

        sendEventMessage('SGN_setup_email_info', 
                         {messageId:currentPageMessageId, 
                          datetime:datetime,
                          subject:subject,
                          sender:sender});

      //});

      //if(!debugInfoDetail){
        //debugInfoDetail = "Last Detail Page URL: " + window.location.href;
        debugInfoDetail = "Is Conversation View: " + gmail.check.is_conversation_view();
        sendDebugInfo();
      //}

    }, 0);  //setTimeout
  }

  var getDOMSignature = function(){
    var currentDOMSignature = "";
    $('tr.zA').each(function() {
       currentDOMSignature += $(this).text();
    });
    return currentDOMSignature;
  }

  htmlEscape = function(str) {
      return String(str)
              .replace(/&/g, '&amp;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#39;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');
  }

  stripHtml = function(value){
    return value.replace(/<(?:.|\n)*?>/gm, '');
  }

  composeEmailKey = function(title, sender, time){
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

  var getEmailKey = function(mailNode){
    //var titleNode = getTitleNode(mailNode);
    //var title = titleNode.text();
    var title = getTitle(mailNode);
    var sender = getSender(mailNode);

    //if($(location).attr("href").indexOf("#sent") > 0){
     // sender = userEmail;
    //}

    var time = getTime(mailNode);
    var emailKey = composeEmailKey(title, sender, time);

    debugLog("@249, email key:" + emailKey);



    return emailKey;
  }

  // I needed the opposite function today, so adding here too:
  htmlUnescape = function(value){
      return String(value)
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&');
  }

  var gEmailIdDict = {};

  var updateEmailData = function(dataString){
    var startString = ")]}'\n\n";
    var totalLength = dataString.length;

    if(dataString.substring(0, startString.length) != startString){
      //not a valid view data string
      return;
    }

    if(dataString.substring(totalLength-1, totalLength) != ']'){
      //not a valid format
      return;
    }

    var strippedString = dataString.substring(startString.length);

    if(strippedString.indexOf('"ms"') < 0){
      //not a json reponse
      return;
    }

    var emailData = eval(strippedString);
    var email_list = gmail.tools.parse_json_data(emailData[0]);

    for(var i=0; i< email_list.length; i++){
      var email = email_list[i];
      var emailKey = composeEmailKey(htmlUnescape(email.title), email.sender, email.time);
      gEmailIdDict[emailKey] = email;
    }

    //sendEventMessage("SGN_pull_notes", 
     //                {email: gmail.get.user_email(), emailList:parsedData});
    //update dict with parsedData

    var temp = 0;
  }

  var updateViewData = function(dataString){
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
      var emailKey = composeEmailKey(email.title, email.sender, email.time);
      gEmailIdDict[emailKey] = email;
    }

    //update dict with parsedData
    //sendEventMessage("SGN_pull_notes", 
     //                {email: gmail.get.user_email(), emailList:parsedData});

    var temp = 0;
  }

  var lastPullDiff = 0;
  var lastPullHash = null;
  var lastPullItemRange = null;
  var debugInfoDetail = "";
  var debugInfoSummary = "";
  var pullNotes = function(){
    if(!$("tr.zA").length || 
       (gmail.check.is_inside_email() && !gmail.check.is_preview_pane())){
      debugLog("Skipped pulling because no tr to check with");
      lastPullHash = null;
      return;   
    }

    var markedRowCount = $("tr.zA:visible[sgn_email_id]").length;
    var totalRowCount = $("tr.zA[id]:visible").length;
    var thisPullDiff = totalRowCount - markedRowCount;
    var thisPullHash = window.location.hash;
    var thisPullItemRange = $(".Di .Dj:visible").text();

    debugLog("@104", totalRowCount, markedRowCount, thisPullDiff);

    /*
    if(thisPullDiff == lastPullDiff 
         && thisPullHash == lastPullHash
         && thisPullItemRange == lastPullItemRange){
      debugLog("Skipped pulling because of duplicate network requests");
      return;
    }
    if(!gmail.tracker.at && gmail.check.is_query_page()){
      debugLog("tracker at is not defined");
      return;
    }

    g_pnc += 1;
    if(!acquireNetworkLock()){
      debugLog("pullNotes failed to get network lock");
      return;
    }
    */

    lastPullDiff = thisPullDiff;
    lastPullHash = thisPullHash;
    lastPullItemRange = thisPullItemRange;

    if(thisPullDiff == 0){
      debugLog("all rows already marked");
      return;   //effectively no different to return from here
    }

    debugLog("Simple-gmail-notes: pulling notes");
    //skip the update if windows location (esp. hash part) is not changed
    /*
    gmail.get.visible_emails_async(function(emailList){
      debugLog("[page.js]sending email for pull request, total count:", 
                  emailList.length);
      sendEventMessage("SGN_pull_notes", 
                       {email: gmail.get.user_email(), emailList:emailList});

    });
    */


    var unmarkedElements = $("tr.zA[id]:visible:not([sgn_email_id])");

    var requestList = [];
    unmarkedElements.each(function(){
      var emailKey = getEmailKey($(this));
      var email = gEmailIdDict[emailKey];


      if(email){
        //add email id to the TR element
        $(this).attr("sgn_email_id", email.id);
        requestList.push(email.id);
        console.log("@395", emailKey, email);
      }

    });
    sendEventMessage("SGN_pull_notes", 
                     {email: gmail.get.user_email(), requestList:requestList});

    //var markedRowCount = $("tr.zA:visible").find(".sgn").length;
    //var totalRowCount = $("tr.zA[id]:visible").length;

    //if(!debugInfoSummary){
        debugInfoSummary = "Last Summary Page URL: " + window.location.href;
        debugInfoSummary += "\nIs Vertical Split: " + gmail.check.is_vertical_split();
        debugInfoSummary += "\nIs Horizontal Split: " + gmail.check.is_horizontal_split();
        debugInfoSummary += "\nIs Preview Pane: " + gmail.check.is_preview_pane();
        debugInfoSummary += "\nIs Multiple Inbox: " + gmail.check.is_multiple_inbox();
        sendDebugInfo();
    //}
  }

  var main = function(){
    gmail = new Gmail(localJQuery);

    gmail.observe.on('open_email', function(obj){
      debugLog("simple-gmail-notes: open email event", obj);
      g_oec += 1;
      setupNotes();
    });

    gmail.observe.on('load', function(obj){
      debugLog("simple-gmail-notes: load event");
      g_lc += 1;
      setupNotes();
    });

    //id is always undefined
    gmail.observe.after('http_event', function(params, id, xhr) {
      console.log("url data:", params);
      console.log("xhr:", xhr);
      updateEmailData(xhr.responseText);
    });

    for(var i=0; i<document.scripts.length; i++){
      updateViewData(document.scripts[i].text);
    }

    setTimeout(pullNotes, 0);
    setInterval(pullNotes, 2000);
    setInterval(setupNotes, 1770);  //better not to overlapp to much with the above one

    //mainly for debug purpose
    SimpleGmailNotes.gmail = gmail;
  }

  main();


}(window.SimpleGmailNotes = window.SimpleGmailNotes || {}, jQuery.noConflict(true)));

} //end of SimpleGmailNotes.start

SimpleGmailNotes.refresh(SimpleGmailNotes.start);
