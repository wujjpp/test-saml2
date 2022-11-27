const express = require('express')
const bodyParser = require('body-parser')
const samlify = require('samlify')
const exphbs = require('express3-handlebars');
const fs = require('fs')
const validator = require('@authenio/samlify-xsd-schema-validator')
const session = require('express-session')

samlify.setSchemaValidator(validator);

const idp = samlify.IdentityProvider({
  metadata: fs.readFileSync('./metadata/signed-idp.xml'),
  wantLogoutRequestSigned: true
});

const sp = samlify.ServiceProvider({
  metadata: fs.readFileSync('./metadata/signed-sp.xml'),
  // 下面两行代码只有在需要request sign的时候才需要
  privateKey: fs.readFileSync('./certs/sp-encrypt-key.pem'),
  requestSignatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha512',
  wantLogoutRequestSigned: true
});

const app = express()

app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true }
}))

// always recognized as signed in 
app.use((req, res, next) => {
  if (!req.session.user) {
    req.session.user = {
      id: 1,
      emails: ['wujp@greatld.com'],
      displayName: 'Wu Jian Ping',
      name: {
        givenName: 'Jian Ping',
        familyName: 'Wu'
      }
    }
  }
  next()
})

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
app.get('/sso-login-redirect', (req, res) => {
  const { id, context } = sp.createLoginRequest(idp, 'redirect');
  return res.redirect(context);
});

app.get('/sso-login-post', (req, res) => {
  res.render('actions', sp.createLoginRequest(idp, 'post'));
});

app.get('/sso-logout-redirect', (req, res) => {
  const data = sp.createLogoutRequest(idp, 'redirect', req.session.user);
  const { id, context } = data
  return res.redirect(context);
});

app.post('/acs', (req, res) => {
  sp.parseLoginResponse(idp, 'post', { query: req.query, body: req.body })
    .then(parseResult => {
      res.json(parseResult)
    })
    .catch(console.error);
});

app.get('/acs', (req, res) => {
  let octetString = ""
  if (req.query.SAMLRequest) {
    octetString += "SAMLRequest=" + encodeURIComponent(req.query.SAMLRequest)
  }
  else if (req.query.SAMLResponse) {
    octetString += "SAMLResponse=" + encodeURIComponent(req.query.SAMLResponse)
  }
  if (req.query.RelayState) {
    octetString += "&RelayState=" + encodeURIComponent(req.query.RelayState)
  }
  if (req.query.SigAlg) {
    octetString += "&SigAlg=" + encodeURIComponent(req.query.SigAlg)
  }

  sp
    .parseLoginResponse(idp, 'redirect', { query: req.query, body: req.body, octetString: octetString })
    .then(parseResult => {
      res.json(parseResult)
    })
    .catch(console.error);
});

app.get('/logout', (req, res, next) => {
  let octetString = ""
  if (req.query.SAMLRequest) {
    octetString += "SAMLRequest=" + encodeURIComponent(req.query.SAMLRequest)
  }
  else if (req.query.SAMLResponse) {
    octetString += "SAMLResponse=" + encodeURIComponent(req.query.SAMLResponse)
  }
  if (req.query.RelayState) {
    octetString += "&RelayState=" + encodeURIComponent(req.query.RelayState)
  }
  if (req.query.SigAlg) {
    octetString += "&SigAlg=" + encodeURIComponent(req.query.SigAlg)
  }
  response = sp
    .parseLogoutResponse(idp, 'redirect', {
      query: req.query,
      body: req.body,
      octetString: octetString
    })
    .then(parseResult => {
      console.log(parseResult)
      res.json(parseResult)
    })
    .catch(next)
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