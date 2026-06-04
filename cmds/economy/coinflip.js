export default {
  command: ['cf', 'flip', 'coinflip'],
  category: 'economy',
  description: 'Apostar coins en un cara o cruz.',
  run: async ({ msg, sock, args, usedPrefix, command, text }) => {
    const chat = global.db.data.chats[msg.chat];
    if (chat.adminonly || !chat.economy) {
      return msg.reply(`ꕥ Los comandos de *Economía* están desactivados en este grupo.\n\nUn *administrador* puede activarlos con el comando:\n» *${usedPrefix}economy on*`);
    }

    const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
    const botSettings = global.db.data.settings[botId];
    const monedas = botSettings.currency;

    // Asegurar estructura
    global.db.data.chats[msg.chat].users[msg.sender] ??= { coins: 0, lastcoinflip: 0 };
    const user = global.db.data.chats[msg.chat].users[msg.sender];
    
    const cooldown = 10 * 1000;
    if (Date.now() < user.lastcoinflip) {
      const restante = user.lastcoinflip - Date.now();
      return msg.reply(`ꕥ Debes esperar *${msToTime(restante)}* antes de volver a usar ${command}.`);
    }

    let cantidad, eleccion;
    const a0 = parseFloat(args[0]);
    const a1 = parseFloat(args[1]);

    if (!isNaN(a0)) {
      cantidad = Math.floor(a0);
      eleccion = (args[1] || '').toLowerCase();
    } else if (!isNaN(a1)) {
      cantidad = Math.floor(a1);
      eleccion = (args[0] || '').toLowerCase();
    } else {
      return msg.reply(`ꕥ Cantidad inválida, ingresa un número válido.\n> Ejemplo » *${usedPrefix + command} 200 cara* o *${usedPrefix + command} cruz 200*`);
    }

    if (cantidad < 100) {
      return msg.reply(`ꕥ La cantidad mínima para apostar es *100 ${monedas}*.`);
    }
    
    if (!['cara', 'cruz'].includes(eleccion)) {
      return msg.reply(`ꕥ Elección inválida. Solo se admite *cara* o *cruz*.\n> Ejemplo » *${usedPrefix + command} 200 cara*`);
    }

    if (cantidad > (user.coins || 0)) {
      return msg.reply(`ꕥ No tienes suficientes *${monedas}* fuera del banco para apostar, tienes *¥${(user.coins || 0).toLocaleString()} ${monedas}*.`);
    }

    // CORRECCIÓN: Fecha de fin de cooldown correcta
    user.lastcoinflip = Date.now() + cooldown;
    
    const resultado = Math.random() < 0.5 ? 'cara' : 'cruz';
    const acierto = resultado === eleccion;
    
    if (acierto) {
      user.coins += cantidad;
    } else {
      user.coins -= cantidad;
    }

    const mensaje = `「✿」La moneda ha caído en *${capitalize(resultado)}* y has ${acierto ? 'ganado' : 'perdido'} *¥${cantidad.toLocaleString()} ${monedas}*!\n> Tu elección fue *${capitalize(eleccion)}*`;
    await sock.sendMessage(msg.chat, { text: mensaje }, { quoted: msg });
  }
};

function msToTime(duration) {
  const seconds = Math.floor(duration / 1000);
  return `${seconds} segundo${seconds !== 1 ? 's' : ''}`;
}

function capitalize(txt) {
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}
