const express=require('express');
const app=express();

const bcrypt=require('bcrypt');

const jwt=require('jsonwebtoken');

const cookieParser=require('cookie-parser')
app.use(cookieParser());

app.set('view engine','ejs');

app.use(express.json());
app.use(express.urlencoded({extended:true}));

const path=require('path');
app.use(express.static(path.join(__dirname,'public')));

const userModel=require('./models/user');
const postModel=require('./models/post')

app.get('/',(req,res)=>{
    res.render('index');
})

app.post('/register',async (req,res)=>{
    let user=await userModel.findOne({email:req.body.email});
    if(user)return res.status(500).send("User already registered");
    else{
        bcrypt.genSalt(10, function(err, salt) {
            bcrypt.hash(req.body.password, salt, async function(err, hash) {
                let createdUser=await userModel.create({
                    username: req.body.username,
                    name:req.body.name,
                    age:req.body.age,
                    email:req.body.email,
                    password:hash
                });
                const token = jwt.sign({ email: req.body.email , userid: createdUser._id}, 'shhhhh');
                res.cookie('token',token);
                res.redirect("/login");
            });
        });
    }
})

app.get('/login',(req,res)=>{
    res.render('login');
})

app.post('/login',async (req,res)=>{
    let user=await userModel.findOne({email:req.body.email});
    if(!user)return res.status(500).send("Something went wrong");
    else{
        bcrypt.compare(req.body.password, user.password, function(err, result) {
            if(result) {
                const token = jwt.sign({ email: req.body.email , userid: user._id}, 'shhhhh');
                res.cookie('token',token);
                res.status(200).redirect("/profile");
            }
            else res.redirect('/login'); 
        });
    }
})

app.get('/logout',(req,res)=>{
    res.cookie('token','')
    res.redirect('/login');
})

app.get('/profile',isLoggedIn,async (req,res)=>{
    let user=await userModel.findOne({email:req.user.email}).populate("posts");
    let allusers=await userModel.find().populate("posts");
    console.log(user);
    res.render("profile",{user,allusers});
})

app.post('/post',isLoggedIn,async (req,res)=>{
    let user=await userModel.findOne({email:req.user.email});
    let createdPost=await postModel.create({
        user:user._id,
        content:req.body.content,
    })
    user.posts.push(createdPost._id);
    await user.save();
    res.redirect('/profile');
})

app.get('/like/:id',isLoggedIn, async (req,res)=>{
    let post=await postModel.findOne({_id:req.params.id}).populate('user');
    let user=await userModel.findOne({email:req.user.email});
    if(post.likes.indexOf(user._id)===-1){
    post.likes.push(user._id);}
    else{
        post.likes.splice(post.likes.indexOf(user._id),1);
    }
    await post.save();
    console.log(post);
    res.redirect('/profile')
})

app.post('/edit/:id',isLoggedIn, async (req,res)=>{
    let post=await postModel.findOneAndUpdate({_id:req.params.id},{content:req.body.content});
    res.redirect('/profile');
})

app.get('/edit/:id',isLoggedIn, async (req,res)=>{
    let post=await postModel.findOne({_id:req.params.id}).populate('user');
    res.render('edit',{post});
})

function isLoggedIn(req,res,next){
    if(req.cookies.token==="")res.redirect("/login");
    else{
        let data=jwt.verify(req.cookies.token,'shhhhh');
        req.user=data;
        next();
    }
    }

app.listen(3000);