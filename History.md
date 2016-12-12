** Version History **

- 0.7.4 
 * changed donation link
 * temporarily disable upgrade notification

- 0.7.3 
 * added donation information
 * updated logic for safe guarding
 * updated max note height

- 0.7.2 
 * fixed problem of first time login in split view

- 0.7.1 
 * added a bunch of logging in order to get to the culprit

- 0.7.0 
 * added tracking for most errors on page (The data would be submitted only when the user actively copy & paste from the debug info section).
 * fixed problem of note deletion (via making it empty)

- 0.6.7 
 * reverted to 0.6.3..  :(

- 0.6.6 
 * ok, I give up.. I reverted to the old way of script injection. The abstract display of first page may have occasional problem, but still better than disable of extension.

- 0.6.5 
 * added prompt for update
 * attempted to fix plugin loading problem due to new injection mechanism
 * added more details into debugInfo

- 0.6.4 
 * updated heart beat mechanism
 * use new way to inject scripts

- 0.6.3 
 * fixed problem for abstract update after editing

- 0.6.2 
 * fixed problem for special labels

- 0.6.1 
 * add back duplicate network requests safeguard 

- 0.6.0 
Major revamp in data collection logic, would not use additional network requests to get the email info.

- 0.5.4 
(Thanks janeklb for the contribution)

 * allows text area to be displayed at side *top or side *bottom (see the preferences page)

- 0.5.3 
 * fix problem if use default inbox, but do not use any smart label

- 0.5.2 
 * Added FAQ and bug report instructions in the preferences page

- 0.5.1 
 * Fix abstract problem for default inbox view

- 0.5.0 
 * New button of ‘Add to Calendar' (can be disabled in the preferences page)
 * Show abstracts for emails having label with '+' sign
 * Fixed abstract display for multiple pages
 * Upgrade jQuery from 1.11.3 to to 3.1.0 (as requested by Firefox addon reviewer)
 * Change default background color to light yellow
 * Allow deletion of labels

- 0.4.20 
 * Request page refresh if (automatic) update of extension is detected. It's suspected to be the main reason of recent account locking incidences.

- 0.4.19 
 * update pull logic based on the latest bug report statistics

- 0.4.18 
 * disable network requests if there are 20 consecutive network requests in short time.

- 0.4.17 
 * Slow down retry, even if note pulling failed

- 0.4.16 
 * attempted fix for abstract display after occasional pull problem

- 0.4.15 
 * fix problem of slow abstract display after the first log in

- 0.4.14 
 * fix latest problem of note display under split view

- 0.4.13 
 * fixed issue with latest Gmail split view

- 0.4.12 
 * fixed bug with abstract display during compose window open

- 0.4.11 
 * fixed bug with abstract display in nested label
 * fixed bug with message display in preview pane + sent box

- 0.4.10 
 * Hide the abstract & note if the note is trashed in Google Drive (need a refresh of browser to clean up the cache).

- 0.4.9 
 * Fixed bug of abstract missing for archived email

- 0.4.8 
 * Fixed bug of multiple textarea under split view

- 0.4.7 
 * Allows customization of font size

- 0.4.6 
 * Fix minor bug related with logout
 * Logout would only clean tokens of local storage
 * To revoke the granted access token,user could click the 'Manage Tokens' button of options page.

- 0.4.5 
 * Allows color customization for note abstract in the email summary page.

- 0.4.4 
 * Fix problem with abstract display in 'Sent Mail' page

- 0.4.3 
 * Option to hide connection prompt
 * Fix problem with abstract display

- 0.4.2 
 * Support vertical split and horizontal split

- 0.4.1 
 * Add icons for logout, search and preferences
 * Allow customization of abstract length

- 0.4.0 
 * Allow customization of font color, background color and note position
 * Updated logic local token invalidation

- 0.3.6 
 * show email title in the notes
 * add a shortcut to search notes
 * fixed problem of occasional loading problem

- 0.3.5 
 * major security fixes

- 0.3.2 
 * enhanced stability for note abstract display in the email listing page

- 0.3.0 
 * Show note abstract in the email listing page, e.g. the inbox or search result page. The abstract is the first 20 characters of the note.
 * Only the newly added/updated notes after extension upgrade would be shown in the listing page. (A new metadata needs to be added to the Google Drive file)
 * You could disable this new feature in the extension preference page. See the screen shots for instructions.

- 0.2.0 
 * Optimization in note search logic
