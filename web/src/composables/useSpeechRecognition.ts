import { ref, onUnmounted } from 'vue'

interface SpeechRecognitionEvent {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
  onaudiostart: (() => void) | null
  onaudioend: (() => void) | null
  onspeechstart: (() => void) | null
  onspeechend: (() => void) | null
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance

interface WindowWithSpeechRecognition extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor
  webkitSpeechRecognition?: SpeechRecognitionConstructor
}

export function useSpeechRecognition() {
  const isListening = ref(false)
  const isSupported = ref(false)
  const transcript = ref('')
  const interimTranscript = ref('')
  const error = ref<string | null>(null)
  const isAudioDetected = ref(false)

  let recognition: SpeechRecognitionInstance | null = null
  let SpeechRecognitionAPI: SpeechRecognitionConstructor | null = null

  const checkSupport = (): boolean => {
    const win = window as WindowWithSpeechRecognition
    SpeechRecognitionAPI = win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null
    isSupported.value = !!SpeechRecognitionAPI
    return isSupported.value
  }

  const getBrowserInfo = (): { name: string; version: string } => {
    const ua = navigator.userAgent
    let browserName = 'unknown'
    let browserVersion = ''

    if (ua.indexOf('Edg/') > -1) {
      browserName = 'edge'
      const match = ua.match(/Edg\/(\d+)/)
      browserVersion = match ? match[1] : ''
    } else if (ua.indexOf('Chrome/') > -1) {
      browserName = 'chrome'
      const match = ua.match(/Chrome\/(\d+)/)
      browserVersion = match ? match[1] : ''
    } else if (ua.indexOf('Safari/') > -1) {
      browserName = 'safari'
      const match = ua.match(/Version\/(\d+)/)
      browserVersion = match ? match[1] : ''
    }

    return { name: browserName, version: browserVersion }
  }

  const initRecognition = (): SpeechRecognitionInstance | null => {
    if (!checkSupport()) {
      error.value = '您的浏览器不支持语音识别功能，请使用 Chrome 或 Edge 浏览器'
      return null
    }

    recognition = new SpeechRecognitionAPI!()

    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'zh-CN'
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      isListening.value = true
      error.value = null
      isAudioDetected.value = false
    }

    recognition.onaudiostart = () => {
      isAudioDetected.value = true
    }

    recognition.onaudioend = () => {
      isAudioDetected.value = false
    }

    recognition.onspeechstart = () => {
      isAudioDetected.value = true
    }

    recognition.onspeechend = () => {
      isAudioDetected.value = false
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = ''
      let interim = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTranscript += result[0].transcript
        } else {
          interim += result[0].transcript
        }
      }

      if (finalTranscript) {
        transcript.value += finalTranscript
      }
      interimTranscript.value = interim
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error, event.message)
      
      const errorMessages: Record<string, string> = {
        'no-speech': '未检测到语音，请重试',
        'audio-capture': '未找到麦克风，请检查设备',
        'not-allowed': '麦克风权限被拒绝，请在浏览器设置中允许访问',
        'network': '网络错误，请检查网络连接',
        'aborted': '语音识别被中断',
        'service-not-allowed': '语音识别服务不可用',
        'language-not-supported': '不支持的语言'
      }

      error.value = errorMessages[event.error] || `语音识别出错: ${event.error}`
      isListening.value = false
    }

    recognition.onend = () => {
      isListening.value = false
      isAudioDetected.value = false
    }

    return recognition
  }

  const start = () => {
    if (isListening.value) return

    if (!recognition) {
      recognition = initRecognition()
    }

    if (recognition) {
      transcript.value = ''
      interimTranscript.value = ''
      
      try {
        recognition.start()
      } catch (e) {
        console.error('Failed to start recognition:', e)
        if (e instanceof Error && e.message.includes('already started')) {
          recognition.stop()
          setTimeout(() => {
            recognition?.start()
          }, 100)
        } else {
          error.value = '启动语音识别失败，请重试'
        }
      }
    }
  }

  const stop = () => {
    if (recognition && isListening.value) {
      try {
        recognition.stop()
      } catch (e) {
        console.error('Failed to stop recognition:', e)
      }
      isListening.value = false
    }
  }

  const toggle = () => {
    if (isListening.value) {
      stop()
    } else {
      start()
    }
  }

  const reset = () => {
    transcript.value = ''
    interimTranscript.value = ''
    error.value = null
  }

  const getSupportedLanguages = (): string[] => {
    return ['zh-CN', 'zh-TW', 'en-US', 'en-GB', 'ja-JP', 'ko-KR']
  }

  const setLanguage = (lang: string) => {
    if (recognition) {
      recognition.lang = lang
    }
  }

  onUnmounted(() => {
    if (recognition) {
      try {
        recognition.abort()
      } catch {
        // Ignore abort errors
      }
    }
  })

  return {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    error,
    isAudioDetected,
    start,
    stop,
    toggle,
    reset,
    checkSupport,
    getBrowserInfo,
    getSupportedLanguages,
    setLanguage
  }
}
