// Copyright (c) Meta Platforms, Inc. and affiliates.
import { router, Unmatched, useRootNavigationState } from 'expo-router'
import { useEffect } from 'react'

export default function UnmatchedScreen() {
  const rootNavState = useRootNavigationState()

  console.log('UnmatchedScreen')

  useEffect(() => {
    if (!rootNavState?.key) return // Root not mounted yet
    router.replace('/')
  }, [rootNavState?.key])

  return <Unmatched />
}
