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


function checkEmailId(){
//  console.log("@13 ", gmail.get.email_id());
}

/*
function triggerWithEmailIdChanged(timeout, func, prevEmailId){
  var emailId = gmail.get.email_id();

  if(emailId == prevEmailId) {
    console.log("wait for next round");
    setTimeout(triggerWithEmailIdChanged, timeout, timeout, func, emailId);
  }
  else{
    console.log("email id got, trigger actions", emailId, prevEmailId);
    func();
  }
}
*/

function setupNotes(){
      setTimeout(function(){
        var currentPageMessageId = gmail.get.email_id();

        //console.log("@35", currentPageMessageId);

        if(!currentPageMessageId)  //do nothing
            return;

        //console.log("@19, viewthread", currentPageMessageId);
       
        document.dispatchEvent(new CustomEvent('SGN_setup_notes', {
           detail: {email: gmail.get.user_email(), messageId:currentPageMessageId} // Some variable from Gmail.
        }
        ));

      }, 0);
    

}

var main = function(){
  // NOTE: Always use the latest version of gmail.js from
  // https://github.com/KartikTalwar/gmail.js
  gmail = new Gmail();
  //console.log('Hello,', gmail.get.user_email());

  /*
gmail.observe.on('view_thread', function(obj) {
  console.log('view_thread', obj);
});
*/

  gmail.observe.on('view_thread', function(obj){
    //el = obj.dom();
    //console.log("@63", obj);
    //setupNotes();

    /*
   window.postMessage({ type: 'page_js_type',
                         text: "Hello from the page's javascript!"}, '*');
                         */

    
                         /*
    chrome.runtime.sendMessage("jfjkcbkgjohminidbpendlodpfacgmlm", {action: "setup_notes", email:gmail.get.user_email()},
    function(response) {
      if (!response.success)
        handleError(url);
    });*/


  });


  gmail.observe.on('open_email', function(obj){
    console.log("simple-gmail-notes: open email event", obj);
    setupNotes();
  });

  gmail.observe.on('load', function(obj){
    setupNotes();
    console.log("simple-gmail-notes: load event");
  });

  gmail.observe.on('view_thread', function(obj){
    console.log("simple-gmail-notes: view thread event");

  });

}

//disable logging
//console = {};
//console.log = function(){};

refresh(main);

