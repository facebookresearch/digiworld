/**
 * Splits an array into chunks of the given size.
 * If the array can't be split evenly, the last chunk will contain the remaining elements.
 *
 * @param array - The array to split.
 * @param size - The length of each chunk (default: 1).
 * @returns A new array containing chunks of the original array.
 *
 * @example
 * chunk(['a', 'b', 'c', 'd'], 2);
 * // => [['a', 'b'], ['c', 'd']]
 *
 * chunk(['a', 'b', 'c', 'd'], 3);
 * // => [['a', 'b', 'c'], ['d']]
 */
function chunk<T>(array: T[], size: number = 1): T[][] {
  if (!Array.isArray(array)) {
    throw new TypeError('Expected an array')
  }
  if (size < 1) {
    return []
  }

  const result: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size))
  }
  return result
}

// Example usage
console.log(chunk(['a', 'b', 'c', 'd'], 2)) // [['a','b'], ['c','d']]
console.log(chunk([1, 2, 3, 4, 5], 3)) // [[1,2,3], [4,5]]
