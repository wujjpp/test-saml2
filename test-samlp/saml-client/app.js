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
  return res.redirect(context);
});

app.post('/sso-redirect', (req, res) => {
  res.render('actions', sp.createLoginRequest(idp, 'post'));
});

app.post('/acs', (req, res) => {
  sp.parseLoginResponse(idp, 'post', req)
    .then(parseResult => {
      res.json(parseResult)
      // res.header('Content-Type', 'text/xml').send(parseResult.samlContent)
    })
    .catch(console.error);
});

app.get('/metadata', (req, res) => {
  res.header('Content-Type', 'text/xml').send(sp.getMetadata());
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