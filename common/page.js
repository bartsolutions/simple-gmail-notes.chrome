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

//for note display on summary page
var emailInfoDict = {};
var previousURL = "";
var SHOW_NOTE_ON_SUMMARY = true;

var getTitleNode = function(mailNode){
  return $(mailNode).find(".xT .y6").find("span").first();
}

var hasMarkedNote = function(mailNode){
  var title = getTitleNode(mailNode).text();
  if(title.indexOf("{")==0 && title.indexOf("}")>0){
    return true;
  }

  return false;
}

var markNote = function(mailNode, note){
  //console.log("@51, marking note", mailNode, note);
  var titleNode = getTitleNode(mailNode);
  titleNode.text("{" + note + "} " + titleNode.text());
}


var getEmailNote = function(mailNode){
  var titleNode = getTitleNode(mailNode);
  var title = titleNode.text();
  var sender = mailNode.find(".yW .yP").attr("email");

  if($(location).attr("href").indexOf("#sent") > 0){
    sender = gmail.get.user_email();
  }

  var time = mailNode.find(".xW").find("span").last().attr("title");
  var emailKey = title + "|" + sender + "|" + time;

  var note = emailInfoDict[emailKey];
  //console.log("@62", emailKey);
  //console.log("@62", emailInfoDict);
  return note;
}


var updateEmailSummaryNote = function(){
  //loop for each email tr
  $("tr.zA").each(function(){
    if(!hasMarkedNote($(this))){  //already marked
      var emailNote = getEmailNote($(this));
      //console.log("@74, trying to mark", emailInfoDict, emailNote);
      if(emailNote){
        markNote($(this), emailNote);
      }
    }
  });
}

var pullAndUpdateEmailSummaryNote = function(){
  gmail.get.visible_emails_async(function(emailList){
    $.each(emailList, function(index, email){
      if(!email.sender){
        email.sender = gmail.get.user_email();
      }
        
      emailKey = email.title + "|" + email.sender + "|" + email.time;
      emailKey = $("<div/>").html(emailKey).text()
      //console.log("@83", emailKey);
      //get email via ID in future
      emailInfoDict[emailKey] = "walty note test 12";
    });
    
    console.log("@106, dict size", Object.keys(emailInfoDict).length);
    updateEmailSummaryNote();
  });

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
    if(!SHOW_NOTE_ON_SUMMARY){
      return;
    }

    if(!$("tr.zA").length || gmail.check.is_inside_email()){
      return;
    }
    console.log("simple-gmail-notes: http_event");

    console.log("@119 start to set up summary page");

    //skip the update if windows location (esp. hash part) is not changed
    var currentURL = $(location).attr("href");
    if(currentURL != previousURL){
      console.log("@125, pull and update");
      pullAndUpdateEmailSummaryNote();
      previousURL = currentURL;
    }
    else{
      console.log("@130, update");
      updateEmailSummaryNote();
    }



  }); //end of observer

}

refresh(main);

