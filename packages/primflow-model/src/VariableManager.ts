import { DataTypeRegistry } from './DataTypes'

export type VariableDef = { name: string; type: string; value: unknown }

export class VariableManager {
  private variables: Map<string, VariableDef> = new Map()

  private readonly dataTypes: DataTypeRegistry

  constructor(dataTypes = new DataTypeRegistry()) {
    this.dataTypes = dataTypes
  }

  setVariable(variable: VariableDef, options?: { preserveInvalid?: boolean }) {
    if (!options?.preserveInvalid) this.dataTypes.assertValue(variable.type, variable.value, `Variable "${variable.name}"`)
    this.variables.set(variable.name, variable)
    return this
  }

  setVariableValue(name: string, value: VariableDef['value']) {
    const variable = this.variables.get(name)
    if (!variable) {
      throw new Error(`Variable "${name}" does not exist.`)
    }

    this.dataTypes.assertValue(variable.type, value, `Variable "${name}"`)
    this.variables.set(name, { ...variable, value })
    return this
  }

  getVariable(name: string): VariableDef | undefined {
    return this.variables.get(name)
  }

  getVariableValue<T>(name: string): T | undefined {
    const variable = this.variables.get(name)
    if (!variable) return
    return variable.value as T
  }

  deleteVariable(name: string) {
    this.variables.delete(name)
    return this
  }

  getAllVariables(): VariableDef[] {
    return Array.from(this.variables.values())
  }

  clear() {
    this.variables.clear()
    return this
  }
}
