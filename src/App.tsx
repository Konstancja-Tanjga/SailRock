import { AppBar, AppShell, Card, Tab, TabList, TabPanel, Tabs } from '@bighat/ui'
import { BuhlmannPlanner } from './ui/BuhlmannPlanner'
import { NitroxCalculator } from './ui/NitroxCalculator'
import { RdpPlanner } from './ui/RdpPlanner'
import { usePersistentState } from './ui/usePersistentState'

export default function App() {
  const [tab, setTab] = usePersistentState('sailrock.tab', 'rdp')
  return (
    <AppShell height="flow" header={<AppBar brand="SailRock" title="Planer nurkowań" titleAsHeading />}>
      <div className="sr-page">
        <Card accent="warning" padding="snug" ariaLabel="Zastrzeżenie">
          <p className="sr-text">
            Tabele zostały przepisane ze skanów. Zanim zaplanujesz z nich nurkowanie, porównaj
            wynik z papierową tabelą. Aplikacja nie zastępuje szkolenia ani komputera nurkowego.
          </p>
        </Card>
        <Tabs value={tab} onChange={setTab}>
          <TabList ariaLabel="Rodzaj planowania">
            <Tab id="rdp">RDP</Tab>
            <Tab id="buhlmann">Bühlmann/Hahn</Tab>
            <Tab id="nitrox">Nitrox</Tab>
          </TabList>
          <TabPanel id="rdp">
            <RdpPlanner />
          </TabPanel>
          <TabPanel id="buhlmann">
            <BuhlmannPlanner />
          </TabPanel>
          <TabPanel id="nitrox">
            <NitroxCalculator />
          </TabPanel>
        </Tabs>
      </div>
    </AppShell>
  )
}
