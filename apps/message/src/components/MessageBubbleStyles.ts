// Copyright (c) Meta Platforms, Inc. and affiliates.
import { StyleSheet } from 'react-native'
import { type Theme, metrics } from '@andojo/shared-theme'

export const MessageBubbleStyles = (theme: Theme) =>
  StyleSheet.create({
    // Base message container styles
    messageContainer: {
      marginVertical: metrics.tiny,
    },
    ownMessage: {
      alignItems: 'flex-end',
    },
    otherMessage: {
      alignItems: 'flex-start',
    },

    // Message bubble styles
    messageBubble: {
      maxWidth: '85%',
      paddingHorizontal: metrics.medium,
      paddingVertical: metrics.small,
      borderRadius: metrics.borderRadiusLarge,
    },
    ownBubble: {
      backgroundColor: theme.colors.palette.primary500,
      borderBottomRightRadius: metrics.tiny,
    },
    otherBubble: {
      backgroundColor: theme.colors.palette.neutral200,
      borderBottomLeftRadius: metrics.tiny,
    },

    // Media message bubble styles
    mediaMessageBubble: {
      maxWidth: '100%',
      paddingHorizontal: 0,
      paddingVertical: 0,
      borderRadius: metrics.borderRadiusLarge,
      overflow: 'hidden',
      backgroundColor: 'transparent',
      alignSelf: 'flex-start',
    },
    mediaPreviewWrapper: {
      position: 'relative',
      width: '100%',
      aspectRatio: 1,
      borderRadius: metrics.borderRadiusLarge,
      overflow: 'hidden',
      marginBottom: 0,
      backgroundColor: theme.colors.palette.angry400,
      alignSelf: 'flex-start',
    },
    mediaPreviewImage: {
      width: '100%',
      height: '100%',
      backgroundColor: 'transparent',
      borderRadius: metrics.borderRadiusLarge,
    },
    mediaOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: theme.colors.palette.neutral900 + '80',
      borderBottomLeftRadius: metrics.borderRadiusLarge,
      borderBottomRightRadius: metrics.borderRadiusLarge,
      padding: metrics.small,
    },
    mediaInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    mediaFileName: {
      color: theme.colors.palette.neutral100,
      flex: 1,
      marginRight: metrics.tiny,
    },
    mediaFileType: {
      color: theme.colors.palette.neutral300,
      fontSize: 10,
    },
    mediaLoadingContainer: {
      height: 200,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: metrics.borderRadiusLarge,
    },
    loadingText: {
      marginTop: metrics.small,
      color: theme.colors.palette.neutral600,
    },

    // Video overlay styles
    videoPlayOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral900 + '80',
      borderRadius: metrics.borderRadiusLarge,
    },
    playButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.palette.primary500,
      justifyContent: 'center',
      alignItems: 'center',
    },

    // Document message styles
    docMessageBubble: {
      maxWidth: '100%',
      paddingHorizontal: metrics.medium,
      paddingVertical: metrics.small,
      borderRadius: metrics.borderRadiusLarge,
    },
    documentContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    documentInfo: {
      flex: 1,
      marginRight: metrics.small,
    },
    documentFileName: {
      marginBottom: metrics.tiny,
      lineHeight: 16,
    },
    documentMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    documentMetaIcon: {
      marginRight: metrics.tiny,
    },
    documentFileType: {
      lineHeight: 12,
    },
    documentAction: {
      marginLeft: metrics.small,
    },
    documentActionButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    documentActionButtonOwn: {
      backgroundColor: theme.colors.palette.neutral600,
    },
    documentActionButtonOther: {
      backgroundColor: theme.colors.palette.neutral300,
    },

    // Message footer styles
    messageFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      marginTop: metrics.tiny,
      gap: metrics.tiny,
    },
    messageTime: {
      color: theme.colors.palette.neutral400,
    },
    messageStatus: {
      marginLeft: metrics.tiny,
    },

    // Text styles
    messageText: {
      lineHeight: 20,
    },
    ownMessageText: {
      color: theme.colors.palette.neutral100,
    },
    otherMessageText: {
      color: theme.colors.palette.neutral800,
    },

    // Selection styles
    selectedMessage: {
      opacity: 0.5,
    },
    selectedBubble: {
      borderWidth: 2,
      borderColor: theme.colors.palette.primary500,
    },
    selectionModeBubble: {
      paddingLeft: metrics.large,
      marginLeft: metrics.large,
    },
    selectionIndicator: {
      position: 'absolute',
      top: metrics.tiny,
      left: metrics.tiny,
      zIndex: 1,
      marginRight: metrics.small,
      backgroundColor: theme.colors.palette.neutral100,
      borderRadius: 12,
      padding: 2,
    },

    // File header styles
    fileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: metrics.tiny,
    },
    fileIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.palette.neutral200,
      marginRight: metrics.medium,
      marginTop: 2,
      flexShrink: 0,
    },
    fileDetails: {
      minWidth: 0,
      justifyContent: 'center',
    },
    fileName: {
      color: theme.colors.palette.neutral800,
      marginBottom: metrics.tiny,
      flexShrink: 1,
      lineHeight: 16,
    },
    fileType: {
      color: theme.colors.palette.neutral500,
      lineHeight: 12,
    },
    filePreviewWrapper: {
      position: 'relative',
      width: '100%',
      height: 60,
      borderRadius: 8,
      overflow: 'hidden',
      marginBottom: metrics.tiny,
    },
    filePreviewImage: {
      width: '100%',
      height: '100%',
    },
  })

export default MessageBubbleStyles
