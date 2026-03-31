import type {
  Disease,
  Symptom,
  Drug,
  Examination,
  Department,
  BodyPart,
  Relation,
  EntityType,
  RelationType
} from './schema'
import { readFile } from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

interface KnowledgeNode {
  id: string
  type: EntityType
  data: Disease | Symptom | Drug | Examination | Department | BodyPart
}

interface GraphData {
  diseases: Disease[]
  symptoms: Symptom[]
  drugs: Drug[]
  examinations: Examination[]
  departments: Department[]
  bodyParts: BodyPart[]
  relations: Relation[]
}

class KnowledgeGraph {
  private nodes: Map<string, KnowledgeNode> = new Map()
  private relations: Relation[] = []
  private indexByName: Map<string, string[]> = new Map()
  private indexByType: Map<EntityType, string[]> = new Map()
  private adjacencyList: Map<string, Relation[]> = new Map()
  private loaded = false

  async load(): Promise<void> {
    if (this.loaded) return

    const data = await this.loadData()
    this.buildGraph(data)
    this.loaded = true
  }

  private async loadData(): Promise<GraphData> {
    const dataPath = join(__dirname, 'data', 'medical_knowledge.json')
    const content = await readFile(dataPath, 'utf-8')
    return JSON.parse(content)
  }

  private buildGraph(data: GraphData): void {
    data.diseases.forEach(d => {
      this.nodes.set(d.id, { id: d.id, type: 'Disease', data: d })
      this.indexByName.set(d.name, [...(this.indexByName.get(d.name) || []), d.id])
      d.aliases.forEach(alias => {
        this.indexByName.set(alias, [...(this.indexByName.get(alias) || []), d.id])
      })
    })

    data.symptoms.forEach(s => {
      this.nodes.set(s.id, { id: s.id, type: 'Symptom', data: s })
      this.indexByName.set(s.name, [...(this.indexByName.get(s.name) || []), s.id])
      s.aliases.forEach(alias => {
        this.indexByName.set(alias, [...(this.indexByName.get(alias) || []), s.id])
      })
    })

    data.drugs.forEach(d => {
      this.nodes.set(d.id, { id: d.id, type: 'Drug', data: d })
      this.indexByName.set(d.name, [...(this.indexByName.get(d.name) || []), d.id])
      d.aliases.forEach(alias => {
        this.indexByName.set(alias, [...(this.indexByName.get(alias) || []), d.id])
      })
    })

    data.examinations.forEach(e => {
      this.nodes.set(e.id, { id: e.id, type: 'Examination', data: e })
      this.indexByName.set(e.name, [...(this.indexByName.get(e.name) || []), e.id])
      e.aliases.forEach(alias => {
        this.indexByName.set(alias, [...(this.indexByName.get(alias) || []), e.id])
      })
    })

    data.departments.forEach(d => {
      this.nodes.set(d.id, { id: d.id, type: 'Department', data: d })
      this.indexByName.set(d.name, [...(this.indexByName.get(d.name) || []), d.id])
      d.aliases.forEach(alias => {
        this.indexByName.set(alias, [...(this.indexByName.get(alias) || []), d.id])
      })
    })

    data.bodyParts.forEach(b => {
      this.nodes.set(b.id, { id: b.id, type: 'BodyPart', data: b })
      this.indexByName.set(b.name, [...(this.indexByName.get(b.name) || []), b.id])
    })

    this.relations = data.relations

    this.relations.forEach(r => {
      const outgoing = this.adjacencyList.get(r.sourceId) || []
      outgoing.push(r)
      this.adjacencyList.set(r.sourceId, outgoing)

      const incoming = this.adjacencyList.get(r.targetId) || []
      incoming.push(r)
      this.adjacencyList.set(r.targetId, incoming)
    })

    this.indexByType.set('Disease', data.diseases.map(d => d.id))
    this.indexByType.set('Symptom', data.symptoms.map(s => s.id))
    this.indexByType.set('Drug', data.drugs.map(d => d.id))
    this.indexByType.set('Examination', data.examinations.map(e => e.id))
    this.indexByType.set('Department', data.departments.map(d => d.id))
    this.indexByType.set('BodyPart', data.bodyParts.map(b => b.id))
  }

