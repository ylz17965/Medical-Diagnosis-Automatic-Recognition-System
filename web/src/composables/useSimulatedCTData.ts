import { ref } from 'vue'

export interface SimulatedCTData {
  scalars: Float32Array
  dimensions: [number, number, number]
  spacing: [number, number, number]
  metadata: {
    patientName: string
    studyDate: string
    seriesDescription: string
    sliceThickness: number
    windowCenter: number
    windowWidth: number
  }
}

export function useSimulatedCTData() {
  const isGenerating = ref(false)

  const generateLungCT = async (size: number = 128): Promise<SimulatedCTData> => {
    isGenerating.value = true

    return new Promise((resolve) => {
      setTimeout(() => {
        const dimensions: [number, number, number] = [size, size, size]
        const spacing: [number, number, number] = [1.0, 1.0, 2.5]
        
        const totalVoxels = size * size * size
        const scalars = new Float32Array(totalVoxels)

        const centerX = size / 2
        const centerY = size / 2
        const centerZ = size / 2

        const outerRadius = size * 0.4
        const lungRadiusX = size * 0.15
        const lungRadiusY = size * 0.25
        const lungRadiusZ = size * 0.35

        const leftLungCenterX = centerX - size * 0.15
        const rightLungCenterX = centerX + size * 0.15

        for (let z = 0; z < size; z++) {
          for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
              const index = z * size * size + y * size + x

              const dx = x - centerX
              const dy = y - centerY
              const dz = z - centerZ
              const distFromCenter = Math.sqrt(dx * dx + dy * dy + dz * dz)

              if (distFromCenter > outerRadius) {
                scalars[index] = -1000
                continue
              }

              const dxLeft = x - leftLungCenterX
              const distLeftLung = Math.sqrt((dxLeft / lungRadiusX) ** 2 + (dy / lungRadiusY) ** 2 + (dz / lungRadiusZ) ** 2)
              
              const dxRight = x - rightLungCenterX
              const distRightLung = Math.sqrt((dxRight / lungRadiusX) ** 2 + (dy / lungRadiusY) ** 2 + (dz / lungRadiusZ) ** 2)

              if (distLeftLung < 1 || distRightLung < 1) {
                scalars[index] = -800 + Math.random() * 100
              } else if (distFromCenter < outerRadius * 0.85) {
                const tissueDensity = 40 + Math.random() * 20
                scalars[index] = tissueDensity
              } else {
                scalars[index] = -200 + Math.random() * 100
              }

              if (Math.random() < 0.002 && scalars[index] > -500) {
                scalars[index] = 300 + Math.random() * 200
              }
            }
          }
        }

        const tracheaRadius = size * 0.03
        for (let z = 0; z < size * 0.6; z++) {
          for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
              const dx = x - centerX
              const dy = y - centerY
              const dist = Math.sqrt(dx * dx + dy * dy)
              
              if (dist < tracheaRadius) {
                const index = z * size * size + y * size + x
                scalars[index] = -900 + Math.random() * 50
              }
            }
          }
        }

        const vesselRadius = size * 0.02
        for (let i = 0; i < 5; i++) {
          const startX = centerX + (Math.random() - 0.5) * size * 0.3
          const startY = centerY + (Math.random() - 0.5) * size * 0.3
          const angle = Math.random() * Math.PI * 2
          
          for (let z = size * 0.3; z < size * 0.8; z++) {
            const vx = startX + Math.cos(angle) * (z - size * 0.3) * 0.1
            const vy = startY + Math.sin(angle) * (z - size * 0.3) * 0.1
            
            for (let y = 0; y < size; y++) {
              for (let x = 0; x < size; x++) {
                const dx = x - vx
                const dy = y - vy
                const dist = Math.sqrt(dx * dx + dy * dy)
                
                if (dist < vesselRadius) {
                  const index = z * size * size + y * size + x
                  scalars[index] = 50 + Math.random() * 30
                }
              }
            }
          }
        }

        isGenerating.value = false

        resolve({
          scalars,
          dimensions,
          spacing,
          metadata: {
            patientName: 'Simulated Patient',
            studyDate: new Date().toISOString().split('T')[0],
            seriesDescription: 'Simulated Lung CT',
            sliceThickness: 2.5,
            windowCenter: -600,
            windowWidth: 1500,
          },
        })
      }, 100)
    })
  }

  const generateSimpleSphere = async (size: number = 64): Promise<SimulatedCTData> => {
    isGenerating.value = true

    return new Promise((resolve) => {
      setTimeout(() => {
        const dimensions: [number, number, number] = [size, size, size]
        const spacing: [number, number, number] = [1.0, 1.0, 1.0]
        
        const totalVoxels = size * size * size
        const scalars = new Float32Array(totalVoxels)

        const center = size / 2
        const radius = size * 0.4

        for (let z = 0; z < size; z++) {
          for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
              const index = z * size * size + y * size + x
              const dist = Math.sqrt((x - center) ** 2 + (y - center) ** 2 + (z - center) ** 2)
              
              if (dist < radius) {
                scalars[index] = 100 + (1 - dist / radius) * 400
              } else {
                scalars[index] = -1000
              }
            }
          }
        }

        isGenerating.value = false

        resolve({
          scalars,
          dimensions,
          spacing,
          metadata: {
            patientName: 'Test Sphere',
            studyDate: new Date().toISOString().split('T')[0],
            seriesDescription: 'Simulated Sphere',
            sliceThickness: 1.0,
            windowCenter: 100,
            windowWidth: 500,
          },
        })
      }, 50)
    })
  }

  return {
    isGenerating,
    generateLungCT,
    generateSimpleSphere,
  }
}
