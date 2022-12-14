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
  privateKey: fs.readFileSync('./certs/dp-encrypt-key.pem'),
});

const sp = samlify.ServiceProvider({
  metadata: fs.readFileSync('./metadata/signed-sp.xml'),
});

const app = express()

app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');

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

app.get("/", (req, res) => {
  res.render('DP Home');
})

app.get('/metadata', (req, res) => {
  res.header('Content-Type', 'text/xml').send(idp.getMetadata());
});

// DP
app.get('/saml/auth', async (req, res, next) => {
  try {
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
    const requestData = await idp.parseLoginRequest(sp, 'redirect', {
      query: req.query,
      body: req.body,
      octetString: octetString
    })
    const responseData = await idp.createLoginResponse(sp, requestData, 'redirect', req.session.user)
    const { id, context } = responseData
    res.redirect(context)

    //     const responseData = await idp.createLoginResponse(sp, requestData, 'post', req.session.user)
    //     const { id, context: SAMLResponse, entityEndpoint: spAcsUrl } = responseData
    //     return res.header('Content-Type', 'text/html').send(`
    // <html>
    //   <body>
    //     <form id="sso" method="post" action="${spAcsUrl}" autocomplete="off">
    //       <input type="hidden" name="SAMLResponse" id="resp" value="${SAMLResponse}" />
    //     </form>
    //     <script language="javascript" type="text/javascript">
    //         window.setTimeout(function(){document.forms[0].submit();}, 0);
    //     </script>
    //   </body>
    // </html>
    // `);
  }
  catch (err) {
    next(err)
  }
})

app.post('/saml/auth', async (req, res, next) => {
  try {
    const requestData = await idp.parseLoginRequest(sp, 'post', { query: req.query, body: req.body })
    const responseData = await idp.createLoginResponse(sp, requestData, 'post', req.session.user)
    const { id, context: SAMLResponse, entityEndpoint: spAcsUrl } = responseData
    return res.header('Content-Type', 'text/html').send(`
<html>
  <body>
    <form id="sso" method="post" action="${spAcsUrl}" autocomplete="off">
      <input type="hidden" name="SAMLResponse" id="resp" value="${SAMLResponse}" />
    </form>
    <script language="javascript" type="text/javascript">
        window.setTimeout(function(){document.forms[0].submit();}, 0);
    </script>
  </body>
</html>
`);
  }
  catch (err) {
    res.send(err)
  }
})

app.get('/saml/logout', async (req, res, next) => {
  try {
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
    const requestData = await idp.parseLogoutRequest(sp, 'redirect', {
      query: req.query,
      body: req.body,
      octetString: octetString
    })

    response = await idp.createLogoutResponse(sp, requestData, "redirect")
    res.redirect(response.context)
  }
  catch (err) {
    next(err)
  }
})

app.post('/saml/logout', (req, res, next) => {
  res.send('post: /saml/logout')
})

app.use((err, req, res, next) => {
  res.send(err)
})

app.listen(3000, err => {
  if (err) {
    console.error(err)
  } else {
    console.log('server listening on 3000')
  }
})