function showSavedPrompt(){
  $("#status").html("Preferences saved.<br/><br/>" +
                      "Please refresh browser to make the changes effective." +
                      "<br/><br/>");
  //clean up the text after 0.75 seconds
  setTimeout(function() { 
    $("#status").text("");
  }, 3000);
}

function savePreferences() {
  //var hideListingNotes = $("#hide_listing_notes").is(":checked");
  //localStorage["hideListingNotes"] = hideListingNotes;
  var preferences = {};
  for (var i=0; i < gPreferenceTypes.length; i++) {
    var preferencesName = gPreferenceTypes[i]["name"];
    var jsPreferencesName = "#" + preferencesName;
    var type = gPreferenceTypes[i]["type"];
    if (type === "select" || type === "color" || type === "textarea") {
      preferences[preferencesName] = $(jsPreferencesName).val(); 
    } else if (type === "checkbox") {
      preferences[preferencesName] = String($(jsPreferencesName).is(":checked"));
    }
  }
  var disabledAccounts = [];
  $("#disabledAccounts input").each(function(){
    if($(this).is(":checked")){
      var email = $(this).attr("data-email");
      disabledAccounts.push(email);
    }
  });
  preferences["disabledAccounts"] = JSON.stringify(disabledAccounts);

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
  for (var i=0; i < gPreferenceTypes.length; i++) {
    var preferencesName = gPreferenceTypes[i]["name"];
    var jsPreferencesName = "#" + preferencesName;
    var type = gPreferenceTypes[i]["type"];
    var preferencesVal = preferences[preferencesName]
    if (type === "color" || type === "select" || type === "textarea") {
      if (type === "color") {
        $(jsPreferencesName).setColor(preferencesVal.toUpperCase());
      }
      $(jsPreferencesName).val(preferencesVal);
    } else if (type === "checkbox") {
      $(jsPreferencesName).prop("checked", (preferencesVal !== "false"));
    }
  }
  var disabledAccounts = JSON.parse(preferences["disabledAccounts"]);
  for(var i=0; i < disabledAccounts.length; i++){
    var disable_email = disabledAccounts[i];
    $("#disabledAccounts").append("<label>" +
                                    "<input type=checkbox data-email='" + 
                                      disable_email + "' checked='checked'> " +
                                    disable_email + 
                                    "</label>");
  }
  if(!disabledAccounts.length){
    $("#disabled_accounts_container").hide();
  }

  /*
  $("#debug_page_info").text(String(preferences["debugPageInfo"]));
  $("#debug_content_info").text(String(preferences["debugContentInfo"]));
  $("#debug_background_info").text(String(preferences["debugBackgroundInfo"]));
  $("#debug_gdrive_info").text(String(preferences["debugGdriveInfo"]));
  */
}

function initPreferencesSelect(preferencesName, title, index) {
  var option = gPreferenceTypes[index]["option"];
  var htmlOption = "";
  for (var i=0; i< option.length; i++) {
    var optionValue = option[i]["value"];
    var optionText =  option[i]["text"];
    if (optionValue) {
      htmlOption += "<option value=\"" + optionValue + "\">" + optionText + "</option>";
    } else {
      htmlOption += "<option>" + optionText + "</option>";
    }
  }
  var htmlSelect = "<tr>" +
    "<td>" +
      title +
    "</td>" +
    "<td>" +
      "<div class=select>" +
        "<select id=" + preferencesName + ">" +
          htmlOption +
        "</select>" +
      "</div>" +
    "</td>" +
    "</tr>";
  return htmlSelect;
}

function initPreferencesCheckbox(preferencesName, title, index) {
  var htmlCheckbox = "<tr>" +
    "<td>" +
      "<label for=" + preferencesName + ">" + title + "</label>" +
    "</td>" +
    "<td>" +
      "<input type='checkbox' id=" + preferencesName + ">" +
    "</td>" +
  "</tr>";
  return htmlCheckbox;
}

