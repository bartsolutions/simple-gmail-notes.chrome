var SGNGmailDOM = function(localJQuery){
  var $ = localJQuery;
  var api = {};

  api.inboxContent = function(){
    return $('div[role=main]:first');
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

    if(api.isQueyPage()){
        page = hash;    //include the query part
    }
    else {
        page = info.firstPart;
    }

    return page;
  };

  api.isPreviewPane = function(){
    var dom = api.inboxContent();
    var boxes = dom.find("[gh=tl]");

    var previewPaneFound = false;
    boxes.each(function() {
      if($(this).hasClass('aia')) {
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
  };

  api.isHorizontalSplit = function() {
    var dom = api.inboxContent();
    var box = dom.find("[gh=tl]").find('.nn');

    return box.length === 0;
  };


  api.isVerticalSplit = function() {
    return api.isHorizontalSplit() === false;
  };

  api.inboxes = function() {
    var dom = api.inboxContent();
    return dom.find("[gh=tl]");
  };

  api.isMultipleInbox = function() {
    var dom = api.inboxes();
    return dom.length > 1;
  };

  api.dom.emailContents = function() {  //need to check
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

  api.emailId = function() {
    var hash = null;

    if(api.isInsideEmail()) {
      if(api.isPreviewPane()) {
        var items = api.emailContents();
        var text = [];

        for(var i=0; i<items.length; i++) {
          var mailId = items[i].getAttribute('class').split(' ')[2];
          var isEditable = items[i].getAttribute('contenteditable');
          var isVisible = items[i].offsetWidth > 0 && items[i].offsetHeight > 0;
          if(mailId != 'undefined' && mailId !== undefined && isVisible) {
            if(isEditable != 'true') {
              text.push(mailId);
            }
          }
        }

        hash = text[0].substring(1, text[0].length);
      } else {
        hash = window.location.hash.split("/").pop().replace(/#/, '').split('?')[0];
      }

    }

    return hash;
  };

  return api;
};
