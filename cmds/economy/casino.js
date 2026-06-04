import { delay } from 'baileys';

export default {
  command: ['apostar', 'casino'],
  category: 'economy',
  description: 'Apostar coins en el casino.',
  run: async ({ msg, sock, args, usedPrefix, command, text }) => {
    const chatData = global.db.data.chats[msg.chat];
    if (chatData.adminonly || !chatData.economy) {
      return msg.reply(`ꕥ Los comandos de *Economía* están desactivados en este grupo.\n\nUn *administrador* puede activarlos con el comando:\n» *${usedPrefix}economy on*`);
    }        

    const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net';
    const bot = global.db.data.settings[botId];
    const currency = bot.currency;
    const botname = bot.botname;    

    // Asegurar estructura del usuario en el chat
    global.db.data.chats[msg.chat].users[msg.sender] ??= { coins: 0, lastApuesta: 0 };
    const user = global.db.data.chats[msg.chat].users[msg.sender];
    
    const userName = msg.pushName || msg.sender.split('@')[0];
    const tiempoEspera = 30 * 1000;
    const ahora = Date.now();        

    if (user.lastApuesta && ahora - user.lastApuesta < tiempoEspera) {
      const restante = user.lastApuesta + tiempoEspera - ahora;
      return sock.reply(msg.chat, `ꕥ Debes esperar *${formatTime(restante)}* para usar *${usedPrefix + command}* nuevamente.`, msg);
    }        

    let count = args[0];
    if (!count) {
      return sock.reply(msg.chat, `❀ Ingresa la cantidad de *${currency}* que deseas aportar contra *${botname}*\n> Ejemplo: *${usedPrefix + command} 100*`, msg);
    }

    if (/all/i.test(count)) {
      count = user.coins;
    } else {
      count = parseInt(count);
    }

    if (isNaN(count) || count < 1) {
      return sock.reply(msg.chat, `ꕥ Ingresa una cantidad válida para apostar.`, msg);
    }

    if (user.coins < count) {
      return sock.reply(msg.chat, `ꕥ No tienes *¥${formatNumber(count)} ${currency}* para apostar!`, msg);
    }

    // Procesar apuesta
    user.lastApuesta = ahora;
    user.coins -= count; // Restamos la apuesta inicial

    let Aku = Math.floor(Math.random() * 101);
    let Kamu = Math.floor(Math.random() * 101);
    let resultado = '';
    let ganancia = 0;

    if (Aku > Kamu) {
      resultado = `> ${userName}, *Perdiste ¥${formatNumber(count)} ${currency}*.`;
    } else if (Aku < Kamu) {
      ganancia = count * 2;
      user.coins += ganancia;
      resultado = `> ${userName}, *Ganaste ¥${formatNumber(ganancia)} ${currency}*.`;
    } else {
      user.coins += count; // Empate, devolvemos lo apostado
      resultado = `> ${userName}, *Empate. Recuperaste tus ¥${formatNumber(count)} ${currency}*.`;
    }

    let { key } = await sock.sendMessage(msg.chat, { text: "🎲 El crupier lanza los dados... ¡Las apuestas están cerradas!" }, { quoted: msg });
    await delay(2000);
    await sock.sendMessage(msg.chat, { text: "❀ Los números están girando... ¡Prepárate para el resultado!", edit: key }, { quoted: msg });
    await delay(2000);
    
    const replyMsg = `❀ \`Veamos qué números tienen!\`\n\n➠ *${botname}* : ${Aku}\n➠ *${userName}* : ${Kamu}\n\n${resultado}`;
    await sock.sendMessage(msg.chat, { text: replyMsg.trim(), edit: key }, { quoted: msg });
  }
};

function formatNumber(number) {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatTime(ms) {
  if (ms <= 0 || isNaN(ms)) return 'Ahora';
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  const partes = [];
  if (min) partes.push(`${min} minuto${min !== 1 ? 's' : ''}`);
  partes.push(`${sec} segundo${sec !== 1 ? 's' : ''}`);
  return partes.join(' ');
}
