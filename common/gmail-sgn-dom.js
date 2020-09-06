/*
 * Simple Gmail Notes
 * https://github.com/walty8
 * Copyright (C) 2017 Walty Yeung <walty8@gmail.com>
 * License: GPLv3
 *
 * like gmail.js, but only extracted the required parts. This script could 
 * be shared by both page and content scripts
 */

var SGNGmailDOM = function(localJQuery){
  var $ = localJQuery;
  var api = {};

  api.pageContent = function(){
    return $('div[role=main]:first');
  };


  api.inboxDataNode = function(){
    return $(".gT.s2:visible");
  };

  api.inboxHookNode = function(){
    return $(".gj.s2:visible");
  };

  api.isConversationMode = function(node){
    var isConversationMode;
    if(node)
      isConversationMode = node.find('[data-thread-perm-id*="msg-"]:visible').length === 0 &&
                            node.find('[data-thread-id*="msg-"]:visible:first').length === 0;
    else
      isConversationMode = $('tr.zA [data-thread-perm-id*="msg-"]:visible').length === 0 &&
                            $('tr.zA [data-thread-id*="msg-"]:visible').length === 0 &&
                            $('h2.hP[data-thread-perm-id*="msg-"]:visible').length === 0 &&
                            $('h2.hP[data-thread-id*="msg-"]:visible').length === 0;

    return isConversationMode;

  };

  api.getPreviewpaneNode = function(){
    var idNode = $("tr.zA.aps:visible[sgn_email_id]").first();
    return idNode;
  };
  
  api.getPreviewpaneEmailId = function(){
    var messageId;
    var idNode = api.getPreviewpaneNode();
    if(idNode.length){
      messageId = idNode.attr("sgn_email_id");
    }else{
      messageId = "PREVIEW";  
    }

    return messageId;
  };

  api.getNewGmailEmailIdFromNode = function(node){
    var emailId;

    if(api.isConversationMode(node)){
      emailId =  $(node).find("*[data-legacy-thread-id]").attr("data-legacy-thread-id");
    }
    else{
      emailId =  $(node).find("*[data-legacy-last-message-id]").attr("data-legacy-last-message-id");
    }

    return emailId;
  };

  //get email id, if node exists it should be detail page
  api.getNewGmailEmailId = function(){
    if(!SimpleGmailNotes.isNewGmail()){
      return null;
    }

    if(api.isPreviewPane()){ //this is for old and new gmail
      emailId = api.getPreviewpaneEmailId();
    }
    else  //no preview
    {
      if(api.isConversationMode()){
        emailId = api.getCurrentThreadId();
      }
      else{
        emailId = api.getLastMessageId();
      }
    }

    //console.log("new email id, @207: ", emailId);
    return emailId;
  };

  api.currentPageInfo = function(){
    var hash  = window.location.hash.split('#').pop();
    var parts = hash.split("/");
    var lastPart = parts[parts.length-1];
    var firstPart = parts[0];

    hash = hash.split("?")[0]; //when compose window keep opening problem, there would be query string

    return {"hash": hash, "firstPart": firstPart, "lastPart": lastPart};
  }; //for multiple pages

  api.currentPage = function() {
    var pages = ['sent', 'inbox', 'starred', 'drafts', 'imp', 'chats', 'all', 'spam', 'trash', 'settings'];
    var page = null;    //return null if it's detail page
    var info = api.currentPageInfo();
    var hash = info.hash;


    if(info.lastPart.match(/[0-9A-Fa-f]{16}/))   //detail page
        return null;

    if(info.lastPart.match(/[0-9A-Za-z]{32}/))   //new UI detail page
        return null;

    if(api.isQueryPage()){
        page = hash;    //include the query part
    }
    else {
        page = info.firstPart;
    }

    return page;
  };

  var _userEmail;
  //page specific data checking
  api.userEmail = function() {
    if(_userEmail)
      return _userEmail;

    var hook = $("#gb a.gb_b.gb_R,#gb a.gb_Da,#gb a.gb_Ca");  //adapt to new UI
    var labelText = "";

    if(!hook.length && SimpleGmailNotes.isNewGmail()){
      hook = $("#gb a[aria-label*='@']");
    }

    if(!hook.length){
      return "";
    }

    if(SimpleGmailNotes.isNewGmail()){
      labelText = hook.attr("aria-label");

      if(!labelText){ // added 20191127, seems googles uses aria-hidden
        labelText = $("#gb .gb_ob").text();
      }

      if(!labelText){ // for delegated email
        labelText = $("#gb .gb_mb").text();
      }
    }
    else{ //for inbox and classic gmail
      labelText = hook.attr("title");
    }

    if(!labelText)
      return "";

    if(labelText.indexOf("(") !== -1){
      //split from last bracket
      _userEmail = labelText.split("(").slice(-1)[0];
      _userEmail = _userEmail.split(")")[0];
    }
    else if(labelText.indexOf(":") !== -1){
      _userEmail = $.trim(labelText.split(":")[1]);
    }
    else
      _userEmail = labelText;

    if(_userEmail.indexOf(" ") !== -1) {
      _userEmail = _userEmail.split(" ").slice(-1)[0];
    }
    
    return _userEmail;
  };


  api.isPreviewPane = function(){
    var dom = api.pageContent();
    var boxes = dom.find("[gh=tl]");

    var previewPaneFound = false;
    boxes.each(function() {
      if($(this).hasClass("aia") || $(this).find('> .aia').length ||
         $(this).find('>*>.aia').length){
        previewPaneFound = true;
      }
    });

    return previewPaneFound;
  };

  api.isQueryPage = function() {
    var pageInfo = api.currentPageInfo();
    var hash = pageInfo.hash;

    return hash.indexOf('label') === 0 || 
      hash.indexOf('category') === 0 || 
      hash.indexOf('search') === 0 || 
      hash.indexOf('settings') === 0 || 
      hash.indexOf('section_query') === 0 || 
      hash.indexOf('advanced-search') === 0;
  };

  api.isInsideEmail = function() {
    if(api.currentPage() !== null && !api.isPreviewPane()) {
      return false;
    }


    return true;

    /*
    //new gmail will return false during currentPage or previewPane checking
    if(SimpleGmailNotes.isNewGmail()){
      return true;
    }

    //try to find email id in classic email
    var items = $('.ii.gt');
    var ids = [];

    for(var i=0; i<items.length; i++) {
      var mailId = items[i].getAttribute('class').split(' ')[2];
      if(mailId != 'undefined' && mailId !== undefined) {
        if($(items[i]).is(':visible')) {
          ids.push(items[i]);
        }
      }
    }

    return ids.length > 0;
    */
  };

  api.isHorizontalSplit = function() {
    var dom = api.pageContent();
    var box = dom.find("[gh=tl]").find('.nn');

    return box.length === 0;
  };


  api.isVerticalSplit = function() {
    return api.isHorizontalSplit() === false;
  };

  api.inboxes = function() {
    var dom = api.pageContent();
    return dom.find("[gh=tl]");
  };

  api.isMultipleInbox = function() {
    var dom = api.inboxes();
    return dom.length > 1;
  };

  api.emailContents = function() {  //need to check
    var items = $('.ii.gt');
    var ids = [];

    for(var i=0; i<items.length; i++) {
      var mailId = items[i].getAttribute('class').split(' ')[2];
      var is_editable = items[i].getAttribute('contenteditable');
      if(mailId !== 'undefined' && mailId !== undefined) {
        if(is_editable != 'true') {
          ids.push(items[i]);
        }
      }
    }

    return ids;
  };

  //get the email id of current email
  api.getEmailIdFromURL = function() {
    var messageId;

    if(api.isPreviewPane()){ //this is for old and new gmail
      messageId = api.getPreviewpaneEmailId();
    }
    else
      messageId = window.location.hash.split("/").pop().replace(/#/, '').split('?')[0];

    return messageId;
  };


  var _dec2hexCached = {};
  //http://stackoverflow.com/questions/18626844/convert-a-large-integer-to-a-hex-string-in-javascript
  api.dec2hex = function(str){ // .toString(16) only works up to 2^53
    if(_dec2hexCached[str])
      return _dec2hexCached[str];

    var dec = str.toString().split(''), sum = [], hex = [], i, s;
    while(dec.length){
      s = 1 * dec.shift();
      for(i = 0; s || i < sum.length; i++){
        s += (sum[i] || 0) * 10;
        sum[i] = s % 16;
        s = (s - sum[i]) / 16;
      }
    }
    while(sum.length){
      hex.push(sum.pop().toString(16));
    }

    var result = hex.join('');
    _dec2hexCached[str] = result;

    return result;
  }; 


  api.getInboxEmailId = function(actionData){
    if(!actionData){
      return "";
    }

    var messageId = $.parseJSON(actionData)[0][1][0];
    messageId = messageId.split(":")[1];
    //http://stackoverflow.com/questions/57803/how-to-convert-decimal-to-hex-in-javascript
    messageId = api.dec2hex(messageId);
    return messageId;
  };

  // mail gmail related logic
  // get current message id (in email detail page)
  api.getCurrentMessageId = function(){
    var messageId = '';
    if(SimpleGmailNotes.isInbox()){
      var actionData = api.inboxDataNode().parent().attr("data-action-data");
      messageId = api.getInboxEmailId(actionData);
    }
    else{   
      if(SimpleGmailNotes.isNewGmail()){
        messageId = api.getNewGmailEmailId();
      }
      else{
        messageId = api.getEmailIdFromURL();
      }
    }

    if(!messageId){
      SimpleGmailNotes.appendLog("message not found");
    }

    return messageId;
  };

  api.getCurrentThreadId = function(){
    var threadId = "";
    if(SimpleGmailNotes.isInbox()){
      //for inbox message ID and thread ID are the same
      threadId = getCurrentMessageId();
    }
    else if(SimpleGmailNotes.isNewGmail()){
      if(api.isPreviewPane()){
        var idNode = api.getPreviewpaneNode();
        //works for both conversation & non-conversation mode
        threadId = idNode.find('*[data-legacy-thread-id]').attr('data-legacy-thread-id');
      }
      else
        //works for both conversation & non-conversation mode
        threadId = $('*[data-legacy-thread-id]:visible').attr('data-legacy-thread-id');
    }
    else{ //for classic gmail
      if($("h3.iw").length > 1){  //conversation mode, message id == thread id
        threadId = getCurrentMessageId();
      }
      else{
        threadId = "";  //classic email non conversation mode
      }
    }

    return threadId;
  };


  api.getLastMessageId = function(){
    var lastMessageId;

    if(api.isPreviewPane()){
      var idNode = api.getPreviewpaneNode();
      lastMessageId = idNode.find('*[data-legacy-last-message-id]').attr('data-legacy-last-message-id');
    }
    else{
      //for both conversation and non-conversation
      lastMessageId = $('*[data-legacy-message-id]:visible').last().attr('data-legacy-message-id');
    }

    return lastMessageId;
  };

  api.getPrintPageEmail = function() {
    var printEmailNode = $("tr:first").children('td:last');
    var printEmailNodeStr = printEmailNode.text();

    var email;
    if (printEmailNodeStr.indexOf("<") !== -1) {
      email = printEmailNodeStr.split("<").slice(-1)[0];
      email = email.split(">")[0];
    } else {
      email = $.trim(printEmailNodeStr.split(":")[1]);
    }
    email = $.trim(email);
    // console.log("email print", email);
    return email;

  };

  api.getEmailDate = function() {
    var emailDateNode = $("table.cf.gJ").find("span.g3");
    var emailDate = null;
    if (emailDateNode && emailDateNode.length > 0) {
      emailDate = emailDateNode.attr("title");
    }

    // console.log("@421---- email date", emailDate);

    return emailDate;
  }

  return api;
};

