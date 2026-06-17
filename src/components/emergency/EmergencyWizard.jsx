// Main emergency simulation wizard — step-based workflow.
// Manages its own step state; receives data and callbacks from App.jsx.

import EmergencyTypeSelector    from './EmergencyTypeSelector.jsx';
import IncidentLocationSelector from './IncidentLocationSelector.jsx';
import ScenarioConfiguration    from './ScenarioConfiguration.jsx';
import OccupancyConfiguration   from './OccupancyConfiguration.jsx';
import ScenarioReview           from './ScenarioReview.jsx';

const STEPS = [
  { id: 1, label: 'Emergency' },
  { id: 2, label: 'Location'  },
  { id: 3, label: 'Configure' },
  { id: 4, label: 'Occupancy' },
  { id: 5, label: 'Review'    },
];

function ProgressBar({ currentStep, onStepClick }) {
  return (
    <div className="wizard-progress">
      {STEPS.map((step, i) => {
        const done = step.id < currentStep;
        const active = step.id === currentStep;
        return (
          <button
            key={step.id}
            className={['wizard-step-btn', done ? 'done' : '', active ? 'active' : ''].filter(Boolean).join(' ')}
            onClick={() => done && onStepClick(step.id)}
            title={done ? `Back to ${step.label}` : undefined}
          >
            <span className="wizard-step-num">{done ? '✓' : step.id}</span>
            <span className="wizard-step-label">{step.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function EmergencyWizard({
  // wizard step (controlled externally so App can reset it)
  wizardStep,
  onWizardStepChange,
  // data
  emergencyType,
  incidentPoint,
  scenarioParams,
  occupancy,
  sensors,
  scaleSettings,
  simulationStatus,
  // callbacks
  onEmergencyTypeChange,
  onStartIncidentPlacement,
  onClearIncidentLocation,
  onManualIncidentCoords,
  onParamsChange,
  onOccupancyChange,
  onRunSimulation,
  interactionMode,
}) {
  const sf = scaleSettings?.scaleFactor ?? 1;
  const step = wizardStep ?? 1;
  const go = (n) => onWizardStepChange(n);

  const canProceed = () => {
    if (step === 1) return !!emergencyType;
    if (step === 2) return !!incidentPoint;
    return true;
  };

  const stepTitle = ['', 'Select emergency type', 'Set incident location',
    'Configure emergency', 'Set occupancy', 'Review & run'][step] ?? '';

  return (
    <div className="emergency-wizard">
      <ProgressBar currentStep={step} onStepClick={go} />

      <div className="wizard-body">
        <h3 className="wizard-step-title">
          <span className="wizard-step-num-inline">{step}</span>
          {stepTitle}
        </h3>

        {step === 1 && (
          <EmergencyTypeSelector
            selected={emergencyType}
            onSelect={(type) => { onEmergencyTypeChange(type); }}
          />
        )}

        {step === 2 && (
          <IncidentLocationSelector
            incidentPoint={incidentPoint}
            interactionMode={interactionMode}
            sensors={sensors}
            scaleFactor={sf}
            onStartPlacement={onStartIncidentPlacement}
            onClearLocation={onClearIncidentLocation}
            onManualCoords={onManualIncidentCoords}
          />
        )}

        {step === 3 && (
          <ScenarioConfiguration
            emergencyType={emergencyType}
            params={scenarioParams}
            onParamsChange={onParamsChange}
          />
        )}

        {step === 4 && (
          <OccupancyConfiguration
            occupancy={occupancy}
            onOccupancyChange={onOccupancyChange}
          />
        )}

        {step === 5 && (
          <ScenarioReview
            emergencyType={emergencyType}
            incidentPoint={incidentPoint}
            params={scenarioParams}
            occupancy={occupancy}
            sensors={sensors}
            scaleFactor={sf}
            simulationStatus={simulationStatus}
            onRun={onRunSimulation}
          />
        )}
      </div>

      <div className="wizard-nav">
        {step > 1 && (
          <button className="btn btn-small" onClick={() => go(step - 1)}>
            Back
          </button>
        )}
        {step < 5 && (
          <button
            className="btn btn-primary btn-small"
            style={{ marginLeft: 'auto' }}
            onClick={() => go(step + 1)}
            disabled={!canProceed()}
          >
            Continue
          </button>
        )}
      </div>

      <p className="hint" style={{ textAlign: 'center', marginTop: 8, fontSize: 11 }}>
        Indicative simulation — not a certified engineering calculation.
      </p>
    </div>
  );
}
