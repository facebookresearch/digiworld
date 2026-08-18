// Copyright (c) Meta Platforms, Inc. and affiliates.
import React from 'react'
import { SvgProps } from 'react-native-svg'

const SvgMock = React.forwardRef<SVGElement, SvgProps>((props, ref) => {
  return React.createElement('svg', { ...props, ref })
})

SvgMock.displayName = 'SvgMock'

export default SvgMock
