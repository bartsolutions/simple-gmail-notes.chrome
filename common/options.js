var gPreferenceTypes = ["abstractStyle", "noteHeight", "fontColor", 
                        "backgroundColor", "fontSize", "abstractFontColor", 
                        "abstractBackgroundColor", "abstractFontSize", 
                        "notePosition", "showConnectionPrompt", 
                        "showAddCalendar", "showDelete",
                        "debugPageInfo", "debugContentInfo", "debugBackgroundInfo"];

function isChrome(){
   return /chrom(e|ium)/.test(navigator.userAgent.toLowerCase());
}

function pushPreferences(preferences){
  if(isChrome()){
    $.each(gPreferenceTypes, function(index, key){
        localStorage[key] = preferences[key];
    });
  }
  else {  //firefox
    self.port.emit("SGN_options", {"action": "push_preferences", "preferences":preferences});
  }
}

function pullPreferences(){
  var preferences = {};

  if(isChrome()){
    updateDefaultPreferences(localStorage);
    $.each(gPreferenceTypes, function(index, key){
      preferences[key] = localStorage[key];
    });

    updateControls(preferences);
  }
  else {  //firefox
    //ask background script to post the preferences
    self.port.emit("SGN_options", {action:"pull_preferences"});
    //result would be posted as update_preferences
  }
}

//for firefox only
if(!isChrome()){
  self.port.on("SGN_options", function(request){
    switch(request.action){
      case "update_preferences":
        updateControls(request.preferences);
        break;
      default:
        //ignore it
        break;
    };
  });
}

function showSavedPrompt(){
  $("#status").html("Preferences saved.<br/><br/>Please refresh browser to make the changes effective.<br/><br/>");
  //clean up the text after 0.75 seconds
  setTimeout(function() { 
    $("#status").text("");
  }, 3000);
}

function savePreferences() {
  //var hideListingNotes = $("#hide_listing_notes").is(":checked");
  //localStorage["hideListingNotes"] = hideListingNotes;

  var preferences = {}

  preferences["abstractStyle"] = $("#abstract_style").val();
  preferences["noteHeight"] = $("#note_height").val();
  preferences["fontColor"] = $("#font_color").val();
  preferences["backgroundColor"] = $("#background_color").val();
  preferences["fontSize"] = $("#font_size").val();
  preferences["abstractFontColor"] = $("#abstract_font_color").val();
  preferences["abstractBackgroundColor"] = $("#abstract_background_color").val();
  preferences["abstractFontSize"] = $("#abstract_font_size").val();
  preferences["notePosition"] = $("#note_position").val();
  preferences["showConnectionPrompt"] = String($("#show_connection_prompt").is(":checked"));
  preferences["showAddCalendar"] = String($("#show_add_calendar").is(":checked"));
  preferences["showDelete"] = String($("#show_delete").is(":checked"));

  pushPreferences(preferences);

  showSavedPrompt();
}


function resetPreferences() {
  pushPreferences({});  //clear all existing values

  setTimeout(pullPreferences, 200);  //get the default values
  setTimeout(savePreferences, 400);  //push back the default values
  setTimeout(showSavedPrompt, 600);
}

function updateControls(preferences){
  var abstractStyle = preferences["abstractStyle"];
  $("#abstract_style").val(abstractStyle);


  var noteHeight = preferences["noteHeight"];
  $("#note_height").val(noteHeight);


  var fontColor = preferences["fontColor"];
  $("#font_color").setColor(fontColor.toUpperCase());
  $("#font_color").val(fontColor);


  var backgroundColor = preferences["backgroundColor"];
  $("#background_color").setColor(backgroundColor.toUpperCase());
  $("#background_color").val(backgroundColor);


  var fontSize = preferences["fontSize"];
  $("#font_size").val(fontSize);
      
  var abstractFontColor = preferences["abstractFontColor"];
  $("#abstract_font_color").setColor(abstractFontColor.toUpperCase());
  $("#abstract_font_color").val(abstractFontColor);

  var abstractBackgroundColor = preferences["abstractBackgroundColor"];
  $("#abstract_background_color").setColor(abstractBackgroundColor.toUpperCase());
  $("#abstract_background_color").val(abstractBackgroundColor);

  var abstractFontSize = preferences["abstractFontSize"];
  $("#abstract_font_size").val(abstractFontSize);

  var notePosition = preferences["notePosition"];
  $("#note_position").val(notePosition);

  var showConnectionPrompt = (preferences["showConnectionPrompt"] !== "false");
  $("#show_connection_prompt").prop("checked", showConnectionPrompt);

  var showAddCalendar = (preferences["showAddCalendar"] !== "false");
  $("#show_add_calendar").prop("checked", showAddCalendar);

  var showDelete = (preferences["showDelete"] !== "false");
  $("#show_delete").prop("checked", showDelete);

  $("#debug_page_info").text(String(preferences["debugPageInfo"]));
  $("#debug_content_info").text(String(preferences["debugContentInfo"]));
  $("#debug_background_info").text(String(preferences["debugBackgroundInfo"]));
}


function initPreferences(){
  for(var i=2; i<=50; i++){
    $("#abstract_style").append("<option value=" + i + ">First " + i + " Characters</option>");
  }

  for(var i=1; i<=16; i++){
    $("#note_height").append("<option>" + i + "</option>");
  }


  for(var i=8; i<=20; i++){
    $("#font_size").append("<option>" + i + "</option>");
    $("#abstract_font_size").append("<option>" + i + "</option>");
  }

}

function revokeToken(){
  window.open("https://accounts.google.com/IssuedAuthSubTokens", "_blank");
}

$(document).ready(function(){
  initPreferences();

  $("#save").click(savePreferences);
  $("#reset").click(resetPreferences);
  $("#revoke").click(revokeToken);
  $("#font_color").simpleColor({ displayColorCode: true });
  $("#background_color").simpleColor({ displayColorCode: true });
  $("#abstract_font_color").simpleColor({ displayColorCode: true });
  $("#abstract_background_color").simpleColor({ displayColorCode: true });

  pullPreferences();
});
