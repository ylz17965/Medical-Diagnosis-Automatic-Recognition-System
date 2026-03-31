import type {
  Slot,
  SlotName,
  DialogContext,
  ExtractedEntity,
  DialogAction
} from './dialog.types.js'
import { SLOT_PROMPTS, STATE_DEFINITIONS } from './dialog.types.js'

export class SlotFiller {
  private entityToSlotMap: Record<string, SlotName> = {
    symptom: 'symptoms',
    drug: 'drug',
    examination: 'examination',
    disease: 'disease',
    body_part: 'body_part',
    duration: 'duration',
    severity: 'severity',
    age: 'age'
  }

  fillSlots(
    context: DialogContext,
    entities: ExtractedEntity[]
  ): DialogContext {
    const updatedContext = { ...context }
    const stateDef = STATE_DEFINITIONS[context.currentState]

    for (const entity of entities) {
      const slotName = this.entityToSlotMap[entity.type]
      if (!slotName) continue

      const isRequired = stateDef.requiredSlots.includes(slotName)
      const isOptional = stateDef.optionalSlots.includes(slotName)

      if (!isRequired && !isOptional) continue

      const existingSlot = updatedContext.slots.get(slotName)
      if (existingSlot?.confirmed) continue

      const slot: Slot = {
        name: slotName,
        value: this.normalizeSlotValue(slotName, entity.value, existingSlot?.value),
        required: isRequired,
        confirmed: false,
        prompted: existingSlot?.prompted || false
      }

      updatedContext.slots.set(slotName, slot)
    }

    updatedContext.updatedAt = new Date()
    return updatedContext
  }

  private normalizeSlotValue(
    slotName: SlotName,
    newValue: string,
    existingValue?: string | string[] | number | null
  ): string | string[] | number | null {
    if (slotName === 'symptoms') {
      const symptoms = Array.isArray(existingValue) ? [...existingValue] : []
      if (!symptoms.includes(newValue)) {
        symptoms.push(newValue)
      }
      return symptoms
    }

    if (slotName === 'age') {
      const age = parseInt(newValue, 10)
      return isNaN(age) ? null : age
    }

    return newValue
  }

  getMissingRequiredSlots(context: DialogContext): SlotName[] {
    const stateDef = STATE_DEFINITIONS[context.currentState]
    const missing: SlotName[] = []

    for (const slotName of stateDef.requiredSlots) {
      const slot = context.slots.get(slotName)
      if (!slot || slot.value === null || slot.value === undefined) {
        missing.push(slotName)
      }
    }

    return missing
  }

  getNextSlotToRequest(context: DialogContext): SlotName | null {
    const missing = this.getMissingRequiredSlots(context)
    if (missing.length === 0) return null

    for (const slotName of missing) {
      const slot = context.slots.get(slotName)
      if (!slot?.prompted) {
        return slotName
      }
    }

    return missing[0]
  }

  createSlotRequestAction(slotName: SlotName): DialogAction {
    return {
      type: 'request_slot',
      slotToRequest: slotName,
      response: SLOT_PROMPTS[slotName]
    }
  }

  confirmSlot(context: DialogContext, slotName: SlotName): DialogContext {
    const updatedContext = { ...context }
    const slot = updatedContext.slots.get(slotName)

    if (slot) {
      slot.confirmed = true
      updatedContext.slots.set(slotName, { ...slot })
    }

    updatedContext.updatedAt = new Date()
    return updatedContext
  }

  clearSlot(context: DialogContext, slotName: SlotName): DialogContext {
    const updatedContext = { ...context }
    updatedContext.slots.delete(slotName)
    updatedContext.updatedAt = new Date()
    return updatedContext
  }

  getSlotSummary(context: DialogContext): string {
    const filledSlots: string[] = []

    context.slots.forEach((slot, name) => {
      if (slot.value !== null && slot.value !== undefined) {
        const valueStr = Array.isArray(slot.value)
          ? slot.value.join('、')
          : String(slot.value)
        filledSlots.push(`${this.getSlotDisplayName(name)}: ${valueStr}`)
      }
    })

    return filledSlots.length > 0
      ? `已收集信息：${filledSlots.join('；')}`
      : '暂未收集到信息'
  }

  private getSlotDisplayName(slotName: SlotName): string {
    const displayNames: Record<SlotName, string> = {
      symptoms: '症状',
      duration: '持续时间',
      severity: '严重程度',
      body_part: '部位',
      disease: '疾病',
      drug: '药品',
      examination: '检查项目',
      age: '年龄',
      gender: '性别',
      medical_history: '病史',
      current_medication: '当前用药',
      allergies: '过敏史'
    }
    return displayNames[slotName]
  }

  areAllRequiredSlotsFilled(context: DialogContext): boolean {
    return this.getMissingRequiredSlots(context).length === 0
  }

  getSlotConfidence(context: DialogContext, slotName: SlotName): number {
    const slot = context.slots.get(slotName)
    if (!slot || slot.value === null) return 0

    if (slot.confirmed) return 1.0

    if (Array.isArray(slot.value) && slot.value.length > 0) {
      return 0.8
    }

    return 0.7
  }

  mergeSlotValues(
    context: DialogContext,
    slotName: SlotName,
    additionalValues: string[]
  ): DialogContext {
    const updatedContext = { ...context }
    const existingSlot = updatedContext.slots.get(slotName)

    if (slotName === 'symptoms') {
      const existingSymptoms = Array.isArray(existingSlot?.value)
        ? existingSlot.value as string[]
        : []

      const mergedSymptoms = [...new Set([...existingSymptoms, ...additionalValues])]

      const slot: Slot = {
        name: slotName,
        value: mergedSymptoms,
        required: existingSlot?.required ?? false,
        confirmed: false,
        prompted: existingSlot?.prompted ?? false
      }

      updatedContext.slots.set(slotName, slot)
    }

    updatedContext.updatedAt = new Date()
    return updatedContext
  }
}
