// NOTE: remove this line (or change the 1 into 0) if you don't want
// to work on the Type Safety part
/* eslint @typescript-eslint/no-explicit-any:1 */
import { defineStore, StateTree } from 'pinia'
import { computed, ComputedRef } from 'vue'

export function defineReadonlyState<
  Id extends string,
  PrivateState extends StateTree,
  SetupReturn
>(id: Id, privateStateFn: () => PrivateState, setup: (privateState: PrivateState) => SetupReturn) {
  const usePrivateStore = defineStore(id + '_private', {
    state: privateStateFn,
  })

  return defineStore(id, () => {
    const privateStore = usePrivateStore()
    const result = setup(privateStore.$state)


    const privateStateAsGetters: {
      [K in keyof PrivateState]: ComputedRef<PrivateState[K]>
    } = {} as any

    for (const key in privateStore.$state) {
      privateStateAsGetters[key] = computed(() => privateStore.$state[key])
    }

    return {
      ...privateStateAsGetters,
      ...result,
    }
  })
}
