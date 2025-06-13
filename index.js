require('dotenv').config();
const fs = require('fs');
const path = require('path');
const lti = require('ltijs').Provider;
const routes = require('./src/routes');
const appRoute = lti.appRoute();
// 環境変数
const SSL_KEY_PATH = process.env.SSL_KEY_PATH || '/home/ec2-user/ssl/privkey.pem';
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || '/home/ec2-user/ssl/fullchain.pem';
const PORT = process.env.PORT || 8080;

// SSL証明書
const sslOptions = {
  key: fs.readFileSync(SSL_KEY_PATH),
  cert: fs.readFileSync(SSL_CERT_PATH)
};

// LTI Providerセットアップ
lti.setup(
  process.env.ENCRYPTION_KEY,
  { 
    url: `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:27017/${process.env.DB_NAME}?authSource=admin`,
    connection: { user: process.env.DB_USER, pass: process.env.DB_PASS }
  },
  {
    https: true,
    ssl: sslOptions,
    staticPath: path.join(__dirname, 'public'),
    appRoute: '/',
    loginRoute: '/login',
    cookies: { secure: true, sameSite: 'None' },
    devMode: false,
    userInfo: true
  }
);

lti.onConnect(async (token, req, res) => {
  return res.sendFile(path.join(__dirname, './public/index.html'))
  //return lti.redirect(res, './public/index.html', { newResource: true, query: { param: 'value' } })
})


// When receiving deep linking request redirects to deep screen
// lti.onDeepLinking(async (token, req, res) => {
//   return lti.redirect(res, '/deeplink', { newResource: true })
// })
// Equivalent to onConnect usage above
lti.app.get(lti.appRoute(), async (req, res, next) => {
    console.log(res.locals.token)
    return res.send('User connected!') 
  }
)

//err 
lti.onSessionTimeout(async (req, res, next) => { return res.status(401).send(res.locals.err) })
lti.onInvalidToken(async (req, res, next) => { return res.status(401).send(res.locals.err) })
lti.onUnregisteredPlatform((req, res) => { return res.status(400).send({ status: 400, error: 'Bad Request', details: { message: 'Unregistered Platform!' } }) })
lti.onInactivePlatform((req, res) => { return res.status(401).send({ status: 401, error: 'Unauthorized', details: { message: 'Platform not active!' } }) })


// Setting up routes
lti.app.use(routes);


// サーバ起動
const setup = async () => {
  try {
    await lti.deploy({ port: PORT });
    
    await lti.registerPlatform({
      url: 'https://mdl-ec2.lepo.app',
      name: 'Moodle',
      clientId: 'nh3FQR1gjjaWTXs',
      authenticationEndpoint: 'https://mdl-ec2.lepo.app/mod/lti/auth.php',
      accesstokenEndpoint: 'https://mdl-ec2.lepo.app/mod/lti/token.php',
      authConfig: { method: 'JWK_SET', key: 'https://mdl-ec2.lepo.app/mod/lti/certs.php' }
    });
    
    //console.log('OK');
  } catch (err) {
    //console.error('ERR', err);
  }
};


setup();
