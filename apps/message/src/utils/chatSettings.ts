// Copyright (c) Meta Platforms, Inc. and affiliates.
export const getFontSizeForText = (
  fontSize: string,
): 'small' | 'medium' | 'large' => {
  switch (fontSize) {
    case 'small':
      return 'small'
    case 'large':
      return 'large'
    case 'medium':
    default:
      return 'medium'
  }
}
