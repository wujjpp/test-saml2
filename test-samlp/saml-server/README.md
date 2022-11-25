# 说明

```shell
openssl req -x509 -new -newkey rsa:2048 -nodes -subj '/C=CN/ST=Jiang Su/L=Su Zhou/O=QCC/CN=Test Identity Provider' -keyout some-cert.key -out some-cert.pem -days 7300
```
