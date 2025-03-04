import { computed, ref, type ComputedRef, shallowRef } from 'vue'
import { useDataFetchingStore } from './data-fetching-store'

type _MutationKeys<TParams extends readonly any[], TResult> = readonly (
  | string
  | ((context: { variables: TParams; result: TResult }) => string)
)[]

export interface UseMutationsOptions<TResult = unknown, TParams extends readonly unknown[] = readonly []> {
  /**
   * Mutator function that will be called when `mutate()` is called
   */
  mutation: (...args: TParams) => Promise<TResult>
  /**
   * keys related to the data the mutation affects. If the mutation is successful, it will invalidate the query with the
   * same key and refetch it
   */
  keys?: _MutationKeys<TParams, TResult>
}

export interface UseMutationReturn<
  TResult = unknown,
  TParams extends readonly unknown[] = readonly [],
  TError = Error,
> {
  data: ComputedRef<TResult | undefined>
  error: ComputedRef<TError | null>
  isFetching: ComputedRef<boolean>

  mutate: (...params: TParams) => Promise<TResult>
}

export function useMutation<TResult, TParams extends readonly unknown[], TError = Error>(
  options: UseMutationsOptions<TResult, TParams>,
): UseMutationReturn<TResult, TParams, TError> {
  const store = useDataFetchingStore()

  const isFetching = ref(false)
  const data = shallowRef<TResult>()
  const error = shallowRef<TError | null>(null)

  // a pending promise allows us to discard previous ongoing requests
  let pendingPromise: Promise<TResult> | null = null


  function mutate(...args: TParams) {
    isFetching.value = true
    error.value = null

    const promise = (pendingPromise = options
      .mutation(...args)
      .then(_data => {
        if (pendingPromise === promise) {
          data.value = _data
          if (options.keys) {
            for (const key of options.keys) {
              store.invalidateEntry(typeof key === 'string' ? key : key({ variables: args, result: _data }), true)
            }
          }
        }
        return _data
    }).catch(_error => {
      if (pendingPromise === promise) {
        error.value = _error
      }
      throw _error
    }).finally(() => {
      if (pendingPromise === promise) {
        isFetching.value = false
      }
    }))

    return promise
  }

  const mutationReturn = {
    data: computed(() => data.value),
    isFetching: computed(() => isFetching.value),
    error: computed(() => error.value),
    mutate,
  } satisfies UseMutationReturn<TResult, TParams, TError>

  return mutationReturn
}
