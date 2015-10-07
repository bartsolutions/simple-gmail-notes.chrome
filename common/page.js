/*
 * Simple Gmail Notes 
 * https://github.com/walty8
 * Copyright (C) 2015 Walty Yeung <walty8@gmail.com>
 */

var gmail;

var refresh = function(f) {
  if( (/in/.test(document.readyState)) || (undefined === window.Gmail) ) {
    setTimeout('refresh(' + f + ')', 10);
  } else {
    f();
  }
}

var sendMessage = function(eventName, eventDetail){
  if(eventDetail == undefined){
    eventDetail = {}
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
   
    sendMessage('SGN_setup_notes', {messageId:currentPageMessageId});
  }, 0);
}

var getDOMSignature = function(){
  var currentDOMSignature = "";
  $('tr.zA').each(function() {
     currentDOMSignature += $(this).text();
  });
  return currentDOMSignature;
}


var previousDOMSignature = "";
var SHOW_NOTE_ON_SUMMARY = true;

var isPulling = false;
var pullNotes = function(){
  if(!SHOW_NOTE_ON_SUMMARY){
    return;
  }

  if(isPulling)
    return;

  if(!$("tr.zA").length || gmail.check.is_inside_email()){
    return;
  }

  //skip multiple trigger of same page

  var currentDOMSignature = getDOMSignature();
  if(previousDOMSignature == currentDOMSignature){
    console.log("@59, skipped pulling because DOM not changed");
    return;
  }
  //previousDOMSignature = currentDOMSignature;
  //if($("tr.zA").find(".sgn").length){
    //console.log("@73, already marked,skipped update");
    //return;
  //}
    

  //avoid crazy pulling in case of multiple network requests
  isPulling = true;
  setTimeout(function(){
    window.isPulling = false;
  }, 3000);

  console.log("simple-gmail-notes: pull notes");
  console.log("@119 start to set up summary page");

  //skip the update if windows location (esp. hash part) is not changed
  gmail.get.visible_emails_async(function(emailList){
    console.log("[page.js]sending email for puall request, total count:", 
                emailList.length);
    sendMessage("SGN_pull_notes", 
                {email: gmail.get.user_email(), emailList:emailList});
  });

  //pullAndUpdateEmailSummaryNote();
}

var main = function(){
  gmail = new Gmail();

  gmail.observe.on('open_email', function(obj){
    console.log("simple-gmail-notes: open email event", obj);
    setupNotes();
  });

  gmail.observe.on('load', function(obj){
    console.log("simple-gmail-notes: load event");
    setupNotes();
  });

  gmail.observe.on('view_thread', function(obj){
    console.log("simple-gmail-notes: view thread event");
  });

  gmail.observe.on('http_event', function(obj){
    //console.log("simple-gmail-notes: http event");
    //console.log("@186", obj.url_raw);
    setTimeout(function(){
      pullNotes();
    }, 500);
  }); //end of observer

  gmail.observe.on('toggle_threads', function(obj){
    console.log("simple-gmail-notes: toggle threads event");
  });

  /*
     MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

     var observer = new MutationObserver(function(mutations, observer) {
// fired when a mutation occurs
console.log(mutations, observer);
//pullNotes();
});

// define what element should be observed by the observer
// and what types of mutations trigger the callback

observer.observe(document, {
subtree: true,
attributes: true
//...
});
*/


  document.addEventListener('SGN_update_DOM_cache', function(e) {
    console.log("@138, requested to update DOM");
    //previousDOMSignature = getDOMSignature();
    //updateNotesOnSummary(email);  //should be called by backgrond page later
  });

}

refresh(main);

