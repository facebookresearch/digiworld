import RNFS from 'react-native-fs'

/**
 * External storage paths used by the app.
 * These paths align with the Python agent (adb_actions.py) which writes data to:
 * - /mockdata/ for mock data files
 * - /mockdata/assets/ for assets (including tiles)
 * - /sessions/{session_id}/ for session data
 */
export const externalPaths = {
  base: RNFS.ExternalDirectoryPath,
  mockData: `${RNFS.ExternalDirectoryPath}/mockdata`,
  assets: `${RNFS.ExternalDirectoryPath}/mockdata/assets`,
  defaultTiles: `${RNFS.ExternalDirectoryPath}/mockdata/assets/default_tiles`,
  tiles: `${RNFS.ExternalDirectoryPath}/mockdata/assets/tiles`,
  routes: `${RNFS.ExternalDirectoryPath}/mockdata/routes.json`,
} as const

// Helper to log current paths for debugging
export const logExternalPaths = () => {
  console.log('📂 External Storage Paths:', {
    base: externalPaths.base,
    mockData: externalPaths.mockData,
    assets: externalPaths.assets,
    tiles: externalPaths.tiles,
    defaultTiles: externalPaths.defaultTiles,
    routes: externalPaths.routes,
  })
}
