const express = require('express')
const bodyParser = require('body-parser')
const samlify = require('samlify')
const exphbs = require('express3-handlebars');
const fs = require('fs')
const validator = require('@authenio/samlify-xsd-schema-validator')

samlify.setSchemaValidator(validator);

const app = express()

app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');

// setup body-parser
app.use(bodyParser.json({ limit: '5000kb' }))
app.use(bodyParser.raw({ limit: '5000kb' }))
app.use(bodyParser.urlencoded({ extended: false, limit: '5000kb' }))
app.use(bodyParser.text({ type: 'text/xml' }))

const idp = samlify.IdentityProvider({
  metadata: fs.readFileSync('./metadata/idp.xml')
});

const sp = samlify.ServiceProvider({
  metadata: fs.readFileSync('./metadata/sp.xml')
});

app.get("/", (req, res) => {
  res.render('home');
})

app.get('/sso-redirect', (req, res) => {
  const redirect = sp.createLoginRequest(idp, 'redirect');
  const { id, context } = redirect
  console.log(redirect)
  return res.redirect(context);
});

app.get('/sso-redirect', (req, res) => {
  res.render('actions', sp.createLoginRequest(idp, 'post'));
});

app.post('/acs', (req, res) => {
  sp.parseLoginResponse(idp, 'post', req)
    .then(parseResult => {
      res.json(parseResult)
    })
    .catch(console.error);
});

app.get('/metadata', (req, res) => {
  res.header('Content-Type', 'text/xml').send(sp.getMetadata());
});

app.get('/metadata-dp', (req, res) => {
  res.header('Content-Type', 'text/xml').send(idp.getMetadata());
});

app.post('/error', (req, res) => {
  sp.parseLoginResponse(idp, 'post', req)
    .then(parseResult => {
      res.end(parseResult)
    })
    .catch(err => {
      res.send(err)
    });

  // buf = new Buffer(req.body.SAMLResponse, 'base64')
  // res.header('Content-type', 'text/xml')
  // res.send(buf.toString())
})

app.listen(3001, err => {
  if (err) {
    console.error(err)
  } else {
    console.log('server listening on 3001')
  }
})