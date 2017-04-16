/* minimized
 * a minimized version of gmail.js, removed all redundant functions from 
 * gmail.js. No event model is implemented here
 */

    //gmailSgn.observe.on('open_email', function(obj){
    //gmailSgn.observe.on('load', function(obj){
    //gmailSgn.observe.after('http_event', function(params, id, xhr) {

    //eventDetail.email = gmailSgn.get.user_email();
    //if(gmailSgn.check.is_preview_pane()){
    //messageId = gmailSgn.get.email_id();
    //gDebugInfoDetail = "Is Conversation View: " + gmailSgn.check.is_conversation_view();
    //email_list = gmailSgn.tools.parse_view_data(emailData[0]);
    //(gmailSgn.check.is_inside_email() && !gmailSgn.check.is_preview_pane())){
    //gDebugInfoSummary += "\nIs Vertical Split: " + gmailSgn.check.is_vertical_split();
    //gDebugInfoSummary += "\nIs Horizontal Split: " + gmailSgn.check.is_horizontal_split();
    //gDebugInfoSummary += "\nIs Preview Pane: " + gmailSgn.check.is_preview_pane();
    //gDebugInfoSummary += "\nIs Multiple Inbox: " + gmailSgn.check.is_multiple_inbox();
var SGNGmail = function(localJQuery){
  var $ = localJQuery;
  var ajaxCallback = function(responseText, readyState, url){
    //parsing logic from gmail.js
    var regex = /[?&]([^=#]+)=([^&#]*)/g;
    var params = {};
    var match;
    while (match = regex.exec(url)) {
      params[match[1]] = match[2];
    }

    if((params.url.view == 'cv' || params.url.view == 'ad') && typeof params.url.th == 'string' && typeof params.url.search == 'string' && params.url.rid === undefined) {
      //open_email event
        open_email_callback();
    }


  };

  //http://stackoverflow.com/questions/25335648/how-to-intercept-all-ajax-requests-made-by-different-js-libraries
  (function(send) {
    XMLHttpRequest.prototype.send = function(data) {
        // in this case I'm injecting an access token (eg. accessToken) in the request headers before it gets sent
        var curr_onreadystatechange = this.onreadystatechange;
        this.onreadystatechange = function(progress) {
          //trigger the origianl call first, in case our callback crashes
          curr_onreadystatechange.apply(this, arguments); 

          if (this.readyState === this.DONE) {
            ajaxCallback(this.responseText, this.readyState, this.responseURL);
          }
        };
        send.call(this, data);
    };
  })(XMLHttpRequest.prototype.send);

  //fire events when DOM idle
  //http://stackoverflow.com/questions/2844565/is-there-a-javascript-jquery-dom-change-listener
  MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
  var observer = new MutationObserver(function(mutations, observer) {
    // fired when a mutation occurs
    console.log(mutations, observer);
    // ...
  });

  observer.observe(document, {
    subtree: true,
    attributes: true
  });
};
