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
      gmail.get.email_data_async(currentPageMessageId, function(data){
        var messageData = data["threads"][currentPageMessageId];

        var datetime = messageData["datetime"];
        var subject = messageData["subject"];
        var sender = messageData["from_email"];

        sendEventMessage('SGN_setup_email_info', 
                         {messageId:currentPageMessageId, 
                          datetime:datetime,
                          subject:subject,
                          sender:sender});

      });

      if(!debugInfoDetail){
        debugInfoDetail = "Is Conversation View: " + gmail.check.is_conversation_view();
        sendDebugInfo();
      }

    }, 0);  //setTimeout
  }

  var getDOMSignature = function(){
    var currentDOMSignature = "";
    $('tr.zA').each(function() {
       currentDOMSignature += $(this).text();
    });
    return currentDOMSignature;
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

    var markedRowCount = $("tr.zA:visible").find(".sgn").length;
    var unmarkedRowCount = $("tr.zA[id]:visible").length;
    var thisPullDiff = unmarkedRowCount - markedRowCount;
    var thisPullHash = window.location.hash;
    var thisPullItemRange = $(".Di .Dj:visible").text();

    debugLog("@104", unmarkedRowCount, markedRowCount, thisPullDiff);
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

    lastPullDiff = thisPullDiff;
    lastPullHash = thisPullHash;
    lastPullItemRange = thisPullItemRange;

    if(thisPullDiff == 0){
      debugLog("all rows already marked");
      return;   //effectively no different to return from here
    }

    debugLog("Simple-gmail-notes: pulling notes");
    //skip the update if windows location (esp. hash part) is not changed
    gmail.get.visible_emails_async(function(emailList){
      debugLog("[page.js]sending email for pull request, total count:", 
                  emailList.length);
      sendEventMessage("SGN_pull_notes", 
                       {email: gmail.get.user_email(), emailList:emailList});

    });



    if(!debugInfoSummary){
        debugInfoSummary += "Is Vertical Split: " + gmail.check.is_vertical_split();
        debugInfoSummary += "\nIs Horizontal Split: " + gmail.check.is_horizontal_split();
        debugInfoSummary += "\nIs Preview Pane: " + gmail.check.is_preview_pane();
        debugInfoSummary += "\nIs Multiple Inbox: " + gmail.check.is_multiple_inbox();
        sendDebugInfo();
    }
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
