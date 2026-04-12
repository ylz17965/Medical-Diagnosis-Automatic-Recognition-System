import { init as cornerstoneInit } from '@cornerstonejs/core'
import { init as toolsInit } from '@cornerstonejs/tools'

export async function initCornerstone3D(): Promise<void> {
  await cornerstoneInit()
  await toolsInit()
}

export { cornerstoneInit as init, toolsInit as initTools }
