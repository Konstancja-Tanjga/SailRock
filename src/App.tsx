import {
  AppBar,
  AppShell,
  Button,
  Dialog,
  SegmentedControl,
  Tab,
  TabList,
  TabPanel,
  Tabs,
} from '@bighat/ui'
import { useI18n, type Lang } from './i18n/context'
import { BuhlmannPlanner } from './ui/BuhlmannPlanner'
import { DEFAULT_GAS_FORM } from './ui/gasForm'
import { NitroxCalculator } from './ui/NitroxCalculator'
import { RdpPlanner } from './ui/RdpPlanner'
import { usePersistentState } from './ui/usePersistentState'

export default function App() {
  const { lang, setLang, t } = useI18n()
  const [tab, setTab] = usePersistentState('sailrock.tab', 'rdp')
  const [gas, setGas] = usePersistentState('sailrock.gas', DEFAULT_GAS_FORM)
  const [acknowledged, setAcknowledged] = usePersistentState('sailrock.acknowledged', false)
  return (
    <AppShell
      height="flow"
      header={
        <AppBar
          brand="SailRock"
          title={t.app.title}
          titleAsHeading
          actions={
            <SegmentedControl
              legend={t.app.language}
              size="sm"
              value={lang}
              onChange={(value) => setLang(value as Lang)}
              options={[
                { value: 'pl', label: 'PL' },
                { value: 'en', label: 'EN' },
              ]}
            />
          }
        />
      }
    >
      <div className="sr-page">
        <Tabs value={tab} onChange={setTab}>
          <TabList ariaLabel={t.app.tabsLabel}>
            <Tab id="rdp">{t.app.tabNoDeco}</Tab>
            <Tab id="buhlmann">{t.app.tabDeco}</Tab>
            <Tab id="nitrox">{t.app.tabNitrox}</Tab>
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
        <p className="sr-note">{t.app.footer}</p>
      </div>
      <Dialog
        open={!acknowledged}
        onClose={() => setAcknowledged(true)}
        dismissible={false}
        title={t.app.noticeTitle}
        description={t.app.noticeLead}
        footer={<Button onClick={() => setAcknowledged(true)}>{t.app.noticeOk}</Button>}
      >
        <ul className="sr-list">
          {t.app.noticePoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </Dialog>
    </AppShell>
  )
}
