function saveOptions() {
  //var hideListingNotes = $("#hide_listing_notes").is(":checked");
  //localStorage["hideListingNotes"] = hideListingNotes;

  localStorage["abstractStyle"] = $("#abstract_style").val();
  localStorage["noteHeight"] = $("#note_height").val();
  localStorage["fontColor"] = $("#font_color").val();
  localStorage["backgroundColor"] = $("#background_color").val();
  localStorage["notePosition"] = $("#note_position").val();
  localStorage["showConnectionPrompt"] = $("#show_connection_prompt").is(":checked");


  $("#status").html("Options saved.<br/><br/>Please refresh browser to make the changes effective.<br/><br/>");
  //clean up the text after 0.75 seconds
  setTimeout(function() { 
    $("#status").text("");
  }, 3000);
}

function resetOptions() {
  delete localStorage["hideListingNotes"];
  delete localStorage["abstractStyle"];

  delete localStorage["noteHeight"];
  delete localStorage["fontColor"];
  delete localStorage["backgroundColor"];
  delete localStorage["notePosition"];
  delete localStorage["showConnectionPrompt"];

  loadOptions();
  saveOptions();
}

function loadOptions() {
  //console.log("@17", localStorage);
  //hideListingNotes is not used anymore, the following code is for backward compatible
  var hideListingNotes = (localStorage["hideListingNotes"] === "true");
  //$("#hide_listing_notes").prop("checked", hideListingNotes);
  if(hideListingNotes){
    localStorage["abstractStyle"] = "none";
    delete localStorage["hideListingNotes"];
  }


  var abstractStyle = localStorage["abstractStyle"];
  if(!abstractStyle)
    abstractStyle = 20; //default to 20 characters
  $("#abstract_style").val(abstractStyle);


  var noteHeight = localStorage["noteHeight"];
  if(!noteHeight)
    noteHeight = 4;
  $("#note_height").val(noteHeight);


  var fontColor = localStorage["fontColor"];
  if(!fontColor)
    fontColor = "#808080";
  $("#font_color").setColor(fontColor);
  $("#font_color").val(fontColor);


  var backgroundColor = localStorage["backgroundColor"];
  if(!backgroundColor)
    backgroundColor = "#FFFFFF";
  $("#background_color").setColor(backgroundColor);
  $("#background_color").val(backgroundColor);

  var notePosition = localStorage["notePosition"];
  if(!notePosition)
    notePosition = "top";
  $("#note_position").val(notePosition);

  var showConnectionPrompt = (localStorage["showConnectionPrompt"] !== "false");
  $("#show_connection_prompt").prop("checked", showConnectionPrompt);

}

function initOptions(){
  for(var i=2; i<=30; i++){
    $("#abstract_style").append("<option value=" + i + ">First " + i + " Characters</option>");
  }

  for(var i=1; i<=8; i++){
    $("#note_height").append("<option>" + i + "</option>");
  }

}

$(document).ready(function(){
  initOptions();

  $("#save").click(saveOptions);
  $("#reset").click(resetOptions);
  $("#font_color").simpleColor({ displayColorCode: true });
  $("#background_color").simpleColor({ displayColorCode: true });

  loadOptions();
});
