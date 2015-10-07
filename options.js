function saveOptions() {
  var hideListingNotes = $("#hide_listing_notes").is(":checked");
  localStorage["hideListingNotes"] = hideListingNotes;

  $("#status").text("Options saved.");
  //clean up the text after 0.75 seconds
  setTimeout(function() { 
    $("#status").text("");
  }, 750);
}

function loadOptions() {
  //console.log("@17", localStorage);
  var hideListingNotes = (localStorage["hideListingNotes"] === "true");
  $("#hide_listing_notes").prop("checked", hideListingNotes);
}

$(document).ready(function(){
  $("#save").click(saveOptions);
  loadOptions();
});
