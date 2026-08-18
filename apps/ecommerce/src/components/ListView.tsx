import {
  ForwardedRef,
  forwardRef,
  PropsWithoutRef,
  ReactElement,
  RefObject,
} from 'react'
import { FlatList, FlatListProps } from 'react-native'

export type ListViewRef<T> = FlatList<T>

export type ListViewProps<T> = PropsWithoutRef<FlatListProps<T>>

/**
 * This is a Higher Order Component wrapper around FlatList for consistency.
 * @param {FlatListProps} props - The props for the `ListView` component.
 * @param {RefObject<ListViewRef>} forwardRef - An optional forwarded ref.
 * @returns {JSX.Element} The rendered `ListView` component.
 */
function ListViewComponent<T>(
  props: ListViewProps<T>,
  ref: ForwardedRef<ListViewRef<T>>,
) {
  return <FlatList {...props} ref={ref} />
}

ListViewComponent.displayName = 'ListView'

export const ListView = forwardRef(ListViewComponent) as <T>(
  props: ListViewProps<T> & {
    ref?: RefObject<ListViewRef<T>>
  },
) => ReactElement
