  $.ajax({
        type: "POST",
        contentType: "application/x-www-form-urlencoded",
        headers: {
            "Authorization": "Bearer ya29.vgG85zkCllw8LevLoLiGf-i-4wHw3r2vrKVUBuNqQrtglHYaHg9ewXF5IaRzUS-Z8hHCtA"
        },
        data: {
               "refresh_token":"1/Y-xxCW0uOFuIIVGiDX1DiGi48mtYWZ1wqZoUyVTODNY",
              "client_id":"38131814991-p4u809qrr5ee1bsehregd4os69jf2n7i.apps.googleusercontent.com",
              "client_secret":"mdA0U_jSkAjI_1x8pdgtrx02",
              "redirect_uri":"https://jfjkcbkgjohminidbpendlodpfacgmlm.chromiumapp.org/provider_cb",
              "grant_type":"refresh_token"
        },
        url: "https://www.googleapis.com/oauth2/v3/token"
    })

  $.ajax({
        type: "POST",
        contentType: "application/x-www-form-urlencoded",
        headers: {
            "Authorization": "Bearer ya29.vgG85zkCllw8LevLoLiGf-i-4wHw3r2vrKVUBuNqQrtglHYaHg9ewXF5IaRzUS-Z8hHCtA"
        },
        data: {
               "code":"4/lG67mk1C4ibKz4zSBSWJz9QEmuYHAjW0s45LEEA7nFw",
              "client_id":"38131814991-p4u809qrr5ee1bsehregd4os69jf2n7i.apps.googleusercontent.com",
              "client_secret":"mdA0U_jSkAjI_1x8pdgtrx02",
              "redirect_uri":"https://jfjkcbkgjohminidbpendlodpfacgmlm.chromiumapp.org/provider_cb",
              "grant_type":"authorization_code"
        },
        url: "https://www.googleapis.com/oauth2/v3/token"
    })

  $.ajax({
        type: "POST",
        dataType: 'json',
        contentType: "application/json",
        headers: {
            "Authorization": "Bearer ya29.vQF3bkQuVBJRsh6iqimHBL0W6mKPkK-WyYi0yVGUdKHdij6fXJldvhWHUF6FPjH5ijQV"
        },
        data: JSON.stringify({
              "title":"walty_test3",
              "parents": [{"id":"root"}],
              "mimeType": "application/vnd.google-apps.folder"
        }),
        url: "https://www.googleapis.com/drive/v2/files"
    })


$.get("https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=1/fFBGRNJru1FQd44AzqT3Zg")

$.get("https://www.googleapis.com/drive/v2/about?access_token=ya29.wgFJBqmgBsP3rGNFTFfBMhdoO3nmcYohwkfsAlAoATkuUFeLhmiKg2cpc19BKY3yMKN0");

$.get("https://accounts.google.com/o/oauth2/revoke?token=ya29.vgGi7mMes2KVI1oTDE7JPdlubVILWZuKeHCZE89nb5KiL6tQFfrnX9Z4RGNfuloBQEqoSw")

$.get("https://www.googleapis.com/drive/v2/files?access_token=ya29.wwEzCSaKDThm1vEsHdoTZbbfl3J7jxTXxQIJUrmFMCgvpVfm2vfxHsquACIJ41-2ilZC");

$.get("https://www.googleapis.com/drive/v2/files/0ByQKi41qep3JYXVLODB4SGZ4ejA?access_token=ya29.wwGyzSHZ_o8pdkpkBT60z5WT7xjONT56XWL4zxrJa-Zg09FD6XdqM47Gich8tvked9mv&alt=media");

http://stackoverflow.com/questions/20419961/create-a-text-file-in-gdrive-using-javascript


https://developers.google.com/drive/web/quickstart/quickstart-js

https://developers.google.com/drive/web/manage-uploads#simple


