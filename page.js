var gmail;

function refresh(f) {
  if( (/in/.test(document.readyState)) || (undefined === window.Gmail) ) {
    setTimeout('refresh(' + f + ')', 10);
  } else {
    f();
  }
}


function checkEmailId(){
  console.log("@13 ", gmail.get.email_id());
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

var main = function(){
  // NOTE: Always use the latest version of gmail.js from
  // https://github.com/KartikTalwar/gmail.js
  gmail = new Gmail();
  console.log('Hello,', gmail.get.user_email());

  /*
gmail.observe.on('view_thread', function(obj) {
  console.log('view_thread', obj);
});
*/

  gmail.observe.on('view_thread', function(obj){

      var prevPageMessageId = gmail.get.email_id();

      setTimeout(function(){
        var currentPageMessageId = gmail.get.email_id();

        console.log("@19, viewthread", prevPageMessageId, currentPageMessageId);
       
        document.dispatchEvent(new CustomEvent('SGN_setup_notes', {
           detail: {email: gmail.get.user_email(), pageMessageId:currentPageMessageId} // Some variable from Gmail.
        }
        ));


      }, 1000);
    
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

}


refresh(main);
