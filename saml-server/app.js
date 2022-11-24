const express = require('express')
const samlp = require('samlp')
const session = require('express-session')
const fs = require('fs')
const path = require('path')
const bodyParser = require('body-parser')

const app = express()

// setup body-parser
app.use(bodyParser.json({ limit: '5000kb' }))
app.use(bodyParser.raw({ limit: '5000kb' }))
app.use(bodyParser.urlencoded({ extended: false, limit: '5000kb' }))
app.use(bodyParser.text({ type: 'text/xml' }))

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

app.get('/saml/metadata.xml', samlp.metadata({
  issuer: 'qcc',
  cert: fs.readFileSync(path.join(__dirname, 'some-cert.pem')),
  redirectEndpointPath: '/saml/auth',
  postEndpointPath: '/saml/auth',
  logoutEndpointPaths: {
    redirect: '/saml/logout',
    post: '/saml/logout'
  }
}));

app.get('/saml/auth', /* should added your authentication middleware */ samlp.auth({
  issuer: 'qcc',
  cert: fs.readFileSync(path.join(__dirname, 'some-cert.pem')),
  key: fs.readFileSync(path.join(__dirname, 'some-cert.key')),

  getPostURL: function (audience, samlRequestDom, req, callback) {
    const acs = samlRequestDom?.documentElement?.getAttributeNode("AssertionConsumerServiceURL")?.nodeValue
    return callback(null, acs)
  },

  getUserFromRequest: function (req) {
    return req.session?.user
  }
}))


app.post('/saml/auth', /* should added your authentication middleware */ samlp.auth({
  issuer: 'qcc',
  cert: fs.readFileSync(path.join(__dirname, 'some-cert.pem')),
  key: fs.readFileSync(path.join(__dirname, 'some-cert.key')),

  getPostURL: function (audience, samlRequestDom, req, callback) {
    const acs = samlRequestDom?.documentElement?.getAttributeNode("AssertionConsumerServiceURL")?.nodeValue
    return callback(null, acs)
  },

  getUserFromRequest: function (req) {
    return req.session?.user
  }
}))

app.get('/saml/logout', samlp.logout({
  deflate: true,
  issuer: 'qcc',
  protocolBinding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect',
  cert: fs.readFileSync(path.join(__dirname, 'some-cert.pem')),
  key: fs.readFileSync(path.join(__dirname, 'some-cert.key'))
}));

app.post('/saml/logout', samlp.logout({
  issuer: 'qcc',
  protocolBinding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
  cert: fs.readFileSync(path.join(__dirname, 'some-cert.pem')),
  key: fs.readFileSync(path.join(__dirname, 'some-cert.key'))
}));

app.use((err, req, res, next) => {
  samlp.sendError({
    RelayState: 'relayState',
    issuer: 'qcc',
    signatureAlgorithm: 'rsa-sha1',
    digestAlgorithm: 'sha1',
    cert: fs.readFileSync(path.join(__dirname, 'some-cert.pem')),
    key: fs.readFileSync(path.join(__dirname, 'some-cert.key')),
    error: { description: err.message },
    getPostURL: function (req, callback) {
      callback(null, 'http://127.0.0.1:3001/error');
    }
  })(req, res, next);
})

app.listen(3000, err => {
  if (err) {
    console.error(err.message)
  } else {
    console.log('server listening on 3000')
  }
})