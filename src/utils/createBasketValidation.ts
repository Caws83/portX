import { isValidAllocationTotal } from '@/utils/validation'

export interface CreateBasketValidationResult {
  isValid: boolean
  nameError?: string
  assetsError?: string
  allocationError?: string
}

export function validateCreateBasket(input: {
  name: string
  selectedSymbols: string[]
  weights: number[]
}): CreateBasketValidationResult {
  const trimmedName = input.name.trim()
  const assetCount = input.selectedSymbols.length
  const allocationValid = isValidAllocationTotal(input.weights)

  let nameError: string | undefined
  let assetsError: string | undefined
  let allocationError: string | undefined

  if (!trimmedName) {
    nameError = 'Basket name is required.'
  }

  if (assetCount < 2) {
    assetsError = 'Select at least 2 assets for a basket.'
  }

  if (assetCount > 0 && !allocationValid) {
    allocationError = 'Total allocation must equal 100%.'
  }

  return {
    isValid: !nameError && !assetsError && !allocationError,
    nameError,
    assetsError,
    allocationError,
  }
}
