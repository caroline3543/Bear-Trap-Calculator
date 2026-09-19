import { useState, useRef } from 'react';
import { useAppState } from './hooks/useAppState.js';
import { importFromFile, exportToFile } from './services/exportImportService.js';
import { C } from './utils/constants.js';
import { vibe } from './utils/vibe.js';

import { Toast } from './components/common/Primitives.jsx';
import { DeleteConfirmModal } from './components/common/DeleteConfirmModal.jsx';

import { RosterTab }    from './components/players/RosterTab.jsx';
import { BattleTab }    from './components/svs/BattleTab.jsx';
import { EventsTab }    from './components/events/EventsTab.jsx';
import { IntelTab }     from './components/stats/IntelTab.jsx';
import { TabErrorBoundary } from './components/common/TabErrorBoundary.jsx';
import { LandingPage }  from './components/LandingPage.jsx';
import { DataPanel }    from './components/DataPanel.jsx';
import { SettingsPanel } from './components/SettingsPanel.jsx';

const TABS = [
  { icon:'👥', label:'Members' },   // 0
  { icon:'⚔️', label:'Battle'  },   // 1
  { icon:'📅', label:'Events'  },   // 2
  { icon:'📊', label:'Intel'   },   // 3
];

const hdrBtn = { height:36, padding:'0 10px', borderRadius:20, background:'#152236', border:'1px solid #2A4A64', color:'#A8C4D8', fontSize:13, fontWeight:600, cursor:'pointer' };

export default function App() {
  const state = useAppState();
  const { data, players, events, svsPlans, settings, toast, showToast, savePlayer, addPlayers, updatePlayers, deletePlayer, createEvent, updateEvent, deleteEvent, saveSvsPlans, deleteSvsPlan, saveSettings, applyImport } = state;

  const [tab, setTab]               = useState(0);
  const [showLanding, setShowLanding] = useState(() => !localStorage.getItem('svs_onboarded'));
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [dataPanel, setDataPanel]   = useState(false);
  const [settingsPanel, setSettingsPanel] = useState(false);
  const importFileRef = useRef();

  function handleGetStarted() {
    localStorage.setItem('svs_onboarded', '1');
    setShowLanding(false);
  }

  if (showLanding) {
    return (
      <>
        <LandingPage hasData={players.length > 0} onGetStarted={handleGetStarted} onContinue={handleGetStarted} onImport={() => importFileRef.current?.click()} />
        <input type="file" accept=".json" ref={importFileRef} style={{ display:'none' }} onChange={async e => { const file=e.target.files?.[0]; if(!file)return; try { const imp=await importFromFile(file); applyImport(imp,'replace'); handleGetStarted(); } catch { showToast('Import failed','error'); } e.target.value=''; }} />
        {toast && <Toast msg={toast.msg} type={toast.type} />}
      </>
    );
  }

  return (
    <div style={{ background:'#0A1628', minHeight:'100vh', color:'#FFFFFF', fontFamily:'system-ui,-apple-system,sans-serif', paddingBottom:80, maxWidth:480, margin:'0 auto' }}>
      <div style={{ padding:'20px 20px 14px', borderBottom:'1px solid #2A4A64', position:'sticky', top:0, background:'#0A1628', zIndex:50 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={{ fontSize:20, fontWeight:700, color:'#FFFFFF' }}>🏰 {settings?.allianceName || 'My Alliance'}</div>
            <div style={{ fontSize:13, color:'#5A7A94' }}>{settings?.allianceTag ? `[${settings.allianceTag}] · ` : ''}{settings?.stateId ? `State ${settings.stateId} · ` : ''}{players.length} players</div>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={()=>setDataPanel(true)} style={hdrBtn}>📦</button>
            <button onClick={()=>setSettingsPanel(true)} style={hdrBtn}>⚙️</button>
          </div>
        </div>
      </div>

      {tab===0 && <TabErrorBoundary><RosterTab players={players} events={events} onSavePlayer={savePlayer} onAddPlayers={addPlayers} onUpdatePlayers={updatePlayers} onDeletePlayer={id=>setDeleteTarget(id)} showToast={showToast} onGoToIntel={()=>setTab(3)} /></TabErrorBoundary>}
      {tab===1 && <TabErrorBoundary><BattleTab plans={svsPlans} players={players} events={events} onSave={saveSvsPlans} onDelete={deleteSvsPlan} showToast={showToast} onGoToMembers={()=>setTab(0)} settings={settings} /></TabErrorBoundary>}
      {tab===2 && <TabErrorBoundary><EventsTab events={events} players={players} onCreateEvent={createEvent} onUpdateEvent={updateEvent} onDeleteEvent={deleteEvent} showToast={showToast} /></TabErrorBoundary>}
      {tab===3 && <TabErrorBoundary><IntelTab players={players} events={events} onUpdatePlayer={savePlayer} showToast={showToast} /></TabErrorBoundary>}

      {deleteTarget && <DeleteConfirmModal message="This player will be permanently removed." onConfirm={()=>{deletePlayer(deleteTarget);setDeleteTarget(null);}} onCancel={()=>setDeleteTarget(null)} />}
      {dataPanel    && <DataPanel data={data} onImport={applyImport} onExport={()=>exportToFile(data,settings?.allianceTag)} onClose={()=>setDataPanel(false)} showToast={showToast} />}
      {settingsPanel && <SettingsPanel settings={settings} onSave={s=>{saveSettings(s);setSettingsPanel(false);vibe(8);}} onClose={()=>setSettingsPanel(false)} />}
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:480, display:'grid', gridTemplateColumns:'repeat(4,1fr)', background:'#0A1628', borderTop:'1px solid #2A4A64', height:60, zIndex:100 }}>
        {TABS.map((t,i) => (
          <button key={i} onClick={()=>{setTab(i);vibe(8);}} style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'none', border:'none', cursor:'pointer', color:tab===i?'#F5A623':'#5A7A94', gap:2, fontSize:9, fontWeight:600, transition:'color 150ms ease', WebkitTapHighlightColor:'transparent' }}>
            <span style={{ fontSize:19 }}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
