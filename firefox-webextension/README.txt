To build a Firefox WebExtension, just copy the 3 JS files here (background.js,
content.js and page.js) here to the parent directory, i.e. 

	cp *.js ../

And now the folder would act as a Firefox WebExtension. You could use debug ->
load temporary addon in FF to load the extension.

However, at least Firefox 53 is required, because the extension requires the
new OAuth API of Firefox.
