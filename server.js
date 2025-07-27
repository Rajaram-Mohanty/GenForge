const express = require("express");
const app = express();
const path = require("path");
const methodOverride = require("method-override");


app.set("view engine", "ejs");
app.set("views", path.join(__dirname , "views"));               //Express will look inside this folder to find files to render while using res.render().
app.use(express.urlencoded({extended: true}));                  //This is a middleware that parses incoming form data when post or put request is used.
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "/public")));                  //this is used to make separated boilerplate for all the pages that have things in common. but dont confuse it with includes, it is used to have mofularity in the webpages means modules for every section.


app.listen(3000, () => {
    console.log(`Vist http://localhost:${3000}`);
});

app.get("/",(req,res)=> {
    res.send("this is the home page");
})