  getNode(id: string): KnowledgeNode | undefined {
    return this.nodes.get(id)
  }

  getNodeByName(name: string): KnowledgeNode[] {
    const ids = this.indexByName.get(name) || []
    return ids.map(id => this.nodes.get(id)!).filter(Boolean)
  }

  getNodesByType(type: EntityType): KnowledgeNode[] {
    const ids = this.indexByType.get(type) || []
    return ids.map(id => this.nodes.get(id)!).filter(Boolean)
  }

  getRelations(nodeId: string, direction: 'outgoing' | 'incoming' | 'both' = 'both'): Relation[] {
    const allRelations = this.adjacencyList.get(nodeId) || []
    if (direction === 'both') return allRelations
    if (direction === 'outgoing') return allRelations.filter(r => r.sourceId === nodeId)
    return allRelations.filter(r => r.targetId === nodeId)
  }

  getRelationsByType(nodeId: string, relationType: RelationType): Relation[] {
    return this.getRelations(nodeId).filter(r => r.type === relationType)
  }

  getRelatedNodes(nodeId: string, relationType?: RelationType): KnowledgeNode[] {
    const relations = relationType
      ? this.getRelationsByType(nodeId, relationType)
      : this.getRelations(nodeId)

    const relatedIds = new Set<string>()
    relations.forEach(r => {
      if (r.sourceId !== nodeId) relatedIds.add(r.sourceId)
      if (r.targetId !== nodeId) relatedIds.add(r.targetId)
    })

    return Array.from(relatedIds).map(id => this.nodes.get(id)!).filter(Boolean)
  }

  search(query: string, limit = 10): KnowledgeNode[] {
    const lowerQuery = query.toLowerCase()
    const results: { node: KnowledgeNode; score: number }[] = []

    this.nodes.forEach(node => {
      let score = 0
      const data = node.data as { name: string; aliases?: string[]; description?: string }

      if (data.name.toLowerCase().includes(lowerQuery)) {
        score = 10
      } else if (data.aliases?.some(a => a.toLowerCase().includes(lowerQuery))) {
        score = 8
      } else if (data.description?.toLowerCase().includes(lowerQuery)) {
        score = 5
      }

      if (score > 0) {
        results.push({ node, score })
      }
    })

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(r => r.node)
  }

  findPath(startId: string, endId: string, maxDepth = 3): KnowledgeNode[][] {
    const paths: KnowledgeNode[][] = []
    const visited = new Set<string>()

    const dfs = (currentId: string, path: KnowledgeNode[], depth: number) => {
      if (depth > maxDepth) return
      if (currentId === endId) {
        paths.push([...path, this.nodes.get(endId)!])
        return
      }

      visited.add(currentId)
      const related = this.getRelatedNodes(currentId)

      for (const node of related) {
        if (!visited.has(node.id)) {
          dfs(node.id, [...path, node], depth + 1)
        }
      }

      visited.delete(currentId)
    }

    const startNode = this.nodes.get(startId)
    if (startNode) {
      dfs(startId, [startNode], 0)
    }

    return paths.sort((a, b) => a.length - b.length)
  }

  getDiseaseSymptoms(diseaseId: string): { symptom: Symptom; weight: number }[] {
    const relations = this.getRelationsByType(diseaseId, 'HAS_SYMPTOM')
    return relations
      .map(r => {
        const node = this.nodes.get(r.targetId)
        if (node?.type === 'Symptom') {
          return { symptom: node.data as Symptom, weight: r.weight }
        }
        return null
      })
      .filter((item): item is { symptom: Symptom; weight: number } => item !== null)
      .sort((a, b) => b.weight - a.weight)
  }

