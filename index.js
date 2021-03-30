const fs = require("fs");
const express = require("express");
const multer = require("multer");
const dropboxV2Api = require("dropbox-v2-api");
const app = express();
const port = 5000;
app.set("view engine", "ejs");

let authed = false;

var Storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, "./images");
  },
  filename: function (req, file, callback) {
    callback(null, file.fieldname + "_" + Date.now() + "_" + file.originalname);
  },
});

var upload = multer({
  storage: Storage,
}).single("file"); //Field name and max count

const dropbox = dropboxV2Api.authenticate({
  client_id: "r14g5bsq6iseoap",
  client_secret: "vvpbycdtxnpcr3l",
  redirect_uri: "http://localhost:5000/oauth",
});

app.get("/", (req, res) => {
  if (!authed) {
    //generate and visit authorization sevice
    const authUrl = dropbox.generateAuthUrl();
    res.render("index", { url: authUrl });
  } else {
    res.render("success", {
      success: false,
    });
  }
});

app.get("/oauth", (req, res) => {
  var code = req.query.code;
  if (code) {
    //after redirection, you should receive code
    dropbox.getToken(code, (err, result, response) => {
      if (err) {
        throw err;
      }
      authed = true;
      res.redirect("/");
      console.log("Result", result);
      console.log("Response", response);
    });
  }
});

app.post("/upload", (req, res) => {
  if (authed) {
    upload(req, res, function (err) {
      if (err) {
        console.log(err);
        return res.end("Something went wrong");
      } else {
        console.log(req.file);
        const filename = req.file.filename;
        const path = req.file.path;

        dropbox(
          {
            resource: "files/create_folder",
            parameters: {
              path: "/Custom",
              autorename: false,
            },
          },
          (err, result, response) => {
            if (err) {
              throw err;
            }
            const toPathToUpload = result.metadata.path_display;
            dropbox(
              {
                resource: "files/upload",
                parameters: {
                  path: toPathToUpload + "/" + filename,
                },
                readStream: fs.createReadStream(path),
              },
              (err, result, response) => {
                //upload completed
                if (err) {
                  throw err;
                }
                res.render("success", {
                  success: true,
                });
                console.log("Upload Res", result);
                console.log("Upload Res", response);
              }
            );
          }
        );
      }
    });
  }
});

app.get("/logout", (req, res) => {
  authed = false;
  res.redirect("/");
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
