import React from 'react'

export interface IAnyStore {
  get: (key: symbol) => unknown
  set: (key: symbol, newValue: unknown) => unknown
  delete: (key: symbol) => unknown
}
export type ShouldUpdateStrategy = <V extends unknown>(
  prevStateValue: V,
  nextStateValue: V
) => boolean
export interface IStateConfig {
  store?: IAnyStore
  id?: symbol
  shouldUpdateStrategy?: ShouldUpdateStrategy
}
export const DEFAULT_SHOULD_UPDATE_STRATEGY: ShouldUpdateStrategy = Object.is
export const DEFAULT_STATE_CONFIG: IStateConfig = {}

export const state = <V extends unknown>(
  initialValue: V,
  config: IStateConfig = DEFAULT_STATE_CONFIG
) => {
  const id = config.id || Symbol()
  const store = config.store || new Map<symbol, unknown>()
  const shouldUpdateStrategy = config.shouldUpdateStrategy || DEFAULT_SHOULD_UPDATE_STRATEGY
  store.set(id, initialValue)
  type AnyOnChangeHandler = (newValue: V) => unknown
  const changeHandlersMap = new Map<symbol, AnyOnChangeHandler>()
  type Unsubscribe = () => void
  const self = {
    get value() {
      return store.get(id) as V
    },
    set value(next: V) {
      const prev = store.get(id)
      const shouldUpdate = shouldUpdateStrategy(prev, next)
      if (shouldUpdate) {
        store.set(id, next)
        changeHandlersMap.forEach((handler) => handler(next))
      }
    },
    onChange: <Handler extends AnyOnChangeHandler>(handler: Handler): Unsubscribe => {
      const handlerId = Symbol()
      changeHandlersMap.set(handlerId, handler)
      return () => changeHandlersMap.delete(handlerId) as unknown as void
    },
    destroy: () => {
      console.log('destroy state', id)
      store.delete(id) as unknown as void
    },
    useTrack: () => {
      const [reactState, setReactState] = React.useState(() => self.value)
      React.useEffect(() => self.onChange((newValue) => setReactState(newValue)), [])
      return reactState
    },
  }
  return self
}

export const useState = <V extends unknown>(
  initialValue: V,
  config: IStateConfig = DEFAULT_STATE_CONFIG
) => {
  const [instance] = React.useState(() => state<V>(initialValue, config))
  React.useEffect(
    () => () => {
      instance.destroy()
    },
    []
  )
  return instance
}
