const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const {check, validationResult} = require('express-validator');
var validator = require('express-validator');
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/CMS', {
    useNewUrlParser: true
});

const fileUpload = require('express-fileupload');
const session = require('express-session');

const Page  = mongoose.model('Page',{
    title: String,
    slug: String,
    image: String,
    content: String
});

const header = mongoose.model('header',{
    tag: String,
    image: String
});

const admin_db = mongoose.model('admin_db', {
    username: String,
    password: String
});

var myApp = express();
myApp.use(session({
    secret: 'ourCMS',
    resave: false,
    saveUninitialized: true
}));
myApp.use(fileUpload());
myApp.use(bodyParser.urlencoded({ extended:false}));
/*myApp.use(validator({
    customValidators: {
      isImage: function(value, filename) {
        var extension = (path.extname(filename)).toLowerCase();
        return extension == '.jpg' || '.png' || '.ico';
      }
    }
  }));

  //requiring the validator
//expressValidator() = require('express-validator');
//the app use part
myApp.use(expressValidator({
customValidators: {
    isImage: function(value, filename) {

        var extension = (path.extname(filename)).toLowerCase();
        switch (extension) {
            case '.jpg':
                return '.jpg';
            case '.jpeg':
                return '.jpeg';
            case  '.png':
                return '.png';
            default:
                return false;
        }
    }
}}));*/
myApp.use(bodyParser.json())

myApp.set('views', path.join(__dirname, 'views'));
myApp.use(express.static(__dirname+'/public'));
myApp.set('view engine', 'ejs');


myApp.get('/',function(req,res){
    Page.find({}).exec(function(err,page){
        header.findOne({}).exec(function(err,header){
            Page.findOne({}).exec(function(err,pages) {
                res.render('home',{pages:pages,header:header,page:page});
            });
        });
    });
});

myApp.get('/single/:anyname',function(req,res){
    var temp = req.params.anyname;
    if(temp =='Pages')
    {
        res.render('/');
    }
    Page.find({}).exec(function(err,page){
        header.findOne({}).exec(function(err,header){
            Page.findOne({slug:temp}).exec(function(err,pages) {
                res.render('dynamicPage',{pages:pages,header:header,page:page});
            });
        });
    });
});

//

//login 
myApp.get('/admin/login',function(req, res){
    res.render('login');
});

myApp.post('/admin/login',[
    check('username','Please Enter the username!').not().isEmpty(),
    check('password','Please enter a valid password!').not().isEmpty(),
],function(req, res){
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        var errorData = {
            errors : errors.array()
        }
        res.render('login', errorData);
    }
    else{
        var username = req.body.username;
        var password = req.body.password;
    
        admin_db.findOne({username:username, password: password}).exec(function(err, admin){
            req.session.username = admin.username;
            req.session.userLoggedIn = true;
            res.redirect('/login');
        });
    }
});

myApp.get('/logout',function(req, res){
    req.session.destroy();
    res.render('logout');
});
myApp.get('/team',function(req, res){
   
    res.render('team');
});
myApp.get('/about',function(req, res){
   
    res.render('about');
});
myApp.get('/login',function(req, res){
    if(req.session.userLoggedIn){
        Page.find({}).exec(function(err, pages){
            res.render('admin', {pages:pages});
        });
    }
    else{
        res.redirect('/admin/login');
    }
});

// Add Pages 

myApp.get('/add',function(req, res){
    if(req.session.userLoggedIn){
        res.render('addpages');
    }
    else{
        res.redirect('/admin/login');
    }
});

myApp.post('/add',[
    check('title', 'Please enter the title!').not().isEmpty(),
    check('content', 'Please enter the content!').not().isEmpty()
],function(req, res){
    const errors = validationResult(req);
  //var  image = typeof req.files['myimage'] !== "undefined" ? req.files['myimage'][0].filename : '';
    //req.checkBody('myimage', 'Please upload an image Jpeg, Png or Gif').isImage(image);
   //req.checkBody('myimage', 'Please select image').isImage(req.files.myfile.name);
    if(!errors.isEmpty()){
        var errorsData = {
            errors: errors.array()
        }
        res.render('addpages', errorsData);
    }
    else{
        var title = req.body.title;
        var slug = req.body.slug;
        var imageName = req.files.image.name;
        var image = req.files.image;
        var imagePath = 'public/images/'+imageName;
        image.mv(imagePath);
        var content = req.body.content;

        var myPages = new Page({
            title: title,
            slug: slug,
            image: imageName,
            content: content
        });
        myPages.save().then( ()=>{
            console.log('New Page Created');
        });
        res.render('added_page');
    }
});

//----------- Edit Page -------------------

myApp.get('/edit_page/:id',function(req, res){
    if(req.session.userLoggedIn){
        var id = req.params.id;
        Page.findOne({_id:id}).exec(function(err, page){
            res.render('edit_page', {page:page});
        }); 
    }
    else{
        res.redirect('/admin/login');
    }
});

myApp.post('/edit_page/:id',[
    check('title', 'Please enter the title').not().isEmpty(),
    check('content', 'Please enter the content').not().isEmpty()
],function(req, res){
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        var errorsData = {
            errors: errors.array()
        }
        res.render('edit_page', errorsData);
    }
    else{
        var id = req.params.id;
        var title = req.body.title;
        var slug = req.body.slug;
        var imageName = req.files.image.name;
        var image = req.files.image;
        var imagePath = 'public/images/'+imageName;
        image.mv(imagePath);
        var content = req.body.content;

        Page.findOne({_id:id}).exec(function(err, page){
            page.title = title;
            page.slug = slug;
            page.image = imageName;
            page.content = content;
            page.save().then( ()=>{
                console.log('Page Edited');
            });
        });
        res.render('edited_page');
    }
});

myApp.get('/delete_page/:id',function(req, res){
    var id = req.params.id;
    Page.findByIdAndDelete({_id:id}).exec(function(err, page){
        res.render('delete_page');
    });  
});

// Edit Header 

myApp.get('/edit_header',function(req, res){
    if(req.session.userLoggedIn){
            header.findOne({}).exec(function(err, header){
            res.render('edit_header', {header:header});
        }); 
    }
    else{
        res.redirect('/admin/login');
    }
});

myApp.post('/edit_header/:id',[
    check('tag', 'Please enter the tagline').not().isEmpty()
    
],function(req, res){
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        var errorsData = {
            errors: errors.array()
        }
        res.render('edit_header', errorsData);
    }
    else{
        var id = req.params.id;
        var tag = req.body.tag;
        var imageName = req.files.myimage.name;
        var image = req.files.myimage;
        var imagePath = 'public/images/'+imageName;
        image.mv(imagePath);

        header.findOne({_id:id}).exec(function(err, header){
            header.tag = tag;
            header.image = imageName;
            header.save().then( ()=>{
                console.log('Header Edited');
            });
        });
        Page.find({}).exec(function(err, pages){
            res.render('admin', {pages:pages});
        });
    }
});

//Start the server 
myApp.listen(8080);
console.log('Server started at 8080 for CMS');