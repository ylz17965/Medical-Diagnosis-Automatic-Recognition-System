import literatureDatabase from '../data/literature_database.json' with { type: 'json' }

const query = '头痛应该怎么办'

const stopWords = new Set(['的', '了', '是', '在', '有', '和', '与', '或', '我', '你', '他', '她', '它', '这', '那', '什么', '怎么', '如何', '为什么', '吗', '呢', '啊', '吧', '呀'])

function tokenize(text: string): string[] {
  const words: string[] = []
  const segments = text.split(/[\s，。！？、；：""''（）【】《》]+/)
  
  for (const segment of segments) {
    if (segment.length === 0) continue
    
    if (!stopWords.has(segment)) {
      words.push(segment)
    }
    
    for (let i = 0; i < segment.length - 1; i++) {
      const bigram = segment.substring(i, i + 2)
      if (!stopWords.has(bigram)) {
        words.push(bigram)
      }
    }
  }

  return [...new Set(words)]
}

function partialMatch(query: string, target: string): boolean {
  if (query.length < 2 || target.length < 2) return false
  
  for (let i = 0; i <= query.length - 2; i++) {
    const bigram = query.substring(i, i + 2)
    if (target.includes(bigram)) {
      return true
    }
  }
  
  for (let i = 0; i <= target.length - 2; i++) {
    const bigram = target.substring(i, i + 2)
    if (query.includes(bigram)) {
      return true
    }
  }
  
  return false
}

console.log('=== Literature Search Debug ===')
console.log('Query:', query)

const queryWords = tokenize(query)
console.log('Tokenized words:', queryWords)

const literature = literatureDatabase.literature
console.log('\nTotal literature:', literature.length)

for (const lit of literature) {
  console.log(`\n--- ${lit.id}: ${lit.title} ---`)
  console.log('Keywords:', lit.keywords)
  
  let totalScore = 0
  const matchDetails: string[] = []
  
  for (const word of queryWords) {
    if (word.length < 2) continue
    
    const normalizedWord = word.toLowerCase()
    let wordScore = 0
    
    for (const keyword of lit.keywords) {
      const normalizedKeyword = keyword.toLowerCase()
      if (normalizedKeyword.includes(normalizedWord) || 
          normalizedWord.includes(normalizedKeyword) ||
          partialMatch(normalizedWord, normalizedKeyword)) {
        wordScore = Math.max(wordScore, 3)
        matchDetails.push(`  "${word}" matches keyword "${keyword}" -> +3`)
      }
    }
    
    const titleLower = lit.title.toLowerCase()
    if (titleLower.includes(normalizedWord) || 
        partialMatch(normalizedWord, titleLower)) {
      wordScore = Math.max(wordScore, 2)
      matchDetails.push(`  "${word}" matches title -> +2`)
    }
    
    totalScore += wordScore
  }
  
  if (matchDetails.length > 0) {
    console.log('Match details:')
    matchDetails.forEach(d => console.log(d))
  }
  
  const relevanceScore = totalScore / queryWords.length
  console.log(`Total score: ${totalScore}, relevanceScore: ${relevanceScore.toFixed(3)}, passes threshold (>=0.5): ${relevanceScore >= 0.5}`)
}

console.log('\n=== Testing L010 specifically ===')
const l010 = literature.find(l => l.id === 'L010')
if (l010) {
  console.log('L010 title:', l010.title)
  console.log('L010 keywords:', l010.keywords)
  console.log('L010 citations:', l010.citations.length)
  
  for (const citation of l010.citations) {
    console.log(`  - ${citation.id}: ${citation.content.substring(0, 50)}...`)
  }
}
