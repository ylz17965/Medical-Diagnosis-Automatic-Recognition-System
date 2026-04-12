import { literatureService } from '../services/literature.service.js'

const query = '头痛应该怎么办'

console.log('=== Testing LiteratureService directly ===')
console.log('Query:', query)

const searchResult = literatureService.search(query, 5)
console.log('Search results:', searchResult.length)

for (const result of searchResult) {
  console.log(`\n--- ${result.literature.id}: ${result.literature.title} ---`)
  console.log('Relevance score:', result.relevanceScore)
  console.log('Matched citations:', result.matchedCitations.length)
  for (const c of result.matchedCitations) {
    console.log(`  - ${c.id}: ${c.content.substring(0, 50)}...`)
  }
}

console.log('\n=== Testing deepSearch ===')
const deepResult = literatureService.deepSearch(query, 8)
console.log('Total searched:', deepResult.totalSearched)
console.log('Total cited:', deepResult.totalCited)
console.log('Citations:', deepResult.citations.length)
console.log('Search summary:', deepResult.searchSummary)

for (const c of deepResult.citations) {
  console.log(`\n--- Citation ${c.id} ---`)
  console.log('Title:', c.title)
  console.log('Type:', c.typeLabel)
  console.log('Impact Factor:', c.impactFactor)
  console.log('DOI:', c.doi)
  console.log('Link:', c.link)
  console.log('Content:', c.citationContent.substring(0, 100))
}
