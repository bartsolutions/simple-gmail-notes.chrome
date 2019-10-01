/*
 * Simple Gmail Notes
 * https://github.com/walty8
 * Copyright (C) 2017 Walty Yeung <walty8@gmail.com>
 * License: GPLv3
 *
 * like gmail.js, but only extracted the required parts. This script could NOT
 * be used in the content script.
 */

/* 
 * minimized
 * page specifc gmail helper
 */

    //gmailSgn.observe.on('open_email', function(obj){   //PAGE EVENT //DONE
    //gmailSgn.observe.on('load', function(obj){   //PAGE EVENT //DONE
    //gmailSgn.observe.after('http_event', function(params, id, xhr) {  //PAGE EVENT  //DONE

    //eventDetail.email = gmailSgn.get.user_email();  //PAGE //done
    //email_list = gmailSgn.tools.parseViewData(emailData[0]);  //PAGE  //done
    //gDebugInfoDetail = "Is Conversation View: " + gmailSgn.check.isConversationView();  //PAGE  //done
    //
    //messageId = gmailSgn.get.email_id();  //DOM
    //if(gmailSgn.check.is_preview_pane()){  //DOM
    //(gmailSgn.check.is_inside_email() && !gmailSgn.check.is_preview_pane())){ //DOM
    //gDebugInfoSummary += "\nIs Vertical Split: " + gmailSgn.check.is_vertical_split();  //DOM
    //gDebugInfoSummary += "\nIs Horizontal Split: " + gmailSgn.check.is_horizontal_split();   //DOM
    //gDebugInfoSummary += "\nIs Preview Pane: " + gmailSgn.check.is_preview_pane();  //DOM
    //gDebugInfoSummary += "\nIs Multiple Inbox: " + gmailSgn.check.is_multiple_inbox();  //DOM
// options: {openEmailCallback }
var SGNGmailPage = function(localJQuery, options){
  var $ = localJQuery;
  var api = {};
  var domApi = new SGNGmailDOM(localJQuery);

  if(!options)
    options = {openEmailCallback:{}, httpEventCallback:{}, onloadCallback:{}};



  api.globals = window.GLOBALS;
  //this only works for old gmail
  api.isConversationView = function() {
    var flagName = 'bx_vmb';
    var flagValue;

    var arrayWithFlag = api.globals[17][4][1];

    for (var i = 0; i < arrayWithFlag.length; i++) {
      var current = arrayWithFlag[i];

      if (current[0] === flagName) {
        flagValue = current[1];

        break;
      }
    }

    return flagValue === '0' || flagValue === undefined;
  };

  api.parseViewData = function(viewData) {
    var parsed = [];
    var data = [];

    for(var j=0; j < viewData.length; j++) {
      if(viewData[j][0] == 'tb') {
        for(var k=0; k < viewData[j][2].length; k++) {
          data.push(viewData[j][2][k]);
        }
      }
    }

    for(var i=0; i < data.length; i++) {
      var x = data[i];
      var temp = {};

      //to make it consistent with content-common.js
      var sender = $("<div>" + x[7] + "</div>").find(".yP, .zF").last().attr("email"); 
      parsed.push({
        id: x[0],
        title : x[9],
        excerpt : x[10],
        time : x[15],
        sender : sender,
        //sender : x[28],
        attachment : x[13],
        labels: x[5]
      });
    }

    return parsed;
  };

  api.parseIncrementData = function(incrementData) {
    //console.log("@118", incrementData);
    var parsed = [];
    var data = [];
    var threadId = "";
    var threadTitle = "";
    var time = "";
    var sender = "";
    var labels = [];


    for(var j=0; j < incrementData.length; j++){
      var x = incrementData[j];


      if(x[0] == 'ms') {
        if(!threadId)
          threadId = x[1];
        if(!threadTitle)
          threadTitle = x[12];

        time = x[24];
        sender = x[6];
        labels = x[9];
      }
      else {  //end of current thread
        if(threadId){
          parsed.push({
            id: threadId,
            title: threadTitle,
            //excerpt: x[8],
            excerpt: '__INCREMENT_MAIL__',
            time: time,
            sender: sender,
            attachment: [],
            labels: labels
          });

          threadId = "";
          threadTitle = "";
        }
      }
    }

    //console.log("@139", parsed);

    return parsed;
  };

  //ajax related events
  var _ajaxCallback = function(responseText, readyState, url){
    //parsing logic from gmail.js
    var regex = /[?&]([^=#]+)=([^&#]*)/g;
    var params = {};
    var match;
    while ((match = regex.exec(url)) !== null) {
      params[match[1]] = match[2];
    }

    if(options.httpEventCallback)
      options.httpEventCallback(params, responseText, readyState);

    if(params && 
        (params.view == 'cv' || params.view == 'ad') && 
        typeof params.th == 'string' && 
        typeof params.search == 'string' && 
        params.rid === undefined) {
      //open_email event
        options.openEmailCallback();
    }
  };

  //http://stackoverflow.com/questions/25335648/how-to-intercept-all-ajax-requests-made-by-different-js-libraries
	if(!SimpleGmailNotes.isInbox() && !SimpleGmailNotes.isNewGmail()){
    var win = top.document.getElementById("js_frame").contentDocument.defaultView;
		(function(open) {
			win.XMLHttpRequest.prototype.open = function(method, url, async, user, pass) {
					this.addEventListener("readystatechange", function() {
						if (this.readyState === this.DONE) {
							//console.log(this.readyState); // this one I changed
							_ajaxCallback(this.responseText, this.readyState, this.responseURL);
						}
					}, false);
					open.apply(this, arguments);
			};
		})(win.XMLHttpRequest.prototype.open);
	}
  else{   //inbox or new gmail ui

    //the following works for for inbox and new gmail UI
    //set up the onload events, basically it just keep trying until the inbox 
    //content is found
    if(domApi.pageContent().length) {
      options.onloadCallback();
    }

   
    //retry 
    var load_count = 0;
    var delay = 200; // 200ms per check
    var attempts = 50; // try 50 times before giving up & assuming an error
    var timer = setInterval(function() {
      var test = domApi.pageContent().length;
      if(test > 0) {
        clearInterval(timer);
        return options.onloadCallback();
      } else if(++load_count > attempts) {
        clearInterval(timer);
        console.log('Failed to detect interface load in ' + (delay*attempts/1000) + ' seconds. Will automatically fire event in 5 further seconds.');
        setTimeout(options.onloadCallback, 5000);
      }
    }, delay);
  }


  return api;
};
