import { FastifyInstance } from 'fastify'
import { EvaluationFramework } from './evaluation-framework.js'
import { DialogStateMachine, IntentRecognizer, type Intent } from '../services/dialog/index.js'
import { knowledgeGraph } from '../knowledge_graph/index.js'
import testMedicalExam from './test_medical_exam.json' with { type: 'json' }
import testDialogue from './test_dialogue.json' with { type: 'json' }
import testEdgeCases from './test_edge_cases.json' with { type: 'json' }

export default async function testRoutes(fastify: FastifyInstance) {
  const framework = new EvaluationFramework()
  const dialogMachine = new DialogStateMachine()
  const intentRecognizer = new IntentRecognizer()

  fastify.post('/run/all', async (request, reply) => {
    try {
      framework.clearResults()
      await knowledgeGraph.load()

      await runMedicalExamTests(framework, dialogMachine)
      await runDialogueTests(framework, dialogMachine)
      await runEdgeCaseTests(framework, intentRecognizer, dialogMachine)

      const report = framework.generateReport()
      const metrics = framework.getMetrics()

      return {
        success: true,
        data: {
          report,
          metrics
        }
      }
    } catch (error) {
      fastify.log.error(error, '测试执行失败')
      return reply.status(500).send({ error: '测试执行失败' })
    }
  })

  fastify.post('/run/medical-exam', async (request, reply) => {
    try {
      framework.clearResults()
      await knowledgeGraph.load()

      await runMedicalExamTests(framework, dialogMachine)
      const report = framework.generateReport()

      return {
        success: true,
        data: { report }
      }
    } catch (error) {
      fastify.log.error(error, '医学考试测试失败')
      return reply.status(500).send({ error: '医学考试测试失败' })
    }
  })

  fastify.post('/run/dialogue', async (request, reply) => {
    try {
      framework.clearResults()

      await runDialogueTests(framework, dialogMachine)
      const report = framework.generateReport()

      return {
        success: true,
        data: { report }
      }
    } catch (error) {
      fastify.log.error(error, '对话测试失败')
      return reply.status(500).send({ error: '对话测试失败' })
    }
  })

  fastify.post('/run/edge-cases', async (request, reply) => {
    try {
      framework.clearResults()

      await runEdgeCaseTests(framework, intentRecognizer, dialogMachine)
      const report = framework.generateReport()

      return {
        success: true,
        data: { report }
      }
    } catch (error) {
      fastify.log.error(error, '边界情况测试失败')
      return reply.status(500).send({ error: '边界情况测试失败' })
    }
  })

  fastify.get('/datasets/info', async () => {
    return {
      success: true,
      data: {
        medicalExam: {
          name: testMedicalExam.metadata.name,
          total: testMedicalExam.metadata.total_questions,
          categories: testMedicalExam.metadata.categories
        },
        dialogue: {
          name: testDialogue.metadata.name,
          total: testDialogue.metadata.total_dialogues,
          categories: testDialogue.metadata.categories
        },
        edgeCases: {
          name: testEdgeCases.metadata.name,
          total: testEdgeCases.metadata.total_cases,
          categories: testEdgeCases.metadata.categories
        }
      }
    }
  })

  fastify.get('/report/latest', async () => {
    const report = framework.generateReport()
    const metrics = framework.getMetrics()

    return {
      success: true,
      data: { report, metrics }
    }
  })
}

async function runMedicalExamTests(
  framework: EvaluationFramework,
  dialogMachine: DialogStateMachine
): Promise<void> {
  for (const question of testMedicalExam.questions.slice(0, 10)) {
    const sessionId = `test_${question.id}`
    const { context, action } = dialogMachine.processInput(sessionId, question.question)

    await framework.runTest(
      {
        id: question.id,
        category: question.category,
        input: question.question,
        expected_behavior: {
          expected_entities: question.key_entities
        },
        difficulty: question.difficulty
      },
      {
        intent: context.intent || undefined,
        entities: context.history[context.history.length - 1]?.entities || [],
        action: action.type,
        response: action.response
      }
    )
  }
}

async function runDialogueTests(
  framework: EvaluationFramework,
  dialogMachine: DialogStateMachine
): Promise<void> {
  for (const dialogue of testDialogue.dialogues.slice(0, 10)) {
    const sessionId = `test_${dialogue.id}`

    for (const turn of dialogue.turns) {
      if (turn.role === 'user' && turn.content) {
        const { context, action } = dialogMachine.processInput(sessionId, turn.content)

        await framework.runTest(
          {
            id: `${dialogue.id}_${turn.role}`,
            category: dialogue.category,
            input: turn.content,
            expected_behavior: {
              expected_intent: (turn as any).expected_intent as Intent | undefined,
              expected_entities: (turn as any).expected_entities,
              expected_action: (turn as any).expected_action,
              expected_slot: (turn as any).expected_slot
            },
            difficulty: dialogue.difficulty
          },
          {
            intent: context.intent || undefined,
            entities: context.history[context.history.length - 1]?.entities || [],
            action: action.type,
            response: action.response
          }
        )
      }
    }

    dialogMachine.resetSession(sessionId)
  }
}

async function runEdgeCaseTests(
  framework: EvaluationFramework,
  intentRecognizer: IntentRecognizer,
  dialogMachine: DialogStateMachine
): Promise<void> {
  for (const testCase of testEdgeCases.test_cases) {
    const { intent, entities } = intentRecognizer.recognizeIntent(testCase.input)
    const sessionId = `test_${testCase.id}`
    const { context, action } = dialogMachine.processInput(sessionId, testCase.input)

    await framework.runTest(
      {
        id: testCase.id,
        category: testCase.category,
        input: testCase.input,
        expected_behavior: {
          expected_intent: (testCase.expected_behavior as any).expected_intent as Intent | undefined,
          expected_intents: (testCase.expected_behavior as any).expected_intents as Intent[] | undefined,
          expected_entities: (testCase.expected_behavior as any).expected_entities,
          expected_action: (testCase.expected_behavior as any).expected_action,
          expected_slot: (testCase.expected_behavior as any).expected_slot,
          should_request_clarification: testCase.expected_behavior.should_request_clarification,
          should_handle_multiple_intents: (testCase.expected_behavior as any).should_handle_multiple_intents,
          should_understand_colloquial: (testCase.expected_behavior as any).should_understand_colloquial,
          should_correct_misconception: (testCase.expected_behavior as any).should_correct_misconception,
          should_detect_emergency: (testCase.expected_behavior as any).should_detect_emergency,
          should_detect_crisis: (testCase.expected_behavior as any).should_detect_crisis,
          expected_response_contains: (testCase.expected_behavior as any).expected_response_contains
        },
        difficulty: testCase.difficulty,
        priority: (testCase as any).priority
      },
      {
        intent: intent,
        entities: entities,
        action: action.type,
        response: action.response
      }
    )

    dialogMachine.resetSession(sessionId)
  }
}
