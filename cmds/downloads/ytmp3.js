import yts from 'yt-search'
import fetch from 'node-fetch'
import { spawn } from 'child_process'
import { Readable } from 'stream'

const cmd = {
  command: ['play', 'mp3', 'ytmp3', 'ytaudio', 'playaudio'],
  category: 'downloads',
  description: 'Descargar una canción de YouTube.',

  run: async ({ msg, sock, args, usedPrefix, command }) => {
    try {
      if (!args[0]) {
        return msg.reply('《✧》Por favor, menciona el nombre o URL del video que deseas descargar')
      }

      const input_text = args.join(' ').trim()
      const video_id = getVideoId(input_text)
      const query = video_id ? `https://youtu.be/${video_id}` : input_text

      let url = query
      let title = 'audio'
      let thumbnail = null

      try {
        const video_info = await getVideoInfo(query, video_id)

        if (video_info) {
          url = video_info.url || `https://youtu.be/${video_info.videoId}`
          title = video_info.title || title
          thumbnail = video_info.image || video_info.thumbnail || null

          const views = Number(video_info.views || 0).toLocaleString('es-HN')
          const channel = video_info.author?.name || video_info.author || 'Desconocido'

          const info_message = `➩ Descargando › *${title}*

> ❖ Canal › *${channel}*
> ⴵ Duración › *${video_info.timestamp || 'Desconocido'}*
> ❀ Vistas › *${views}*
> ✩ Publicado › *${video_info.ago || 'Desconocido'}*
> ❒ Enlace › *${url}*`

          if (thumbnail) {
            await sock.sendMessage(msg.chat, {
              image: { url: thumbnail },
              caption: info_message
            }, { quoted: msg })
          } else {
            await msg.reply(info_message)
          }
        }
      } catch {}

      if (!isYTUrl(url)) {
        return msg.reply('《✧》No se encontro un video válido de YouTube.')
      }

      const audio = await getAudioFromYoutubei(url)

      if (!audio?.buffer?.length) {
        return msg.reply('《✧》No se pudo descargar el *audio*, intenta más tarde.')
      }

      await sock.sendMessage(msg.chat, {
        audio: audio.buffer,
        fileName: audio.name || `${sanitizeFileName(title)}.mp3`,
        mimetype: 'audio/mpeg'
      }, { quoted: msg })
    } catch (e) {
      await msg.reply(
        `> An unexpected error occurred while executing command *${usedPrefix + command}*.\n> [Error: *${e.message}*]`
      )
    }
  }
}

export default cmd

const youtubei = {
  endpoint: 'https://www.youtube.com/youtubei/v1/player?prettyPrint=false',
  visitor_id:
    'Cgs4ZmxfcDk4Vnk0VSjLvdrQBjIKCgJJRBIEGgAgXmLfAgrcAjE4LllUPWNsWWh5eHVVeE04N1AzV0tnZzZJeFpkV3lGOEVRNnJaei1DQ3hRTkdHV1NFcjg1MmpVQmZ6UzMtOE5zTVVSZ3EzbHFXUHFRZERyV0M3a2g2TlFEdUZybmJRbjkyc1JGVGxVd3MyZG5RMmFmVG95TlJnTXJReTdMNlRTOEVqcTFhaW5OQnJhOU9uRnJRa01IOGpVTzdiR3UwQVpqdjI0UURqNkdmeE1VcWVZc184cGxfOUNNVExVRG9HQ09sa1NPOUVHZG5CcWdUVzVRZ080OGRyQWxDeVRHUF9MRnhBNjVYZVVRR1FBeGxmU0ZSckhhRHI0cDROLWV2cmp0VDdEc3pKU3Q1clhSYkNmWWQ0YjJqbFN5NVh0ejMyajk5NWdkSGhLU1htcTcydHNGeDNUOW5xZXQ3UlZvV2JNbmNGWDBKTldqbXZyQzg0VHhqY1hCVFlnQ2dLQQ==',
  client_name: 'ANDROID_VR',
  client_version: '1.65.10',
  itag: 18
}

const ffmpeg_config = {
  path: 'ffmpeg',
  bitrate: '128k',
  sample_rate: '44100'
}

const defaults = {
  user_agent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36'
}

const isYTUrl = (url = '') =>
  /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/i.test(url)

const getVideoId = (text = '') => {
  const raw = String(text || '').trim()

  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) {
    return raw
  }

  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    /[?&]v=([a-zA-Z0-9_-]{11})/
  ]

  for (const pattern of patterns) {
    const match = raw.match(pattern)

    if (match?.[1]) {
      return match[1]
    }
  }

  return null
}

const sanitizeFileName = (name = 'audio') =>
  cleanExtension(name)
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'audio'

function cleanExtension(name = 'audio') {
  return String(name || 'audio').replace(/\.(mp3|m4a|opus|ogg|wav|flac|mp4|webm|mkv)$/i, '')
}

async function getVideoInfo(input, video_id) {
  if (video_id) {
    try {
      const info = await yts({ videoId: video_id })

      if (info?.videoId) {
        return {
          ...info,
          url: `https://youtu.be/${info.videoId}`,
          image: info.thumbnail || info.image
        }
      }
    } catch {}
  }

  const search = await yts(input)
  const video = search.videos?.[0] || search.all?.find(v => v.type === 'video')

  return video || null
}

