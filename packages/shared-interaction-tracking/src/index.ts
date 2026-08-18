// Copyright (c) Meta Platforms, Inc. and affiliates.
// Store latest interaction data globally
const latestInteraction = {
  screenName: '',
  route: '',
  data: null as any,
}

export type InteractionType =
  | 'VIEW_CLICKED'
  | 'VIEW_FOCUSED'
  | 'TEXT_CHANGED'
  | 'SCREEN_MOUNTED'
  | 'SCREEN_UNMOUNTED'
  | 'CONTENT_CHANGED'
  | 'GESTURE_START'
  | 'GESTURE_END'
  | 'CONTENT_CHANGED'
  | 'NOTIFICATION_CHANGED'

interface InteractionData {
  metadata?: {
    interactionType: string
    currentFocusedElement: string
    formData?: Record<string, any>
  }
}

export function getLatestInteraction() {
  return latestInteraction
}

export function useInteractionTracking(screenName: string, route: string) {
  // Update latest interaction screen and route
  latestInteraction.screenName = screenName
  if (latestInteraction.screenName !== screenName) {
    latestInteraction.data = null
  }
  latestInteraction.route = route

  const trackInteraction = (
    type: InteractionType,
    data: Partial<InteractionData>,
  ) => {
    const interactionData = {
      ...data,
      timestamp: Date.now(),
      type,
      screenName,
      route,
    }

    // Update latest interaction data
    latestInteraction.data = interactionData
  }

  return {
    trackTextChange: (elementId: string, value: string) =>
      trackInteraction('TEXT_CHANGED', {
        metadata: {
          interactionType: 'TEXT_CHANGED',
          currentFocusedElement: elementId,
          formData: {
            ...(latestInteraction.data?.metadata?.formData || {}),
            [elementId]: value,
          },
        },
      }),

    trackContentChange: (formData?: Record<string, any>) =>
      trackInteraction('CONTENT_CHANGED', {
        metadata: {
          interactionType: 'CONTENT_CHANGED',
          currentFocusedElement: '',
          formData: {
            ...(latestInteraction.data?.metadata?.formData || {}),
            ...formData,
          },
        },
      }),
    trackClick: (elementId: string) =>
      trackInteraction('VIEW_CLICKED', {
        metadata: {
          interactionType: 'VIEW_CLICKED',
          currentFocusedElement: elementId,
          formData: latestInteraction.data?.metadata?.formData || {},
        },
      }),

    trackScreenMount: (formData?: Record<string, any>) =>
      trackInteraction('SCREEN_MOUNTED', {
        metadata: {
          interactionType: 'SCREEN_MOUNTED',
          currentFocusedElement: '',
          formData: {
            ...(latestInteraction.data?.metadata?.formData || {}),
            ...formData,
          },
        },
      }),
  }
}
