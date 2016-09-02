/*
 * Simple Gmail Notes 
 * https://github.com/walty8
 * Copyright (C) 2015 Walty Yeung <walty8@gmail.com>
 *
 * This script is going to be shared for both Firefox and Chrome extensions.
 */

window.SimpleGmailNotes = window.SimpleGmailNotes || {};

/*
 * Utilities
 */
SimpleGmailNotes.htmlEscape = function(str) {
    return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
}

SimpleGmailNotes.htmlUnescape = function(value){
    return String(value)
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
}

//http://stackoverflow.com/questions/4434076/best-way-to-alphanumeric-check-in-javascript#25352300
SimpleGmailNotes.isAlphaNumeric = function(str) {
  var code, i, len;

  for (i = 0, len = str.length; i < len; i++) {
    code = str.charCodeAt(i);
    if (!(code > 47 && code < 58) && // numeric (0-9)
        !(code > 64 && code < 91) && // upper alpha (A-Z)
        !(code > 96 && code < 123)) { // lower alpha (a-z)
      return false;
    }
  }
  return true;
};

//http://stackoverflow.com/questions/46155/validate-email-address-in-javascript#1373724
SimpleGmailNotes.isValidEmail = function(email) {
  var re = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i; 
  return re.test(email);
}

SimpleGmailNotes.isDebug = function(callback) {
	return false;
}
  
SimpleGmailNotes.debugLog = function()
{
  var debugStatus = SimpleGmailNotes.isDebug();
  if (debugStatus) {
      console.log.apply(console, arguments);
  }
}

//http://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery#22429679
SimpleGmailNotes.hashFnv32a = function(str, asString, seed) {
  if(!str)
    return "";

	if(!asString)
		asString = true;

  /*jshint bitwise:false */
  var i, l,
      hval = (seed === undefined) ? 0x811c9dc5 : seed;

  for (i = 0, l = str.length; i < l; i++) {
    hval ^= str.charCodeAt(i);
    hval += (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) + (hval << 24);
  }
  if( asString ){
    // Convert to 8 digit hex string
    return ("0000000" + (hval >>> 0).toString(16)).substr(-8);
  }
  return hval >>> 0;
}

SimpleGmailNotes.getHashedKey = function(title, sender, time){
	var emailKey = SimpleGmailNotes.composeEmailKey(title, sender, time);
	var hashedKey = SimpleGmailNotes.hashFnv32a(emailKey);
	SimpleGmailNotes.debugLog("Composed mail key: " + emailKey + "hash key: " + hashedKey);
	return hashedKey;
}

SimpleGmailNotes.stripHtml = function(value){
  return value.replace(/<(?:.|\n)*?>/gm, '');
}

SimpleGmailNotes.composeEmailKey = function(title, sender, time){
  var emailKey = sender + "|" + time + "|" + SimpleGmailNotes.stripHtml(title);

  //in case already escaped
  emailKey = SimpleGmailNotes.htmlEscape(emailKey);
  return emailKey;
}
