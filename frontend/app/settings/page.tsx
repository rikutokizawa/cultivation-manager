import { SensorSettingsPanel } from "@/components/sensor-settings-panel";
import { getSensorLabels, getSensorSettings } from "@/lib/api";

export default async function SettingsPage() {
  const [settings, labels] = await Promise.all([getSensorSettings(), getSensorLabels()]);

  return <SensorSettingsPanel initialSettings={settings} initialLabels={labels} />;
}
