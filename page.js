var gmail;

function refresh(f) {
  if( (/in/.test(document.readyState)) || (undefined === window.Gmail) ) {
    setTimeout('refresh(' + f + ')', 10);
  } else {
    f();
  }
}


var main = function(){
  // NOTE: Always use the latest version of gmail.js from
  // https://github.com/KartikTalwar/gmail.js
  gmail = new Gmail();
  console.log('Hello,', gmail.get.user_email());

  gmail.observe.on('view_thread', function(obj){

 document.dispatchEvent(new CustomEvent('SGN_setup_notes', {
       detail: {email: gmail.get.user_email()} // Some variable from Gmail.
    }));
    
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
