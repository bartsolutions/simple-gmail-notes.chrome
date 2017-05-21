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

  var _userEmail;
  //page specific data checking
  api.userEmail = function() {
    if(_userEmail)
      return _userEmail;

    if(SimpleGmailNotes.isInbox()){
      var hook = $("#gb .gb_b.gb_eb.gb_R");
      _userEmail = hook.attr("title").split("(")[1].split(")")[0];
    }
    else
      _userEmail = api.globals[10];

    return _userEmail;
  };

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

    if(params.url && 
        (params.url.view == 'cv' || params.url.view == 'ad') && 
        typeof params.url.th == 'string' && 
        typeof params.url.search == 'string' && 
        params.url.rid === undefined) {
      //open_email event
        options.openEmailCallback();
    }
  };

  //http://stackoverflow.com/questions/25335648/how-to-intercept-all-ajax-requests-made-by-different-js-libraries
	
	if(!SimpleGmailNotes.isInbox()){
    var win = top.document.getElementById("js_frame").contentDocument.defaultView;
		(function(open) {
			win.XMLHttpRequest.prototype.open = function(method, url, async, user, pass) {
					this.addEventListener("readystatechange", function() {
						if (this.readyState === this.DONE) {
							//console.log(this.readyState); // this one I changed
							_ajaxCallback(this.responseText, this.readyState, this.responseURL);
						}
					}, false);
					open.call(this, method, url, async, user, pass);
			};
		})(win.XMLHttpRequest.prototype.open);
	}

  /*
  (function(orgSend) {
    XMLHttpRequest.prototype.send = function(data) {
        // in this case I'm injecting an access token (eg. accessToken) in the request headers before it gets sent
        var curr_onreadystatechange = this.onreadystatechange;
        this.onreadystatechange = function(progress) {
          if (this.readyState === this.DONE) {
            _ajaxCallback(this.responseText, this.readyState, this.responseURL);
          }

          if(curr_onreadystatechange){
            //trigger the origianl call first, in case our callback crashes
            curr_onreadystatechange.apply(this, arguments); 
          }
        };
        orgSend.call(this, data);
    };
  })(XMLHttpRequest.prototype.send);
  */

  //DOM related events
  //use it for the future enhancements
  /*
  var MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;
  var observer = new SGNObserver(function(mutations) {
    // fired when a mutation occurs
    console.log(mutations, observer);
    // ...
  });
  observer.observe(document, {
    subtree: true,
    attributes: true
  });
  */

  //set up the onload events, basically it just keep trying until the inbox 
  //content is found
  if(domApi.inboxContent().length) 
    options.onloadCallback();
  else{
    var load_count = 0;
    var delay = 200; // 200ms per check
    var attempts = 50; // try 50 times before giving up & assuming an error
    var timer = setInterval(function() {
      var test = domApi.inboxContent().length;
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
