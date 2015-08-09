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
chrome.runtime.sendMessage("jfjkcbkgjohminidbpendlodpfacgmlm", {action: setupNotes},
  function(response) {
    if (!response.success)
      handleError(url);
  });
      

  });

}


refresh(main);
