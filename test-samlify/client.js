const express = require('express')
const bodyParser = require('body-parser')
const samlify = require('samlify')
const exphbs = require('express3-handlebars');
const fs = require('fs')
const validator = require('@authenio/samlify-xsd-schema-validator')

samlify.setSchemaValidator(validator);

const idp = samlify.IdentityProvider({
  metadata: fs.readFileSync('./metadata/signed-idp.xml'),
});

const sp = samlify.ServiceProvider({
  metadata: fs.readFileSync('./metadata/signed-sp.xml'),
  // 下面两行代码只有在需要request sign的时候才需要
  privateKey: fs.readFileSync('./certs/sp-encrypt-key.pem'),
  requestSignatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha512'
});

const app = express()

app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');

// setup body-parser
app.use(bodyParser.json({ limit: '5000kb' }))
app.use(bodyParser.raw({ limit: '5000kb' }))
app.use(bodyParser.urlencoded({ extended: false, limit: '5000kb' }))
app.use(bodyParser.text({ type: 'text/xml' }))

app.get("/", (req, res) => {
  res.render('SP Home');
})

app.get('/metadata', (req, res) => {
  res.header('Content-Type', 'text/xml').send(sp.getMetadata());
});

// SP
app.get('/sso-redirect', (req, res) => {
  const { id, context } = sp.createLoginRequest(idp, 'redirect');
  return res.redirect(context);
});

app.get('/sso-post', (req, res) => {
  res.render('actions', sp.createLoginRequest(idp, 'post'));
});

app.post('/acs', (req, res) => {
  sp.parseLoginResponse(idp, 'post', req)
    .then(parseResult => {
      res.json(parseResult)
    })
    .catch(console.error);
});

app.post('/error', (req, res) => {
  sp.parseLoginResponse(idp, 'post', req)
    .then(parseResult => {
      res.end(parseResult)
    })
    .catch(err => {
      res.send(err)
    });
})

app.use((err, req, res, next) => {
  res.send(err)
})

app.listen(3001, err => {
  if (err) {
    console.error(err)
  } else {
    console.log('server listening on 3001')
  }
})