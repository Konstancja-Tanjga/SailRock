import { AppBar, AppShell, Button, Dialog, Tab, TabList, TabPanel, Tabs } from '@bighat/ui'
import { BuhlmannPlanner } from './ui/BuhlmannPlanner'
import { DEFAULT_GAS_FORM } from './ui/gasForm'
import { NitroxCalculator } from './ui/NitroxCalculator'
import { RdpPlanner } from './ui/RdpPlanner'
import { usePersistentState } from './ui/usePersistentState'

export default function App() {
  const [tab, setTab] = usePersistentState('sailrock.tab', 'rdp')
  const [gas, setGas] = usePersistentState('sailrock.gas', DEFAULT_GAS_FORM)
  const [acknowledged, setAcknowledged] = usePersistentState('sailrock.acknowledged', false)
  return (
    <AppShell height="flow" header={<AppBar brand="SailRock" title="Planer nurkowań" titleAsHeading />}>
      <div className="sr-page">
        <Tabs value={tab} onChange={setTab}>
          <TabList ariaLabel="Rodzaj planowania">
            <Tab id="rdp">Bez deko</Tab>
            <Tab id="buhlmann">Z deko</Tab>
            <Tab id="nitrox">Nitrox</Tab>
          </TabList>
          <TabPanel id="rdp">
            <RdpPlanner gasForm={gas} onGasChange={setGas} />
          </TabPanel>
          <TabPanel id="buhlmann">
            <BuhlmannPlanner gas={gas} onGasChange={setGas} />
          </TabPanel>
          <TabPanel id="nitrox">
            <NitroxCalculator />
          </TabPanel>
        </Tabs>
        <p className="sr-note">
          Tabele przepisane ze skanów: przed nurkowaniem porównaj wynik z papierową tabelą.
          Aplikacja nie zastępuje szkolenia ani komputera nurkowego.
        </p>
      </div>
      <Dialog
        open={!acknowledged}
        onClose={() => setAcknowledged(true)}
        dismissible={false}
        title="Zanim zaczniesz"
        description="SailRock pomaga planować nurkowania według tabel RDP i Bühlmanna/Hahna."
        footer={<Button onClick={() => setAcknowledged(true)}>Rozumiem</Button>}
      >
        <ul className="sr-list">
          <li>Tabele zostały przepisane ze skanów. Każdy plan porównaj z papierową tabelą.</li>
          <li>Aplikacja nie zastępuje szkolenia, komputera nurkowego ani planowania z partnerem.</li>
          <li>Planuj w granicach swoich uprawnień.</li>
        </ul>
      </Dialog>
    </AppShell>
  )
}
