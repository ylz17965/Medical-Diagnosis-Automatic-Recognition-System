import { config } from '../config/index.js'

console.log('=== 配置检查 ===')
console.log('QWEN_API_KEY:', config.qwen.apiKey ? '已配置 (' + config.qwen.apiKey?.substring(0, 10) + '...)' : '未配置')
console.log('QWEN_BASE_URL:', config.qwen.baseUrl)
console.log('QWEN_MODEL_COMPLEX:', config.qwen.models.complex)
console.log('QWEN_MODEL_SIMPLE:', config.qwen.models.simple)
