// Copyright (c) Meta Platforms, Inc. and affiliates.
export function formatNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return `${Math.floor(num / 1_000_000_000)}B`
  }
  if (num >= 1_000_000) {
    const millions = num / 1_000_000
    return millions >= 10
      ? `${Math.floor(millions)}M`
      : `${millions.toFixed(1).replace(/\.0$/, '')}M`
  }
  if (num >= 1_000) {
    const thousands = num / 1_000
    return thousands >= 10
      ? `${Math.floor(thousands)}K`
      : `${thousands.toFixed(1).replace(/\.0$/, '')}K`
  }
  return num.toString()
}
