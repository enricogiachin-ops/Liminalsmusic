const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX = { nome: 100, email: 254, messaggio: 5000 };

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  // legge il form anche se Vercel non lo ha già interpretato
  let data = req.body;
  if (!data || typeof data !== 'object' || Buffer.isBuffer(data)) {
    let raw = '';
    if (typeof data === 'string') raw = data;
    else if (Buffer.isBuffer(data)) raw = data.toString('utf8');
    else {
      raw = await new Promise(resolve => {
        let s = '';
        req.on('data', c => (s += c));
        req.on('end', () => resolve(s));
      });
    }
    data = Object.fromEntries(new URLSearchParams(raw));
  }

  // honeypot: i bot compilano il campo nascosto, gli umani no
  if (data.sito) return res.redirect(303, '/contatti.html#inviato');

  // solo stringhe, senza spazi ai bordi; a capo rimossi da nome ed email (finiscono nell'oggetto e in reply_to)
  const clean = v => (typeof v === 'string' ? v.trim() : '');
  const nome = clean(data.nome).replace(/[\r\n]+/g, ' ');
  const email = clean(data.email).replace(/[\r\n]+/g, '');
  const messaggio = clean(data.messaggio);

  if (!nome || !email || !messaggio ||
      !EMAIL_RE.test(email) ||
      nome.length > MAX.nome || email.length > MAX.email || messaggio.length > MAX.messaggio) {
    console.error('Campi mancanti, non validi o troppo lunghi');
    return res.redirect(303, '/contatti.html#errore');
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY non trovata');
    return res.redirect(303, '/contatti.html#errore');
  }

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.RESEND_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Liminals <noreply@send.liminalsmusic.com>',
        to: ['hello@liminalsmusic.com'],
        reply_to: email,
        subject: 'Messaggio dal sito — ' + nome,
        text: 'Da: ' + nome + ' <' + email + '>\n\n' + messaggio
      })
    });
    if (!r.ok) {
      console.error('Resend error', r.status, await r.text());
      return res.redirect(303, '/contatti.html#errore');
    }
    return res.redirect(303, '/contatti.html#inviato');
  } catch (e) {
    console.error('Errore di rete', e);
    return res.redirect(303, '/contatti.html#errore');
  }
};