  getDiseaseDrugs(diseaseId: string): { drug: Drug; weight: number }[] {
    const relations = this.getRelationsByType(diseaseId, 'TREATED_BY')
    return relations
      .map(r => {
        const node = this.nodes.get(r.targetId)
        if (node?.type === 'Drug') {
          return { drug: node.data as Drug, weight: r.weight }
        }
        return null
      })
      .filter((item): item is { drug: Drug; weight: number } => item !== null)
      .sort((a, b) => b.weight - a.weight)
  }

  getDiseaseExaminations(diseaseId: string): { examination: Examination; weight: number }[] {
    const relations = this.getRelationsByType(diseaseId, 'NEEDS_EXAMINATION')
    return relations
      .map(r => {
        const node = this.nodes.get(r.targetId)
        if (node?.type === 'Examination') {
          return { examination: node.data as Examination, weight: r.weight }
        }
        return null
      })
      .filter((item): item is { examination: Examination; weight: number } => item !== null)
      .sort((a, b) => b.weight - a.weight)
  }

  getDrugSideEffects(drugId: string): { symptom: Symptom; weight: number }[] {
    const relations = this.getRelationsByType(drugId, 'HAS_SIDE_EFFECT')
    return relations
      .map(r => {
        const node = this.nodes.get(r.targetId)
        if (node?.type === 'Symptom') {
          return { symptom: node.data as Symptom, weight: r.weight }
        }
        return null
      })
      .filter((item): item is { symptom: Symptom; weight: number } => item !== null)
      .sort((a, b) => b.weight - a.weight)
  }

  getSymptomDiseases(symptomId: string): { disease: Disease; weight: number }[] {
    const relations = this.getRelations(symptomId, 'incoming').filter(r => r.type === 'HAS_SYMPTOM')
    return relations
      .map(r => {
        const node = this.nodes.get(r.sourceId)
        if (node?.type === 'Disease') {
          return { disease: node.data as Disease, weight: r.weight }
        }
        return null
      })
      .filter((item): item is { disease: Disease; weight: number } => item !== null)
      .sort((a, b) => b.weight - a.weight)
  }

  diagnoseBySymptoms(symptomIds: string[]): { disease: Disease; score: number }[] {
    const diseaseScores = new Map<string, number>()

    symptomIds.forEach(symptomId => {
      const diseaseRelations = this.getRelations(symptomId, 'incoming')
        .filter(r => r.type === 'HAS_SYMPTOM')

      diseaseRelations.forEach(r => {
        const currentScore = diseaseScores.get(r.sourceId) || 0
        diseaseScores.set(r.sourceId, currentScore + r.weight)
      })
    })

    const results = Array.from(diseaseScores.entries())
      .map(([diseaseId, score]) => {
        const node = this.nodes.get(diseaseId)
        if (node?.type === 'Disease') {
          return { disease: node.data as Disease, score }
        }
        return null
      })
      .filter((item): item is { disease: Disease; score: number } => item !== null)
      .sort((a, b) => b.score - a.score)

    return results
  }

  getStats(): {
    nodeCount: number
    relationCount: number
    nodeTypeCounts: Record<EntityType, number>
    relationTypeCounts: Record<string, number>
  } {
    const nodeTypeCounts: Record<EntityType, number> = {
      Disease: 0,
      Symptom: 0,
      Drug: 0,
      Examination: 0,
      BodyPart: 0,
      Department: 0
    }

    this.nodes.forEach(node => {
      nodeTypeCounts[node.type]++
    })

    const relationTypeCounts: Record<string, number> = {}
    this.relations.forEach(r => {
      relationTypeCounts[r.type] = (relationTypeCounts[r.type] || 0) + 1
    })

    return {
      nodeCount: this.nodes.size,
      relationCount: this.relations.length,
      nodeTypeCounts,
      relationTypeCounts
    }
  }
}

export const knowledgeGraph = new KnowledgeGraph()
export type { KnowledgeNode, GraphData }
