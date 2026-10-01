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

  const { nome, email, messaggio, sito } = data;
  console.log('contact:', req.headers['content-type'], Object.keys(data));

  // honeypot: i bot compilano il campo nascosto, gli umani no
  if (sito) return res.redirect(303, '/contatti.html#inviato');

  if (!nome || !email || !messaggio || !email.includes('@')) {
    console.error('Campi mancanti o email non valida');
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
