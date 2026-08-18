// Copyright (c) Meta Platforms, Inc. and affiliates.
import { useStores } from '@/models/helpers/useStores'

export const useUserProfile = () => {
  const { userStore } = useStores()
  return {
    userProfile: userStore.userProfile,
    isLoading: false,
    error: null,
  }
}
