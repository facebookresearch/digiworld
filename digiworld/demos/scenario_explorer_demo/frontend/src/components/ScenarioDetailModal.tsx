import { X, Code, FileText, CheckCircle, XCircle, Info } from 'lucide-react'
import { ScenarioDetails } from '../api'

interface ScenarioDetailModalProps {
  scenario: ScenarioDetails
  onClose: () => void
}

export default function ScenarioDetailModal({
  scenario,
  onClose,
}: ScenarioDetailModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-500 to-secondary-500 p-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <span className="text-6xl">{scenario.app_icon}</span>
              <div>
                <h2 className="text-2xl font-bold mb-1">
                  {scenario.task_name}
                </h2>
                <p className="opacity-90">
                  {scenario.app_display_name} |{' '}
                  {scenario.instance_name || 'No instance'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Overview */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-5 h-5 text-primary-600" />
              <h3 className="text-xl font-bold text-gray-900">Overview</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Difficulty</p>
                <p className="font-bold text-gray-900 capitalize">
                  {scenario.difficulty}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Validation Status</p>
                <div className="flex items-center gap-2">
                  {scenario.validated ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="font-bold text-green-700">
                        Validated
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-red-500" />
                      <span className="font-bold text-red-700">
                        Not Validated
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Bundle ID</p>
                <p className="font-mono text-sm text-gray-900">
                  {scenario.bundle_id}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">
                  Compatible Profiles
                </p>
                <p className="font-semibold text-gray-900">
                  {scenario.compatible_profiles.join(', ')}
                </p>
              </div>
            </div>
          </div>

          {/* Parameters */}
          {Object.keys(scenario.parameters).length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5 text-primary-600" />
                <h3 className="text-xl font-bold text-gray-900">Parameters</h3>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                {Object.entries(scenario.parameters).map(([key, value]) => (
                  <div key={key} className="flex items-start gap-3">
                    <span className="text-gray-600 font-medium min-w-[120px]">
                      {key}:
                    </span>
                    <span className="text-primary-700 font-semibold break-all">
                      {String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Validation Info */}
          {scenario.validated && scenario.validation && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h3 className="text-xl font-bold text-gray-900">
                  Validation Details
                </h3>
              </div>
              <div className="bg-green-50 p-4 rounded-lg space-y-2">
                {scenario.validation.last_validated && (
                  <div>
                    <span className="text-gray-600 font-medium">
                      Last Validated:
                    </span>{' '}
                    <span className="text-gray-900 font-semibold">
                      {new Date(
                        scenario.validation.last_validated,
                      ).toLocaleString()}
                    </span>
                  </div>
                )}
                {scenario.validation.validated_by && (
                  <div>
                    <span className="text-gray-600 font-medium">
                      Validated By:
                    </span>{' '}
                    <span className="text-gray-900 font-semibold">
                      {scenario.validation.validated_by}
                    </span>
                  </div>
                )}
                {scenario.validation.notes && (
                  <div>
                    <span className="text-gray-600 font-medium">Notes:</span>{' '}
                    <p className="text-gray-900 mt-1">
                      {scenario.validation.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Verifier Info */}
          {scenario.verifier_info && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Code className="w-5 h-5 text-primary-600" />
                <h3 className="text-xl font-bold text-gray-900">
                  Verifier Information
                </h3>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Class Name</p>
                  <p className="font-mono text-primary-700 font-semibold">
                    {scenario.verifier_info.class_name}
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">File Path</p>
                  <p className="font-mono text-sm text-gray-700">
                    {scenario.verifier_info.class_file}
                  </p>
                </div>

                {scenario.verifier_info.documentation && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-600 font-semibold mb-2">
                      Documentation
                    </p>
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {scenario.verifier_info.documentation}
                    </p>
                  </div>
                )}

                {scenario.verifier_info.logic && (
                  <div>
                    <p className="text-sm text-gray-600 font-semibold mb-2">
                      Verification Logic
                    </p>
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto max-h-96">
                      <pre className="text-sm font-mono whitespace-pre">
                        {scenario.verifier_info.logic}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-primary-500 to-secondary-500 text-white py-3 px-6 rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
