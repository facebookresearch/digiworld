// Copyright (c) Meta Platforms, Inc. and affiliates.
// Simple password handling for sandbox purposes
export const hashPassword = (password: string): string => {
  // For sandbox, we'll just append a simple string to simulate "hashing"
  return `hashed_${password}`
}

export const verifyPassword = (
  password: string,
  hashedPassword: string,
): boolean => {
  // For sandbox, we'll just check if the hashed password matches our simple format
  return hashedPassword === `hashed_${password}`
}
