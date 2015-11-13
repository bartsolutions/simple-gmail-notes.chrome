/*
 * Simple Gmail Notes 
 * https://github.com/walty8
 * Copyright (C) 2015 Walty Yeung <walty8@gmail.com>
 */

/* 
 * callback declarations 
 */
isDebug = function(callback) {
  return false;
}
/*** end of callback implementation ***/

debugLog = function()
{
  if (isDebug()) {
      console.log.apply(console, arguments);
  }
}

var gmail;

var refresh = function(f) {
  if( (/in/.test(document.readyState)) || (undefined === window.Gmail) ) {
    setTimeout('refresh(' + f + ')', 10);
  } else {
    f();
  }
}

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
    var currentPageMessageId = gmail.get.email_id();

    if(!currentPageMessageId)  //do nothing
        return;
   
    sendEventMessage('SGN_setup_notes', {messageId:currentPageMessageId});
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


  if(!$("tr.zA").length || gmail.check.is_inside_email() ||
     $("tr.zA:visible").find(".sgn").length == $("tr.zA:visible").length){
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
  gmail = new Gmail();

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

//  gmail.observe.after('http_event', function(obj){
 //   pullNotes();
 // }); 
}

refresh(main);

