var express = require('express');
var router = express.Router();
const geoip = require('geoip-lite');
const sqlite3=require('sqlite3').verbose();
const http=require('http');
const path = require('path');
var cookieParser = require('cookie-parser');
const nodemailer = require("nodemailer");
const passport = require('passport');
const session = require('express-session');
const PassportLocal = require('passport-local').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
require('dotenv').config();


router.use(express.urlencoded({extended: true}));
router.use(cookieParser(process.env.SECRET));

router.use(session({
	secret: process.env.SECRET,
	resave: true,
	saveUninitialized: true
}))


router.use(passport.initialize());
router.use(passport.session());

passport.use( new PassportLocal(function(username, password, done){

	if(username === process.env.USERNAME && password === process.env.PASSWORD)
		return done(null,{id: 1, name: "Gabriel"});

	done(null, false)
}))

passport.serializeUser(function(user, done){
	done(null, user.id)
})

passport.deserializeUser(function(user, done){
	done(null,{id: 1, name: "Gabriel"});
})


const db=path.join(__dirname,"database","basededatos.db");
const db_run=new sqlite3.Database(db, err =>{ 
if (err){
	return console.error(err.message);
}else{
	console.log("DB active");
}
})

const crear="CREATE TABLE IF NOT EXISTS contacts(email VARCHAR(16),nombre VARCHAR(16), comentario TEXT,fecha DATATIME,ip VARCHAR(15), country VARCHAR(20));";

db_run.run(crear,err=>{
	if (err){
	return console.error(err.message);
}else{
	console.log("Tb active");
}
})

router.get('/login',(req,res)=>{
	res.render('login.ejs')
});

router.post('/login', passport.authenticate('local',{
	successRedirect: "/contactos",
	failureRedirect: "/login"
}));

router.get('/',(req,res)=>{
	res.render('index.ejs',{ct:{},
	RECAPTCHA: process.env.RECAPTCHA,
  	ANALYTICS: process.env.ANALYTICS})	
});


router.get('/contactos',(req, res, next)=>{
	if(req.isAuthenticated()) return next();

	res.redirect("/login")
},(req,res)=>{
	const sql="SELECT * FROM contactos;";
	db_run.all(sql, [],(err, rows)=>{
			if (err){
				return console.error(err.message);
			}else{
			res.render("contactos.ejs",{ct:rows});
			}
	})
})

router.post('/',(req,res)=>{
	let today = new Date();
	let hours = today.getHours();
	let minutes = today.getMinutes();
	let seconds = today.getSeconds();
	let fech = today.getDate() + '-' + ( today.getMonth() + 1 ) + '-' + today.getFullYear() +' - '+ hours + ':' + minutes + ':' + seconds + ' ';
  let ip = req.headers["x-forwarded-for"].split(',').pop()??
  req.ip.split(':').pop();
	if (ip){
	let list = ip.split(",");
  ip = list[list.length-1];
	} else {
  ip = req.connection.remoteAddress;
	}
	let geo = geoip.lookup(ip);
 	let country = geo.country;
  const sql="INSERT INTO contacts(email, nombre, comentario, fecha, ip, country) VALUES (?,?,?,?,?,?)";
  const nuevos_mensajes=[req.body.email, req.body.nombre, req.body.comentario,fech,ip,country];
  
  db_run.run(sql, nuevos_mensajes, err =>{
  if (err){
	  return console.error(err.message);
  }
  else{
	  res.redirect("/");
	  }
	  let transporter = nodemailer.createTransport({
				  host: "smtp-mail.outlook.com",
				  secureConnection: false, 
				  port: 587, 
				  auth: {
					  user: process.env.EMAIL,
					  pass: process.env.PASSWORD

				  },
					  tls: {
						ciphers:'SSLv3'
					 }
		  });
			  
			  const recibir_transmitir = {
				  from: process.env.EMAIL,
				  to: 'programacion2ais@dispostable.com',
				  subject: 'Informacion del Nuevo Contacto', 
				  html:`
				  <h1>Task 3 P2</h1>
				  <br>
				  <h3>Información del Nuevo CLiente</h3>
				  <br>
				  <b>Email:</b> ${req.body.email}
				  <br>
				  <b>Nombre:</b> ${req.body.nombre}
				  <br>
				  <b>Comentario:</b> ${req.body.comentario}
				  <br>
				  <b>Fecha y Hora:</b> ${fech}
				  <br>
				  <b>Direccion IP:</b> ${ip}
				  <br>
				  <b>Pais:</b> ${country}`
			  };
			  transporter.sendMail(recibir_transmitir,(err, info) => {
				  if(err)
					  console.log(err)
				  else
					  console.log(info);
				  })
  })
});

router.get('/logout', function(req, res, next) {
	req.session = null;
	cookie = req.cookies;
	res.clearCookie("connect.sid");
	res.redirect('/');
	req.logout(function(err) {
	  if (err) { return next(err); }
	  res.redirect('/');
	});
});

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_ID,
    clientSecret: process.env.FACEBOOK_SECRET,
    callbackURL: "https://p2-27695774.herokuapp.com//auth/facebook/callback"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

router.get('/auth/facebook',
passport.authenticate('facebook'));

router.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/contactos');
});

module.exports = router;
