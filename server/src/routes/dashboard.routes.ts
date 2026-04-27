import type { FastifyInstance } from 'fastify'
import type { FastifyRequest, FastifyReply } from 'fastify'
import { DashboardService } from '../services/dashboard.service.js'
import { authenticate } from '../middleware/auth.middleware.js'

export async function dashboardRoutes(fastify: FastifyInstance) {
  const dashboardService = new DashboardService(fastify.prisma)

  fastify.addHook('preHandler', authenticate)

  fastify.get('/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    const stats = await dashboardService.getStats()
    return {
      success: true,
      data: stats,
    }
  })

  fastify.get('/consultation-trend', async (request: FastifyRequest, reply: FastifyReply) => {
    const trend = await dashboardService.getConsultationTrend()
    return {
      success: true,
      data: trend,
    }
  })

  fastify.get('/disease-distribution', async (request: FastifyRequest, reply: FastifyReply) => {
    const distribution = await dashboardService.getDiseaseDistribution()
    return {
      success: true,
      data: distribution,
    }
  })

  fastify.get('/recent-activities', async (request: FastifyRequest, reply: FastifyReply) => {
    const activities = await dashboardService.getRecentActivities()
    return {
      success: true,
      data: activities,
    }
  })

  fastify.get('/feature-stats', async (request: FastifyRequest, reply: FastifyReply) => {
    const featureStats = await dashboardService.getFeatureStats()
    return {
      success: true,
      data: featureStats,
    }
  })
}
