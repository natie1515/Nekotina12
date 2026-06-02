export default {
  command: ['todos', 'invocar', 'tagall'],
  category: 'group',
  description: 'Menciona a todos los miembros.',
  isAdmin: true,

  run: async ({ msg, sock, args, participants }) => {
    const members = participants || []

    const texto = args.join(' ')

    let teks = `﹒⌗﹒🌱 .ৎ˚₊‧ ${texto || 'Revivan 🪴'}\n\n`
    teks += `𐚁 ֹ ִ GROUP TAG ! ୧ ֹ ִ🍃\n\n`
    teks += `🍄 Miembros: ${members.length}\n`
    teks += `🌿 Solicitado por: @${msg.sender.split('@')[0]}\n\n`

    for (const user of members) {
      teks += `┊ꕥ @${user.id.split('@')[0]}\n`
    }

    return sock.sendMessage(
      msg.chat,
      {
        text: teks,
        mentions: members.map(u => u.id)
      },
      { quoted: msg }
    )
  }
}