async function getAudioFromYoutubei(url) {
  const video_id = getVideoId(url)

  if (!video_id) {
    throw new Error('No se encontró un video_id válido')
  }

  const stream = await getYoutubeiStream(video_id)
  const buffer = await convertStreamUrlToMp3Buffer(stream.url)

  return {
    buffer,
    url: stream.url,
    name: `${sanitizeFileName(stream.title || video_id)}.mp3`,
    title: stream.title,
    channel: stream.channel,
    thumbnail: stream.thumbnail,
    duration: stream.duration,
    video_id,
    quality: stream.quality,
    size: formatBytes(buffer.length),
    size_bytes: buffer.length,
    source: `https://youtu.be/${video_id}`
  }
}

async function getYoutubeiStream(video_id) {
  const response = await fetch(youtubei.endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-Goog-Visitor-Id': youtubei.visitor_id
    },
    body: JSON.stringify({
      context: {
        client: {
          clientName: youtubei.client_name,
          clientVersion: youtubei.client_version
        }
      },
      videoId: video_id
    })
  })

  const text = await response.text()

  if (!response.ok) {
    throw new Error(`YouTube player HTTP ${response.status}: ${text.slice(0, 300)}`)
  }

  let json = null

  try {
    json = JSON.parse(text)
  } catch {
    throw new Error(`Respuesta JSON inválida: ${text.slice(0, 300)}`)
  }

  const formats = json?.streamingData?.formats || []
  const stream = formats.find(item => Number(item?.itag) === youtubei.itag && item?.url)

  if (!stream?.url) {
    const status = json?.playabilityStatus?.status || 'UNKNOWN'
    const reason = json?.playabilityStatus?.reason || 'Sin razón'
    throw new Error(`No se encontró URL directa con itag ${youtubei.itag}. Estado: ${status}. ${reason}`)
  }

  return {
    url: stream.url,
    title: json?.videoDetails?.title || video_id,
    channel: json?.videoDetails?.author || null,
    thumbnail: makeYoutubeThumbnail(video_id),
    duration: json?.videoDetails?.lengthSeconds
      ? formatDuration(Number(json.videoDetails.lengthSeconds))
      : null,
    quality: stream.qualityLabel || '360p'
  }
}

async function convertStreamUrlToMp3Buffer(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': defaults.user_agent
    }
  })

  if (!response.ok) {
    throw new Error(`No se pudo descargar el stream: HTTP ${response.status}`)
  }

  if (!response.body) {
    throw new Error('La respuesta no contiene stream')
  }

  const input_stream = typeof response.body.pipe === 'function'
    ? response.body
    : Readable.fromWeb(response.body)

  return await streamToMp3Buffer(input_stream)
}

function streamToMp3Buffer(input_stream) {
  return new Promise((resolve, reject) => {
    const chunks = []
    const errors = []

    let done = false

    const ffmpeg = spawn(ffmpeg_config.path, [
      '-hide_banner',
      '-loglevel', 'error',
      '-i', 'pipe:0',
      '-vn',
      '-map', 'a:0',
      '-acodec', 'libmp3lame',
      '-b:a', ffmpeg_config.bitrate,
      '-ar', ffmpeg_config.sample_rate,
      '-f', 'mp3',
      'pipe:1'
    ], {
      stdio: ['pipe', 'pipe', 'pipe']
    })

    const fail = error => {
      if (done) return
      done = true

      try {
        input_stream.destroy?.()
      } catch {}

      try {
        ffmpeg.kill('SIGKILL')
      } catch {}

      reject(error)
    }

    ffmpeg.stdout.on('data', chunk => {
      chunks.push(chunk)
    })

    ffmpeg.stderr.on('data', chunk => {
      errors.push(chunk)
    })

    ffmpeg.on('error', error => {
      if (error?.code === 'ENOENT') {
        fail(new Error('FFmpeg no está instalado o no está en el PATH'))
        return
      }

      fail(error)
    })

    ffmpeg.on('close', code => {
      if (done) return
      done = true

      if (code !== 0) {
        const stderr = Buffer.concat(errors).toString().trim()
        reject(new Error(stderr || `FFmpeg terminó con código ${code}`))
        return
      }

      const buffer = Buffer.concat(chunks)

      if (!buffer.length) {
        reject(new Error('FFmpeg no generó audio'))
        return
      }

      resolve(buffer)
    })

    input_stream.on('error', error => {
      fail(error)
    })

    ffmpeg.stdin.on('error', error => {
      if (error?.code !== 'EPIPE') {
        fail(error)
      }
    })

    input_stream.pipe(ffmpeg.stdin)
  })
}

function makeYoutubeThumbnail(video_id, quality = 'hqdefault') {
  if (!video_id) return null
  return `https://i.ytimg.com/vi/${video_id}/${quality}.jpg`
}

function formatDuration(seconds = 0) {
  seconds = Math.floor(Number(seconds) || 0)

  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60

  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  return `${m}:${String(s).padStart(2, '0')}`
}

function formatBytes(bytes = 0) {
  if (!bytes || Number.isNaN(bytes)) return 'Desconocido'

  const units = ['B', 'KB', 'MB', 'GB']
  let size = Number(bytes)
  let unit = 0

  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024
    unit++
  }

  return `${size.toFixed(unit === 0 ? 0 : 2)} ${units[unit]}`
}
