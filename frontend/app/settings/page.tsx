import { SensorSettingsPanel } from "@/components/sensor-settings-panel";
import { getSensorChartSettings, getSensorLabels, getSensorSettings } from "@/lib/api";

export default async function SettingsPage() {
  const [settings, labels, chartSettings] = await Promise.all([
    getSensorSettings(),
    getSensorLabels(),
    getSensorChartSettings(),
  ]);

  return (
    <SensorSettingsPanel
      initialSettings={settings}
      initialLabels={labels}
      initialChartSettings={chartSettings}
    />
  );
}
