import { Box } from 'lucide-react'

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary-900 p-2.5 rounded-lg">
            <Box className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              DigiWorld Framework
            </h1>
            <p className="text-xs text-gray-500">Scenario Explorer</p>
          </div>
        </div>
      </div>
    </header>
  )
}
