import { ref, computed } from 'vue'

export interface ConversationTurn {
  id: string
  userQuestion: string
  userQuestionPreview: string
  userMessageId: string
  aiMessageId?: string
  timestamp: Date
}

const MAX_TURNS = 7

const turns = ref<ConversationTurn[]>([])

function generateId(): string {
  return `turn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function truncateText(text: string, maxLength: number = 15): string {
  const plainText = text.replace(/<[^>]*>/g, '').replace(/\n/g, ' ')
  if (plainText.length <= maxLength) return plainText
  return plainText.slice(0, maxLength) + '...'
}

export function useConversationTurns() {
  const recentTurns = computed(() => turns.value)
  
  const turnCount = computed(() => turns.value.length)

  function addTurn(userQuestion: string, userMessageId: string): ConversationTurn {
    const newTurn: ConversationTurn = {
      id: generateId(),
      userQuestion,
      userQuestionPreview: truncateText(userQuestion),
      userMessageId,
      timestamp: new Date()
    }
    
    turns.value.push(newTurn)
    
    if (turns.value.length > MAX_TURNS) {
      turns.value.shift()
    }
    
    return newTurn
  }

  function setAiMessageId(turnId: string, aiMessageId: string) {
    const turn = turns.value.find(t => t.id === turnId)
    if (turn) {
      turn.aiMessageId = aiMessageId
    }
  }

  function getLatestTurn(): ConversationTurn | undefined {
    return turns.value[turns.value.length - 1]
  }

  function getTurnByIndex(index: number): ConversationTurn | undefined {
    return turns.value[index]
  }

  function clearTurns() {
    turns.value = []
  }

  function isLatestTurn(turnId: string): boolean {
    const latest = getLatestTurn()
    return latest?.id === turnId
  }

  return {
    recentTurns,
    turnCount,
    addTurn,
    setAiMessageId,
    getLatestTurn,
    getTurnByIndex,
    clearTurns,
    isLatestTurn
  }
}
