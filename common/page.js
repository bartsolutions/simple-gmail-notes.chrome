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
   
    sendMessage('SGN_setup_notes', {messageId:currentPageMessageId})
  }, 0);
}


var previousURL = "";
var SHOW_NOTE_ON_SUMMARY = true;

/*
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

  var note = emailKeyNoteDict[emailKey];
  //console.log("@62", emailKey);
  //console.log("@62", emailKeyNoteDict);
  return note;
}


var updateEmailSummaryNote = function(){
  //loop for each email tr
  $("tr.zA").each(function(){
    if(!hasMarkedNote($(this))){  //already marked
      var emailNote = getEmailNote($(this));
      //console.log("@74, trying to mark", emailKeyNoteDict, emailNote);
      if(emailNote){
        markNote($(this), emailNote);
      }
    }
  });
}

var pullNotes = function(pendingPullList){
  //build query

}

var pullAndUpdateEmailSummaryNote = function(){
  gmail.get.visible_emails_async(function(emailList){
    sendMessage("SGN_pull_notes", {emailList: emailList);

    var pendingPullList = [];

    $.each(emailList, function(index, email){
      if(!email.sender){
        email.sender = gmail.get.user_email();
      }
        
      emailKey = email.title + "|" + email.sender + "|" + email.time;

      //if not yet pulled before
      if(emailIdKeyDict[email.id] == undefined){
        pendingPullList.append(email.id);

        emailKey = $("<div/>").html(emailKey).text()
        emailIdKeyDict[email.id] = emailKey;
      }

      pullNotes(pendingPullList);
      //hardcode for testing
      //emailKeyNoteDict[emailKey] = "walty note test 12";
    });
    
    //console.log("@106, dict size", Object.keys(emailKeyNoteDict).length);
    //updateEmailSummaryNote();
  });

}
*/

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
    //always pull
    if(true || currentURL != previousURL){
      console.log("@125, pull and update");

      gmail.get.visible_emails_async(function(emailList){
        sendMessage("SGN_pull_notes", 
                    {email: gmail.get.user_email(), emailList:emailList});
      });

      //pullAndUpdateEmailSummaryNote();
      previousURL = currentURL;
    }
    else{
      console.log("@130, update");
      //updateEmailSummaryNote();
      sendMessage("SGN_update_summary");
    }



  }); //end of observer

}

refresh(main);

