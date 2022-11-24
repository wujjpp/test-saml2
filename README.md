# Test SAML2

## 启动DP

Listening on port 3000

```shell
cd saml-server
node app.js
```

## 启动SP

Listening on port 3001

```shell
cd saml-client
node app.js
```

## 测试

Open browser then navigate to <http://localhost:3001/sso-redirect>, you will see then response from DP  

The DP metadata located at <http://127.0.0.1:3000/saml/metadata.xml>

Made with ♥ by Wu Jian Ping
