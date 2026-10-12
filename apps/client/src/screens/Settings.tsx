import { useTheme } from '../theme/ThemeProvider.tsx';
import { langName } from '../i18n/langName.ts';
import { local } from '../storage.ts';
import { useState } from 'react';
import { applyMotion } from '../motion.ts';

export function Settings({ onLang, onBack }: { onLang: (l: string) => void; onBack: () => void }) {
  const { t, manifest, lang } = useTheme();
  const [sound, setSound] = useState(local.get('sound') !== 'off');
  const [haptics, setHaptics] = useState(local.get('haptics') !== 'off');
  const [music, setMusic] = useState(local.get('music') !== 'off');
  const [alerts, setAlerts] = useState(local.get('alerts') !== 'off');
  const [fast, setFast] = useState(local.get('motion') === 'fast');
  const toggle = (key: string, v: boolean, set: (b: boolean) => void) => { set(v); local.set(key, v ? 'on' : 'off'); };
  return (
    <main className="screen settings">
      <h1>{t('settings.title')}</h1>
      <label className="toggle"><input type="checkbox" checked={sound} onChange={(e) => toggle('sound', e.target.checked, setSound)} />{t('settings.sound')}</label>
      <label className="toggle"><input type="checkbox" checked={haptics} onChange={(e) => toggle('haptics', e.target.checked, setHaptics)} />{t('settings.haptics')}</label>
      <label className="toggle"><input type="checkbox" checked={music} onChange={(e) => toggle('music', e.target.checked, setMusic)} />{t('settings.music')}</label>
      <label className="toggle"><input type="checkbox" checked={alerts} onChange={(e) => toggle('alerts', e.target.checked, setAlerts)} />{t('settings.alerts')}</label>
      <label className="toggle"><input type="checkbox" checked={fast} onChange={(e) => { setFast(e.target.checked); local.set('motion', e.target.checked ? 'fast' : 'normal'); applyMotion(); }} />{t('settings.fastMotion')}</label>
      <fieldset className="field">
        <legend>{t('settings.language')}</legend>
        <div className="segmented">
          {manifest.meta.languages.map((l) => (
            <button key={l} aria-pressed={l === lang} onClick={() => onLang(l)} lang={l}>{langName(l)}</button>
          ))}
        </div>
      </fieldset>
      <button className="btn" onClick={onBack}>{t('back')}</button>
    </main>
  );
}
