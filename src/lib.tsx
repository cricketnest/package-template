import React from 'react'

export interface IStore {
  get: (key: symbol) => unknown
  set: (key: symbol, newValue: unknown) => unknown
  delete: (key: symbol) => unknown
}

export type ShouldUpdateStrategy = <V extends unknown>(
  prevStateValue: V,
  nextStateValue: V
) => boolean

export interface IStateConfig {
  store?: IStore
  id?: symbol
  shouldUpdateStrategy?: ShouldUpdateStrategy
}

export type StateInstance<V extends unknown> = {
  id: symbol;
  value: V;
  listen: <Handler extends (newValue: V) => unknown>(handler: Handler) => () => void;
  track: {
      (): V;
      (props: {
          children: (updatedState: V) => React.ReactNode;
      }): React.ReactNode;
  };
  destroy: () => void;
}

export const DEFAULT_SHOULD_UPDATE_STRATEGY: ShouldUpdateStrategy = Object.is
export const DEFAULT_STATE_CONFIG: IStateConfig = {}

export const state = <V extends unknown>(
  initialValue: V,
  config: IStateConfig = DEFAULT_STATE_CONFIG
): StateInstance<V> => {
  const id = config.id || Symbol()
  const store = config.store || new Map<symbol, V>()
  const shouldUpdateStrategy = config.shouldUpdateStrategy || DEFAULT_SHOULD_UPDATE_STRATEGY
  store.set(id, initialValue)
  type AnyOnChangeHandler = (newValue: V) => unknown
  const changeHandlersMap = new Map<symbol, AnyOnChangeHandler>()
  type Unsubscribe = () => void
  const listen = <Handler extends AnyOnChangeHandler>(handler: Handler): Unsubscribe => {
    const handlerId = Symbol()
    changeHandlersMap.set(handlerId, handler)
    return () => changeHandlersMap.delete(handlerId) as unknown as void
  }
  type TrackProps = {
    children: (updatedState: V) => React.ReactNode
  }
  function track(): V
  function track(props: TrackProps): React.ReactNode
  function track(
    props: TrackProps | undefined = undefined
  ): V | React.ReactNode {
    const [reactState, setReactState] = React.useState(() => store.get(id) as V)
    React.useEffect(() => listen((newValue) => setReactState(newValue)), [])
    if (props && props.children) {
      return typeof props.children === 'function' ? props.children(reactState) : null
    }
    return reactState
  }
  const destroy = () => store.delete(id) as unknown as void
  return {
    id,
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
    listen,
    track,
    destroy,
  }
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
