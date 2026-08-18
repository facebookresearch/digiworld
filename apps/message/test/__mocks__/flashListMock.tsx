// Copyright (c) Meta Platforms, Inc. and affiliates.
import React from 'react'
import { View } from 'react-native'

export const FlashList = ({
  data,
  renderItem,
}: {
  data: any[]
  renderItem: (info: { item: any; index: number }) => React.ReactElement
}) => (
  <View testID="flash-list">
    {data.map((item: any, index: number) => (
      <View key={index} testID={`flash-list-item-${index}`}>
        {renderItem({ item, index })}
      </View>
    ))}
  </View>
)
