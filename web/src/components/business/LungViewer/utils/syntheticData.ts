export interface SyntheticLungData {
  volumeData: Float32Array
  shape: [number, number, number]
  spacing: [number, number, number]
}

export function generateSyntheticLungCT(
  width: number = 64,
  height: number = 64,
  depth: number = 64
): SyntheticLungData {
  const volumeData = new Float32Array(width * height * depth)

  const centerX = width / 2
  const centerY = height / 2
  const centerZ = depth / 2

  for (let z = 0; z < depth; z++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = z * width * height + y * width + x

        const dx = (x - centerX) / (width * 0.4)
        const dy = (y - centerY) / (height * 0.4)
        const dz = (z - centerZ) / (depth * 0.4)

        const distFromCenter = Math.sqrt(dx * dx + dy * dy + dz * dz)

        let hu = -1000

        const bodyMask = distFromCenter < 1.2
        if (bodyMask) {
          hu = -100

          const leftLungCenterX = centerX - width * 0.2
          const rightLungCenterX = centerX + width * 0.2

          const leftLungDx = (x - leftLungCenterX) / (width * 0.15)
          const leftLungDy = (y - centerY) / (height * 0.25)
          const leftLungDz = (z - centerZ) / (depth * 0.3)
          const leftLungDist = Math.sqrt(leftLungDx * leftLungDx + leftLungDy * leftLungDy + leftLungDz * leftLungDz)

          const rightLungDx = (x - rightLungCenterX) / (width * 0.15)
          const rightLungDy = (y - centerY) / (height * 0.25)
          const rightLungDz = (z - centerZ) / (depth * 0.3)
          const rightLungDist = Math.sqrt(rightLungDx * rightLungDx + rightLungDy * rightLungDy + rightLungDz * rightLungDz)

          if (leftLungDist < 1.0) {
            const edgeDist = 1 - leftLungDist
            hu = -900 + edgeDist * 400
            hu += (Math.random() - 0.5) * 50
          }

          if (rightLungDist < 1.0) {
            const edgeDist = 1 - rightLungDist
            hu = -900 + edgeDist * 400
            hu += (Math.random() - 0.5) * 50
          }

          if (leftLungDist < 0.3 || rightLungDist < 0.3) {
            hu = -950 + (Math.random() - 0.5) * 30
          }

          if (x > width * 0.3 && x < width * 0.7 && y > height * 0.4 && y < height * 0.6) {
            const spineDist = Math.abs(x - centerX) / (width * 0.05)
            if (spineDist < 1) {
              hu = 100 + (1 - spineDist) * 800
            }
          }

          const ribY = height * 0.25
          if (Math.abs(y - ribY) < height * 0.05) {
            const ribDist = Math.abs((x - centerX) % (width * 0.15)) / (width * 0.02)
            if (ribDist < 1) {
              hu = 300 + (1 - ribDist) * 700
            }
          }
        }

        volumeData[idx] = hu
      }
    }
  }

  return {
    volumeData,
    shape: [width, height, depth],
    spacing: [1.0, 1.0, 1.0]
  }
}

export function createSyntheticDicomFiles(data: SyntheticLungData): File[] {
  const files: File[] = []
  const { shape, volumeData } = data
  const [width, height, depth] = shape

  const metadata = {
    patientName: 'Synthetic^Test',
    patientId: 'TEST001',
    studyDate: '2024-01-01',
    seriesDate: '2024-01-01',
    seriesInstanceUid: '1.2.3.4.5.6.7.8.9',
    sopInstanceUid: '1.2.3.4.5.6.7.8.9.1',
    modality: 'CT',
    seriesDescription: 'Synthetic Lung Test',
    rows: height,
    columns: width,
    sliceThickness: 1.0,
    pixelSpacing: [1.0, 1.0] as [number, number],
    windowCenter: -600,
    windowWidth: 1500,
    bitsAllocated: 16,
    bitsStored: 16,
    rescaleIntercept: -1024,
    rescaleSlope: 1,
    numberOfFrames: 1,
    imagePositionPatient: [0, 0, 0] as [number, number, number],
    imageOrientationPatient: [1, 0, 0, 0, 1, 0] as [number, number, number, number, number, number]
  }

  for (let sliceIdx = 0; sliceIdx < depth; sliceIdx++) {
    const sliceData = new Int16Array(width * height)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const volIdx = sliceIdx * width * height + y * width + x
        sliceData[y * width + x] = Math.round(volumeData[volIdx])
      }
    }

    const dicomHeader = createDicomHeader({
      ...metadata,
      sopInstanceUid: `${metadata.sopInstanceUid}.${sliceIdx}`,
      imagePositionPatient: [0, 0, sliceIdx] as [number, number, number]
    })

    const headerBytes = new TextEncoder().encode(dicomHeader)
    const pixelBytes = new Uint8Array(sliceData.buffer)
    const combined = new Uint8Array(headerBytes.length + pixelBytes.length)
    combined.set(headerBytes)
    combined.set(pixelBytes, headerBytes.length)

    const file = new File([combined], `synthetic_slice_${sliceIdx}.dcm`, { type: 'application/dicom' })
    files.push(file)
  }

  return files
}

