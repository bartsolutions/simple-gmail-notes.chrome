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

  var setupNotes = function(){
    setTimeout(function(){
      var currentPageMessageId = "";

      if(gmail.check.is_preview_pane()){
          var threads = gmail.get.displayed_email_data().total_threads;
          if(threads)
              currentPageMessageId = threads[0];
      }
      else
          currentPageMessageId = gmail.get.email_id();

      if(!currentPageMessageId)  //do nothing
          return;
     
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

    }, 0);
  }

  var getDOMSignature = function(){
    var currentDOMSignature = "";
    $('tr.zA').each(function() {
       currentDOMSignature += $(this).text();
    });
    return currentDOMSignature;
  }


  var isPulling = false;
  var pullNotes = function(){
    //avoid crazy pulling in case of multiple network requests
    if(isPulling)
      return;
    isPulling = true;


    debugLog("@104", $("tr.zA:visible").find(".sgn").length, $("tr.zA[id]:visible").length);
    if(!$("tr.zA").length || 
       (gmail.check.is_inside_email() && !gmail.check.is_preview_pane()) ||
       $("tr.zA:visible").find(".sgn").length >= $("tr.zA[id]:visible").length){
      debugLog("Skipped pulling");
      isPulling = false;
      return;
    }

    debugLog("Simple-gmail-notes: pulling notes");

    //skip the update if windows location (esp. hash part) is not changed
    gmail.get.visible_emails_async(function(emailList){
      debugLog("[page.js]sending email for puall request, total count:", 
                  emailList.length);
      sendEventMessage("SGN_pull_notes", 
                       {email: gmail.get.user_email(), emailList:emailList});
      isPulling = false;
    });
  }

  var main = function(){
    gmail = new Gmail(localJQuery);

    gmail.observe.on('open_email', function(obj){
      debugLog("simple-gmail-notes: open email event", obj);
      setupNotes();
    });

    gmail.observe.on('load', function(obj){
      debugLog("simple-gmail-notes: load event");
      setupNotes();
    });

    setTimeout(pullNotes, 0);
    setInterval(pullNotes, 2000);

    //mainly for debug purpose
    SimpleGmailNotes.gmail = gmail;

  //  gmail.observe.after('http_event', function(obj){
   //   pullNotes();
   // }); 
  }

  main();


}(window.SimpleGmailNotes = window.SimpleGmailNotes || {}, jQuery.noConflict(true)));

} //end of SimpleGmailNotes.start

SimpleGmailNotes.refresh(SimpleGmailNotes.start);
