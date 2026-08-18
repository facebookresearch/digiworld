// Copyright (c) Meta Platforms, Inc. and affiliates.
import * as React from 'react'
import { Fragment } from 'react'
import {
  FlatListProps,
  FlatList,
  ListRenderItem,
  View,
  StyleProp,
  ViewStyle,
} from 'react-native'
import { chunk } from 'lodash'

export interface HorizontalFlatListProps<ItemT>
  extends Omit<
    FlatListProps<ItemT>,
    'horizontal' | 'numColumns' | 'renderItem' | 'keyExtractor'
  > {
  numRows: number
  renderItem: ({
    item,
    row,
    col,
  }: {
    item: ItemT
    row: number
    col: number
  }) => JSX.Element
  keyExtractor: (item: ItemT, row: number, col: number) => string
  columnStyle?: StyleProp<ViewStyle>
  ListFooterComponent?: React.ComponentType<any> | React.ReactElement | null
}

// prettier-ignore
export const HorizontalFlatList = <ItemT, >(
  props: HorizontalFlatListProps<ItemT>,
): JSX.Element => {
  const { data, numRows, ListFooterComponent, ...restProps } = props

  // Add a special footer item if ListFooterComponent exists
  const dataWithFooter = ListFooterComponent
    ? [...data, { isFooter: true } as ItemT]
    : data

  const renderItems: ListRenderItem<ItemT[]> = ({
    item: items,
    index: col,
  }) => (
    <View key={col} style={props.columnStyle}>
      {items.map((item, row) => (
        <Fragment
          key={
            item && !('isFooter' in item)
              ? props.keyExtractor(item, row, col)
              : `footer-${col}-${row}`
          }
        >
          {item && !('isFooter' in item) ? (
            props.renderItem({ item, row, col })
          ) : row === items.length - 1 && ListFooterComponent ? (
            React.isValidElement(ListFooterComponent) ? (
              ListFooterComponent
            ) : (
              <ListFooterComponent key={`footer-${col}-${row}`} />
            )
          ) : null}
        </Fragment>
      ))}
    </View>
  )

  const convertedProps = {
    ...restProps,
    // @ts-ignore
    data: chunk(dataWithFooter, numRows),
    renderItem: renderItems,
    keyExtractor: undefined,
    horizontal: true,
  } as FlatListProps<ItemT[]>

  return <FlatList {...convertedProps} />
}
