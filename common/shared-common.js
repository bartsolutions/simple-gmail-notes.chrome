//this file should be loaded the first
//I did NOT use the following syntax because the 'window' object does not exist in Firefox background script name space
//window.SimpleNotes = window.SimpleGmailNotes || {}

if (typeof SimpleGmailNotes === 'undefined' || SimpleGmailNotes === null) {
  SimpleGmailNotes = {};
}

SimpleGmailNotes.offlineMessage = "WARNING! Simple Gmail Notes is currently unavailable.\n\n" +
                                   "Please refresh this page to remove the warning. " +
                                   "(Left click the address bar and press the 'Enter' key)";
