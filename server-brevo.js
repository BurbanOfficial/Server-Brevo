// server-brevo.js
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import SibApiV3Sdk from 'sib-api-v3-sdk';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
app.use(bodyParser.json());

// --- CORS strict pour votre front ---
const allowedOrigins = [
  'https://burbanofficial.github.io'
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (!allowedOrigins.includes(origin)) {
      return callback(new Error(`Origine non autorisée par CORS: ${origin}`), false);
    }
    return callback(null, true);
  },
  methods: ['GET','POST','OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.options('*', cors());

// --- CONFIGURATION BREVO ---
const brevoClient = SibApiV3Sdk.ApiClient.instance;
brevoClient.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;
const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

// --- STOCKAGE TEMPORAIRE DES CODES ---
const codesStore = new Map();
function genCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
setInterval(() => {
  const now = Date.now();
  for (const [email, { expiresAt }] of codesStore.entries()) {
    if (expiresAt <= now) codesStore.delete(email);
  }
}, 60 * 1000);

// --- ENDPOINT : envoi du code ---
app.post('/api/send-reset-code', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requis' });

  const code = genCode();
  codesStore.set(email, { code, expiresAt: Date.now() + 15*60*1000 }); // 15 min

  try {
    await tranEmailApi.sendTransacEmail({
      sender: { email: 'noreply@burbanofficial.com', name: 'Burban Loyalty' },
      to: [{ email }],
      subject: 'Votre code de confirmation — Burban Loyalty',
      htmlContent: `<!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <title>Code de confirmation Burban Loyalty</title>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 0; }
          .container { background: #ffffff; max-width: 600px; margin: 40px auto; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .logo { text-align: center; padding: 20px 0; background-color: #ffffff; }
          .logo img { max-height: 60px; }
          .banner { width: 100%; display: block; }
          .body { padding: 30px; color: #333333; line-height: 1.5; }
          .code-box { display: block; width: fit-content; margin: 20px auto; padding: 15px 25px; background-color: #f0f0f0; border-radius: 18px; font-size: 32px; letter-spacing: 6px; font-weight: bold; }
          .footer { background-color: #fafafa; color: #888888; font-size: 12px; text-align: center; padding: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Logo -->
          <div class="logo">
            <img src="https://i.imgur.com/Kl9kTBg.png" alt="Burban Loyalty" />
          </div>
          <!-- Bannière -->
          <img class="banner" src="https://i.imgur.com/NtFkHw4.jpeg" alt="Burban Loyalty Banner" />
  
          <div class="body">
            <p>Bonjour,</p>
            <p>Vous avez demandé un code de confirmation pour accéder à votre compte <strong>Burban Loyalty</strong>. Veuillez entrer le code ci-dessous dans le formulaire pour poursuivre :</p>
            <div class="code-box">${code}</div>
            <p>Ce code est valable <strong>15 minutes</strong>. <br><br>Si vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer ce message.</p>
            <p>Pour toute assistance, contactez notre support à <a href="mailto:support@burbanofficial.com">support@burbanofficial.com</a>.</p>
          </div>
  
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Burban Loyalty. Tous droits réservés.</p>
          </div>
        </div>
      </body>
      </html>` // votre template complet ici
    });
    return res.json({ success: true });
  } catch (err) {
    console.error('Brevo send error', err.response?.status, err.response?.text || err);
    return res.status(500).json({ error: 'Impossible d’envoyer l’email' });
  }
});

// --- ENDPOINT : vérification du code ---
app.post('/api/verify-reset-code', (req, res) => {
  const { email, code } = req.body;
  const entry = codesStore.get(email);
  if (!entry || entry.expiresAt < Date.now() || entry.code !== code) {
    return res.json({ valid: false });
  }
  codesStore.delete(email);
  return res.json({ valid: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API en écoute sur :${PORT}`));
