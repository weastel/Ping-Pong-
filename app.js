const express = require('express');

var app = express();

app.use('/assets',express.static('assets'));

app.get('/',(req,res)=>{
  res.render('index.ejs');
})

app.get('/vsBots',(req,res)=>{
  res.render('vsBots.ejs');
})

app.get('/vsPlayers',(req,res)=>{
  res.render('vsPlayers.ejs');
})

app.listen(3000);
