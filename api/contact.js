module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const { nome, email, messaggio, sito } = req.body || {};

  // honeypot: i bot compilano il campo nascosto, gli umani no
  if (sito) return res.redirect(303, '/contatti.html#inviato');

  if (!nome || !email || !messaggio || !email.includes('@')) {
    return res.redirect(303, '/contatti.html#errore');
  }

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

  if (!r.ok) console.error('Resend error', r.status, await r.text());
  return res.redirect(303, r.ok ? '/contatti.html#inviato' : '/contatti.html#errore');
};
