const samlify = require('samlify')
const fs = require('fs')

const idp = samlify.IdentityProvider({
  entityID: 'http://127.0.0.1:3000/saml/metadata',
  signingCert: fs.readFileSync('./certs/dp-encryption-cert.cer'),

  encryptCert: fs.readFileSync('./certs/sp-encryption-cert.cer'),

  singleSignOnService: [
    {
      Binding: "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect",
      Location: "http://127.0.0.1:3000/saml/auth"
    },
    {
      Binding: "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST",
      Location: "http://127.0.0.1:3000/saml/auth"
    }
  ],
  singleLogoutService: [
    {
      Binding: "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect",
      Location: "http://127.0.0.1:3000/saml/logout"
    },
    {
      Binding: "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST",
      Location: "http://127.0.0.1:3000/saml/logout"
    }
  ],
  nameIDFormat: [
    'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
    'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent',
    'urn:oasis:names:tc:SAML:2.0:nameid-format:transient'
  ],

  loginResponseTemplate: {
    context: '<saml:Attribute Name="{Name}" NameFormat="{NameFormat}"><saml:AttributeValue xmlns:xs="{ValueXmlnsXs}" xmlns:xsi="{ValueXmlnsXsi}" xsi:type="{ValueXsiType}">{Value}</saml:AttributeValue></saml:Attribute>',
    attributes: [
      { name: "mail", valueTag: "user.email", nameFormat: "urn:oasis:names:tc:SAML:2.0:attrname-format:basic", valueXsiType: "xs:string" },
      { name: "name", valueTag: "user.name", nameFormat: "urn:oasis:names:tc:SAML:2.0:attrname-format:basic", valueXsiType: "xs:string" }
    ]
  },

  isAssertionEncrypted: false,

  privateKey: fs.readFileSync('./certs/dp-encrypt-key.pem'),
  encPrivateKey: fs.readFileSync('./certs/dp-encryption-cert.cer'),

})

idp.exportMetadata('./distributed_idp_md.xml');