import literatureDatabase from '../data/literature_database.json' with { type: 'json' }

console.log('=== Checking literature database import ===')
console.log('Type of literatureDatabase:', typeof literatureDatabase)
console.log('Keys:', Object.keys(literatureDatabase))
console.log('Has literature property:', 'literature' in literatureDatabase)
console.log('Literature count:', literatureDatabase.literature?.length)

if (literatureDatabase.literature) {
  console.log('\nFirst literature item:')
  console.log(JSON.stringify(literatureDatabase.literature[0], null, 2))
}
