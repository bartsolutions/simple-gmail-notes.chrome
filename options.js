function saveOptions() {
  var hideListingNotes = $("#hide_listing_notes").is(":checked");
  localStorage["hideListingNotes"] = hideListingNotes;
  localStorage["noteHeight"] = $("#note_height").val();
  localStorage["fontColor"] = $("#font_color").val();
  localStorage["backgroundColor"] = $("#background_color").val();
  localStorage["notePosition"] = $("#note_position").val();

  $("#status").text("Options saved.");
  //clean up the text after 0.75 seconds
  setTimeout(function() { 
    $("#status").text("");
  }, 750);
}

function resetOptions() {
  delete localStorage["hideListingNotes"];
  delete localStorage["noteHeight"];
  delete localStorage["fontColor"];
  delete localStorage["backgroundColor"];
  delete localStorage["notePosition"];

  loadOptions();
  saveOptions();
}

function loadOptions() {
  //console.log("@17", localStorage);
  var hideListingNotes = (localStorage["hideListingNotes"] === "true");
  $("#hide_listing_notes").prop("checked", hideListingNotes);

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

}

$(document).ready(function(){
  $("#save").click(saveOptions);
  $("#reset").click(resetOptions);
  $("#font_color").simpleColor({ displayColorCode: true });
  $("#background_color").simpleColor({ displayColorCode: true });

  loadOptions();
});
