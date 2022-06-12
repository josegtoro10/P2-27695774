var express = require('express');
var router = express.Router();
const geoip = require('geoip-lite');
const sqlite3=require('sqlite3').verbose();
const http=require('http');
const path = require('path');
const nodemailer = require("nodemailer");
require('dotenv').config();

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

router.get('/',(req,res)=>{
	res.render('index.ejs',{ct:{},
	RECAPTCHA: process.env.RECAPTCHA,
  	ANALYTICS: process.env.ANALYTICS})	
});


router.get('/contactos',(req,res)=>{
	const sql="SELECT * FROM contacts;";
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


module.exports = router;