function initPreferencesInputText(preferencesName, title, index) {
  var htmlInputText = "<tr>" +
    "<td>" +
      title +
    "</td>" +
    "<td>" +
      "<input type=text id=" + preferencesName + ">" +
    "</td>" +
  "</tr>";
  return htmlInputText;
}

function initPreferences(){
  var i;
  var gPreferencePanelNameDict = {"notesAppearance": "", "advancedFeatures": "", "simpleMobileCRM": ""};
  for (var i=0; i < gPreferenceTypes.length; i++) {
    var preferencesName = gPreferenceTypes[i]["name"];
    var type = gPreferenceTypes[i]["type"];
    var title = gPreferenceTypes[i]["title"];
    var panelName = gPreferenceTypes[i]["panelName"];
    var htmlContent = "";
    if (type === 'textarea') {
      continue;
    } else if (type === "select") {
      var htmlContent = initPreferencesSelect(preferencesName, title, i);
    } else if (type === "color") {
      var htmlContent = initPreferencesInputText(preferencesName, title, i);
    } else if (type === "checkbox") {
      var htmlContent = initPreferencesCheckbox(preferencesName, title, i);
    }
    gPreferencePanelNameDict[panelName] += htmlContent;
  }
  var gPreferencePanelNameList =  Object.keys(gPreferencePanelNameDict);
  for (var i =0; i < gPreferencePanelNameList.length; i++) {
    var gPreferencePanelName = "#" + gPreferencePanelNameList[i];
    $(gPreferencePanelName).append(gPreferencePanelNameDict[gPreferencePanelNameList[i]]);
  }
  for(i=2; i<=10; i++){
    $("#abstractStyle").append("<option value=" + i + ">First " + i + " Characters</option>");
  }

  for(i=3; i<=10; i++){
    $("#abstractStyle").append("<option value=" + i*5 + ">First " + i*5 + " Characters</option>");
  }
  
  for(i=1; i<=30; i++){
    $("#noteHeight").append("<option>" + i + "</option>");
  }


  for(i=8; i<=20; i++){
    $("#fontSize").append("<option>" + i + "</option>");
    $("#abstractFontSize").append("<option>" + i + "</option>");
  }

}

function initDebugMessage(){
  background = SimpleGmailNotes.getBrowser().extension.getBackgroundPage();
  var sgno = background.SimpleGmailNotes;
  var pageInfo = sgno.getLog(background.debugPageScope);
  var contentInfo = sgno.getLog(background.debugContentScope);
  var backgroundInfo = sgno.getLog(background.debugBackGroundScope);
  var gdriveInfo = sgno.getLog(background.debugGdriveScope);

  $("#debug_page_info").text(pageInfo);
  $("#debug_content_info").text(contentInfo);
  $("#debug_background_info").text(backgroundInfo);
  $("#debug_gdrive_info").text(gdriveInfo);
  //$("#debug_gdrive_info").text(String(preferences["debugGdriveInfo"]));


}

function revokeToken(){
  window.open("https://accounts.google.com/IssuedAuthSubTokens", "_blank");
}

$(document).ready(function(){
  initPreferences();
  var SGNO = SimpleGmailNotes;

  for (var i=0; i < gPreferenceTypes.length; i++) {
    var type = gPreferenceTypes[i]["type"];
    if (type === "color") {
      var preferencesName = gPreferenceTypes[i]["name"];
      var jsPreferencesName = "#" + preferencesName;
      $(jsPreferencesName).simpleColor({ displayColorCode: true, chooserCSS: {'z-index': '999'}}); 
    }
  }

  $("#save").click(savePreferences);
  $("#reset").click(resetPreferences);
  $("#revoke").click(revokeToken);
  $("#donation").attr("href", SGNO.getDonationUrl("pr"));
  $("#contact_us").attr("href", SGNO.getOfficalSiteUrl("pr"));

  $("#bart_logo").attr("href", SGNO.getOfficalSiteUrl("pr"));
  $("#support").attr("href", SGNO.getSupportUrl());
  $("#review").attr("href", SGNO.getReviewUrl());

  pullPreferences();

  initDebugMessage();
});