function createDicomHeader(metadata: any): string {
  const lines: string[] = []

  lines.push('\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00DICM')

  lines.push(formatDicomTag('00080005', 'CS', 'ISO_IR 100'))
  lines.push(formatDicomTag('00080016', 'UI', metadata.sopInstanceUid))
  lines.push(formatDicomTag('00080018', 'UI', metadata.sopInstanceUid))
  lines.push(formatDicomTag('00080020', 'DA', metadata.studyDate.replace(/-/g, '')))
  lines.push(formatDicomTag('00080021', 'DA', metadata.seriesDate.replace(/-/g, '')))
  lines.push(formatDicomTag('00080060', 'CS', metadata.modality))
  lines.push(formatDicomTag('0008103e', 'LO', metadata.seriesDescription))
  lines.push(formatDicomTag('00100010', 'PN', metadata.patientName))
  lines.push(formatDicomTag('00100020', 'LO', metadata.patientId))
  lines.push(formatDicomTag('0020000e', 'UI', metadata.seriesInstanceUid))
  lines.push(formatDicomTag('00200011', 'IS', '1'))
  lines.push(formatDicomTag('00200013', 'IS', '1'))
  lines.push(formatDicomTag('00280010', 'US', metadata.rows.toString()))
  lines.push(formatDicomTag('00280011', 'US', metadata.columns.toString()))
  lines.push(formatDicomTag('00280100', 'US', metadata.bitsAllocated.toString()))
  lines.push(formatDicomTag('00280101', 'US', metadata.bitsStored.toString()))
  lines.push(formatDicomTag('00281050', 'DS', metadata.windowCenter.toString()))
  lines.push(formatDicomTag('00281051', 'DS', metadata.windowWidth.toString()))
  lines.push(formatDicomTag('00281052', 'DS', metadata.rescaleIntercept.toString()))
  lines.push(formatDicomTag('00281053', 'DS', metadata.rescaleSlope.toString()))
  lines.push(formatDicomTag('00180050', 'DS', metadata.sliceThickness.toString()))
  lines.push(formatDicomTag('00280030', 'DS', `${metadata.pixelSpacing[0]}\\${metadata.pixelSpacing[1]}`))
  lines.push(formatDicomTag('00200032', 'DS', `${metadata.imagePositionPatient[0]}\\${metadata.imagePositionPatient[1]}\\${metadata.imagePositionPatient[2]}`))
  lines.push(formatDicomTag('00200037', 'DS', `${metadata.imageOrientationPatient[0]}\\${metadata.imageOrientationPatient[1]}\\${metadata.imageOrientationPatient[2]}\\${metadata.imageOrientationPatient[3]}\\${metadata.imageOrientationPatient[4]}\\${metadata.imageOrientationPatient[5]}`))
  lines.push(formatDicomTag('7fe00010', 'OW', ''))

  return lines.filter(l => l.length > 0).join('')
}

function formatDicomTag(group: string, vr: string, value: string): string {
  const tag = `(${group})`
  return `${tag} ${vr} ${value}`
}

export class SyntheticDataGenerator {
  private width: number
  private height: number
  private depth: number

  constructor(width: number = 64, height: number = 64, depth: number = 64) {
    this.width = width
    this.height = height
    this.depth = depth
  }

  generate(): SyntheticLungData {
    return generateSyntheticLungCT(this.width, this.height, this.depth)
  }

  generateFiles(): File[] {
    const data = this.generate()
    return createSyntheticDicomFiles(data)
  }
}
