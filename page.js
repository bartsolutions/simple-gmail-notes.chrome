/*
 * Simple Gmail Notes 
 * https://github.com/walty8
 * Copyright (C) 2015 Walty Yeung <walty8@gmail.com>
 */

var gmail;

function refresh(f) {
  if( (/in/.test(document.readyState)) || (undefined === window.Gmail) ) {
    setTimeout('refresh(' + f + ')', 10);
  } else {
    f();
  }
}

function setupNotes(){
  setTimeout(function(){
    var currentPageMessageId = gmail.get.email_id();

    if(!currentPageMessageId)  //do nothing
        return;
   
    document.dispatchEvent(new CustomEvent('SGN_setup_notes', {
       detail: {email: gmail.get.user_email(), 
                messageId:currentPageMessageId}}
    ));

  }, 0);
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
}

refresh(main);
